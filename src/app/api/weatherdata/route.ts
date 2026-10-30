
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authenticate } from "@/lib/authenticate";

function getWeatherDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";

  if ([45, 48].includes(code)) return "Fog";

  if ([51, 53, 55, 56, 57].includes(code)) {
    return "Drizzle";
  }

  if ([61, 63, 65, 66, 67].includes(code)) {
    return "Rain";
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "Snow";
  }

  if ([80, 81, 82].includes(code)) {
    return "Rain showers";
  }

  if ([95, 96, 99].includes(code)) {
    return "Thunderstorm";
  }

  return "Unknown conditions";
}

function getWeatherIcon(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if ([1, 2].includes(code)) return isDay ? "🌤️" : "☁️";
  if ([3, 45, 48].includes(code)) return "☁️";

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "🌧️";
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";

  return "🌡️";
}

export async function GET(request: NextRequest) {
  const auth = authenticate(request);

  if ("response" in auth) {
    return auth.response;
  }

  const cityIdParam = request.nextUrl.searchParams.get("cityId");
  const cityId = Number(cityIdParam);

  if (
    !cityIdParam ||
    !Number.isInteger(cityId) ||
    cityId <= 0
  ) {
    return NextResponse.json(
      { message: "A valid cityId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    
    const cityResult = await pool.query(
      `SELECT id, city, state, country, latitude, longitude
       FROM cities
       WHERE id = $1 AND user_id = $2`,
      [cityId, auth.userId]
    );

    if (cityResult.rows.length === 0) {
      return NextResponse.json(
        { message: "Saved city not found" },
        { status: 404 }
      );
    }

    const city = cityResult.rows[0];
    const latitude = Number(city.latitude);
    const longitude = Number(city.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { message: "Saved city has invalid coordinates" },
        { status: 422 }
      );
    }

    // Request the current conditions from Open-Meteo.
    const weatherUrl = new URL(
      "https://api.open-meteo.com/v1/forecast"
    );

    weatherUrl.search = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "is_day",
        "weather_code",
        "wind_speed_10m",
        "surface_pressure",
      ].join(","),
      temperature_unit: "celsius",
      wind_speed_unit: "ms",
      timezone: "auto",
    }).toString();

    let weatherResponse: Response;

    try {
      weatherResponse = await fetch(weatherUrl.toString(), {
        cache: "no-store",
      });
    } catch (error) {
      console.error("Weather provider connection error:", error);

      return NextResponse.json(
        { message: "Could not connect to the weather provider" },
        { status: 502 }
      );
    }

    if (!weatherResponse.ok) {
      console.error(
        "Weather provider returned status:",
        weatherResponse.status
      );

      return NextResponse.json(
        { message: "Weather provider request failed" },
        { status: 502 }
      );
    }

    const weatherData = await weatherResponse.json();
    const current = weatherData.current;

    if (
      !current ||
      typeof current.temperature_2m !== "number" ||
      typeof current.weather_code !== "number"
    ) {
      return NextResponse.json(
        { message: "Invalid weather response from provider" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: "Weather retrieved successfully",
      data: {
        cityId: city.id,
        city: city.city,
        state: city.state,
        country: city.country,
        temperature: current.temperature_2m,
        description: getWeatherDescription(current.weather_code),
        icon: getWeatherIcon(
          current.weather_code,
          current.is_day === 1
        ),
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        pressure: current.surface_pressure,
        updatedAt: current.time,
      },
      source: "Open-Meteo",
    });
  } catch (error) {
    console.error("Error retrieving weather:", error);

    return NextResponse.json(
      { message: "Error retrieving weather data" },
      { status: 500 }
    );
  }
}
