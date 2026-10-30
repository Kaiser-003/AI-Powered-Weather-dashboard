
import { NextRequest, NextResponse } from "next/server";

type SearchLocation = {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");

    
    if (!city) {
      return NextResponse.json(
        { message: "City name is required" },
        { status: 400 }
      );
    }

    
    const url = new URL(
      "https://nominatim.openstreetmap.org/search"
    );

    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", city.trim());
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "10");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "WeatherDashboard/1.0",
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: "Location search failed" },
        { status: 502 }
      );
    }

    const data: SearchLocation[] = await response.json();

    const results = data.map((location) => {
      const address = location.address;

      return {
        placeId: location.place_id,
        name:
          address?.city ??
          address?.town ??
          address?.village ??
          location.name ??
          location.display_name,
        state: address?.state ?? "",
        country: address?.country ?? "",
        latitude: Number(location.lat),
        longitude: Number(location.lon),
        displayName: location.display_name,
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Nominatim city search error:", error);

    return NextResponse.json(
      { message: "Something went wrong while searching for the city" },
      { status: 500 }
    );
  }
}



// export async function GET(request: Request) {
// return Response.json({
//     message: "This is the city search API endpoint.",
//   });

// }