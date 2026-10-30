// const apiKey = process.env.GEMINI_API_KEY;
// const model = process.env.GEMINI_MODEL || "gemma-4-26b-a4b-it";

// if (!apiKey) {
//   console.error("❌ GEMINI_API_KEY is missing.");
//   process.exit(1);
// }

// try {
//   console.log(`Testing model: ${model}`);

//   const response = await fetch(
//     `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
//     {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "x-goog-api-key": apiKey,
//       },
//       body: JSON.stringify({
//         contents: [
//           {
//             parts: [
//               {
//                 text: "Write one short, funny Hinglish joke about rainy weather.",
//               },
//             ],
//           },
//         ],
//         generationConfig: {
//           temperature: 0.9,
//           maxOutputTokens: 100,
//         },
//       }),
//     }
//   );

//   const data = await response.json();

//   if (!response.ok) {
//     console.error("❌ API request failed:", response.status);
//     console.error(JSON.stringify(data, null, 2));
//     process.exit(1);
//   }

//   const message = data.candidates?.[0]?.content?.parts
//     ?.map((part) => part.text || "")
//     .join("");

//   if (!message) {
//     console.error("❌ API returned no text.");
//     console.error(JSON.stringify(data, null, 2));
//     process.exit(1);
//   }

//   console.log("\n✅ Gemma is working!");
//   console.log("\nGenerated response:\n", message);
// } catch (error) {
//   console.error("❌ Request failed:", error.message);
//   process.exit(1);
// }


const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemma-4-26b-a4b-it";

if (!apiKey) {
  console.error("GEMINI_API_KEY is missing.");
  process.exit(1);
}

const prompt = `
Write a funny, original Hinglish weather roast.

Weather:
City: Pathankot, Punjab
Temperature: 38°C
Conditions: Clear sky
Humidity: 45%
Wind speed: 3.5 m/s

Write exactly 3 short, funny sentences in natural Hinglish.
Use playful sarcasm and relatable Indian humour.
Make jokes about the hot weather.
Do not repeat these instructions.
Return only the roast, with no heading or explanation.
`;

try {
  console.log(`Testing model: ${model}`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
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
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("API request failed:", response.status);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log("\nFinish reason:", data.candidates?.[0]?.finishReason);

  const parts = data.candidates?.[0]?.content?.parts ?? [];

  const commentary = parts
    .filter((part) => part.thought !== true)
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!commentary) {
    console.error("No visible commentary was returned.");
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log("\nGenerated commentary:\n");
  console.log(commentary);
} catch (error) {
  console.error("Request failed:", error.message);
  process.exit(1);
}
