
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { pool } from "@/lib/db";

type WeatherInput = {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  pressure: number;
};

type JwtPayload = {
  id?: number | string;
  userId?: number | string;
};

type GeminiPart = {
  text?: string;
  thought?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user.
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured.");

      return NextResponse.json(
        { message: "Server authentication is not configured." },
        { status: 500 }
      );
    }

    let decoded: JwtPayload;

    try {
      decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    } catch {
      return NextResponse.json(
        { message: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const userId = decoded.userId ?? decoded.id;

    if (typeof userId !== "number" || !Number.isInteger(userId)) {
      return NextResponse.json(
        { message: "Invalid token payload." },
        { status: 401 }
      );
    }

    // 2. Read and validate the request.
    const body = await request.json();
    const cityId = Number(body.cityId);
    const weather = body.weather as WeatherInput | undefined;

    if (!Number.isSafeInteger(cityId) || cityId <= 0) {
      return NextResponse.json(
        { message: "A valid cityId is required." },
        { status: 400 }
      );
    }

    if (
      !weather ||
      typeof weather.temperature !== "number" ||
      typeof weather.description !== "string" ||
      typeof weather.humidity !== "number" ||
      typeof weather.windSpeed !== "number" ||
      typeof weather.pressure !== "number" ||
      ![
        weather.temperature,
        weather.humidity,
        weather.windSpeed,
        weather.pressure,
      ].every(Number.isFinite)
    ) {
      return NextResponse.json(
        { message: "Valid weather data is required." },
        { status: 400 }
      );
    }

    // 3. Verify that this city belongs to the authenticated user.
    const cityResult = await pool.query(
      `SELECT city, state, country
       FROM cities
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [cityId, userId]
    );

    if (cityResult.rows.length === 0) {
      return NextResponse.json(
        { message: "City not found or access denied." },
        { status: 404 }
      );
    }

    const city = cityResult.rows[0];

    // 4. Read Gemini configuration.
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL;

    if (!apiKey || !model) {
      console.error("Gemini environment configuration is missing.");

      return NextResponse.json(
        { message: "AI commentary is not configured." },
        { status: 500 }
      );
    }

    // 5. Ask Gemma for original, funny Hinglish commentary.
    const prompt = `
TASK: Write a funny weather roast in natural Indian Hinglish.

LOCATION: ${city.city}, ${city.state}, ${city.country}
TEMPERATURE: ${weather.temperature} degrees Celsius
CONDITIONS: ${weather.description}
HUMIDITY: ${weather.humidity} percent
WIND SPEED: ${weather.windSpeed} metres per second
PRESSURE: ${weather.pressure} hPa

Instructions:
- Write exactly 3 short sentences.
- Use conversational Hinglish, witty sarcasm, and relatable Indian humour.
- Make the jokes relevant to the supplied weather conditions.
- Be playful, clever, and original.
- Do not copy the example or these instructions.
- Do not list the weather measurements.
- Do not include a heading, labels, or explanation.
- Output only the finished roast.

Example of the style, not text to copy:
"Bhai, itni garmi hai ki AC bhi overtime ki salary maang raha hai!"

Now write a NEW roast for the supplied weather.
`;

    // 6. Call the Gemini API.
    const apiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          
            generationConfig: {
  temperature: 1,
  maxOutputTokens: 300,
  thinkingConfig: {
    thinkingLevel: "minimal",
  },
},
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!apiResponse.ok) {
      const providerError = await apiResponse.text();

      console.error(
        "Gemini API error:",
        apiResponse.status,
        providerError.slice(0, 1000)
      );

      return NextResponse.json(
        {
          message: "The AI couldn't generate commentary right now.",
          errorCode:
            apiResponse.status === 429
              ? "RATE_LIMIT"
              : "AI_PROVIDER_ERROR",
        },
        {
          status: apiResponse.status === 429 ? 429 : 502,
        }
      );
    }

    // 7. Extract visible text, excluding parts marked as thoughts.
    const result = await apiResponse.json();

    const candidate = result.candidates?.[0];
    const parts: GeminiPart[] = candidate?.content?.parts ?? [];

    const commentary = parts
      .filter(
        (part) =>
          part.thought !== true && typeof part.text === "string"
      )
      .map((part) => part.text!.trim())
      .filter(Boolean)
      .join("\n")
      .trim();

    // Don't accidentally show a truncated prompt or empty response.
    if (!commentary || candidate?.finishReason === "MAX_TOKENS") {
      console.error("Gemma did not produce a complete commentary.", {
        finishReason: candidate?.finishReason,
        parts: parts.map((part) => ({
          thought: part.thought === true,
          hasText: typeof part.text === "string",
        })),
      });

      return NextResponse.json(
        {
          message:
            "Gemma did not produce a complete commentary. Please try again.",
        },
        { status: 502 }
      );
    }

    // 8. Return the commentary. Nothing is saved to PostgreSQL.
    return NextResponse.json({
      message: "Weather commentary generated successfully.",
      data: {
        cityId,
        city: city.city,
        commentary,
      },
    });
  } catch (error) {
    console.error(
      "Weather commentary route failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    const timedOut =
      error instanceof Error && error.name === "TimeoutError";

    return NextResponse.json(
      {
        message: timedOut
          ? "The AI request timed out. Please try again."
          : "Unable to generate weather commentary.",
      },
      { status: timedOut ? 504 : 500 }
    );
  }
}
