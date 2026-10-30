
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  if (lat === null || lon === null) {
    return Response.json(
      { error: "Latitude and longitude are required." },
      { status: 400 }
    );
  }
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return Response.json(
      { error: "Invalid latitude or longitude." },
      { status: 400 }
    );
  }

  try {
    const url = new URL(
      "https://nominatim.openstreetmap.org/reverse"
    );

    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "WeatherDashboard/1.0",
      },
      
    });

    if (!response.ok) {
      return Response.json(
        { error: "Location service request failed." },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!data.address) {
      return Response.json(
        { error: "No address found for these coordinates." },
        { status: 404 }
      );
    }
    const address = data.address;

    const city =
      address.city ??
      address.town ??
      address.village ??
      address.state ??
      address.county ??
      null;

    

    return Response.json({
      city,
      displayName: data.display_name || " ",
      address,
      latitude,
      longitude,
    });
  } catch {
    return Response.json(
      { error: "Unable to retrieve location." },
      { status: 500 }
    );
  }
}
