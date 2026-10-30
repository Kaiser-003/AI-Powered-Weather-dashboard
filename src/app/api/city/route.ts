// import {NextRequest, NextResponse} from 'next/server';
// // @ts-expect-error jsonwebtoken declarations are not available in this project.
// import jwt from "jsonwebtoken";
// import {pool} from "@/lib/db";

// export async function GET(request: NextRequest) {
// try{

//     const authHeader = request.headers.get("Authorization");
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//         return NextResponse.json({
//             message: "Authorization header missing or invalid",
//             status: 401
//         });
//     }

//     const token = authHeader.split(" ")[1];

//     const decode = jwt.verify(
//         token,
//         process.env.JWT_SECRET || "your-secret-key") as { userId: number };

//     const gotData = await pool.query(
//         `SELECT
//   id,
//   city,
//   state,
//   country,
//   latitude,
//   longitude,
//   created_at
// FROM cities
// WHERE user_id = $1
// ORDER BY created_at DESC;`,
// [decode.userId]
//     )

//     return NextResponse.json({
//         message: "Cities retrieved successfully",
//         data: gotData.rows,
//     });
// } catch (error) {
//         console.error("Error retrieving cities:", error);
//         return NextResponse.json({
//             message: "Error retrieving cities",
//             status: 500
//         }); 
//     }

// }



import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import jwt from "jsonwebtoken";
import type { PoolClient } from "pg";

type JwtData = {
  id?: number;
  userId?: number;
};

type AuthResult =
  | { userId: number }
  | { response: NextResponse };

function authenticate(request: NextRequest): AuthResult {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      response: NextResponse.json(
        { message: "Authorization header missing or invalid" },
        { status: 401 }
      ),
    };
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return {
      response: NextResponse.json(
        { message: "Server authentication is not configured" },
        { status: 500 }
      ),
    };
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, secret) as JwtData;

    const userId = decoded.userId ?? decoded.id;

    if (typeof userId !== "number" || !Number.isInteger(userId)) {
      return {
        response: NextResponse.json(
          { message: "Invalid token payload" },
          { status: 401 }
        ),
      };
    }

    return { userId };
  } catch {
    return {
      response: NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 401 }
      ),
    };
  }
}


export async function GET(request: NextRequest) {
  const auth = authenticate(request);

  if ("response" in auth) return auth.response;

  try {
    const result = await pool.query(
      `SELECT
         id, city, state, country,
         latitude, longitude, created_at, is_primary
       FROM cities
       WHERE user_id = $1
       ORDER BY is_primary DESC, created_at DESC`,
      [auth.userId]
    );

    return NextResponse.json({
      message: "Cities retrieved successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error retrieving cities:", error);

    return NextResponse.json(
      { message: "Error retrieving cities" },
      { status: 500 }
    );
  }
}


// export async function POST(request: NextRequest) {
//   const auth = authenticate(request);

//   if ("response" in auth) return auth.response;

//   let body: unknown;

//   try {
//     body = await request.json();
//   } catch {
//     return NextResponse.json(
//       { message: "Invalid JSON request body" },
//       { status: 400 }
//     );
//   }

//   if (!body || typeof body !== "object" || Array.isArray(body)) {
//     return NextResponse.json(
//       { message: "Request body must be a JSON object" },
//       { status: 400 }
//     );
//   }

//   const payload = body as Record<string, unknown>;

//   const city =
//     typeof payload.city === "string" ? payload.city.trim() : "";
//   const state =
//     typeof payload.state === "string" ? payload.state.trim() : "";
//   const country =
//     typeof payload.country === "string" ? payload.country.trim() : "";

//   const latitude = payload.latitude;
//   const longitude = payload.longitude;

//   if (
//     !city ||
//     !country ||
//     typeof latitude !== "number" ||
//     !Number.isFinite(latitude) ||
//     latitude < -90 ||
//     latitude > 90 ||
//     typeof longitude !== "number" ||
//     !Number.isFinite(longitude) ||
//     longitude < -180 ||
//     longitude > 180
//   ) {
//     return NextResponse.json(
//       {
//         message:
//           "Valid city, country, latitude and longitude are required",
//       },
//       { status: 400 }
//     );
//   }

//   try {
//     // Check whether this user has already saved this location.
//     const existing = await pool.query(
//       `SELECT id, city, state, country, latitude,
//               longitude, created_at, is_primary
//        FROM cities
//        WHERE user_id = $1
//          AND LOWER(city) = LOWER($2)
//          AND latitude = $3
//          AND longitude = $4
//        LIMIT 1`,
//       [auth.userId, city, latitude, longitude]
//     );

//     if (existing.rows.length > 0) {
//       return NextResponse.json(
//         {
//           message: "This city is already saved",
//           city: existing.rows[0],
//         },
//         { status: 409 }
//       );
//     }

//     // The first saved city becomes the primary city.
//     const result = await pool.query(
//       `INSERT INTO cities (
//          user_id, city, state, country,
//          latitude, longitude, is_primary
//        )
//        VALUES (
//          $1, $2, $3, $4, $5, $6,
//          NOT EXISTS (
//            SELECT 1 FROM cities
//            WHERE user_id = $1 AND is_primary = TRUE
//          )
//        )
//        RETURNING id, city, state, country,
//                  latitude, longitude, created_at, is_primary`,
//       [auth.userId, city, state, country, latitude, longitude]
//     );

//     return NextResponse.json(
//       {
//         message: "City saved successfully",
//         city: result.rows[0],
//       },
//       { status: 201 }
//     );
//   } catch (error) {
//     console.error("Error saving city:", error);

//     return NextResponse.json(
//       { message: "Error saving city" },
//       { status: 500 }
//     );
//   }
// }



export async function POST(request: NextRequest) {
  const auth = authenticate(request);

  if ("response" in auth) return auth.response;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const payload = body as Record<string, unknown>;

  const city =
    typeof payload.city === "string" ? payload.city.trim() : "";
  const state =
    typeof payload.state === "string" ? payload.state.trim() : "";
  const country =
    typeof payload.country === "string" ? payload.country.trim() : "";

  const latitude = payload.latitude;
  const longitude = payload.longitude;

  // Validate the location data.
  if (
    !city ||
    !country ||
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json(
      {
        message:
          "Valid city, country, latitude and longitude are required",
      },
      { status: 400 }
    );
  }

  try {
    // Check whether this user has already saved this location.
    const existing = await pool.query(
      `SELECT id, city, state, country, latitude,
              longitude, created_at, is_primary
       FROM cities
       WHERE user_id = $1
         AND LOWER(city) = LOWER($2)
         AND latitude = $3
         AND longitude = $4
       LIMIT 1`,
      [auth.userId, city, latitude, longitude]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        {
          message: "This city is already saved",
          city: existing.rows[0],
        },
        { status: 409 }
      );
    }

    // Make the first saved city the user's primary city.
    const result = await pool.query(
      `INSERT INTO cities (
         user_id, city, state, country,
         latitude, longitude, is_primary
       )
       VALUES (
         $1, $2, $3, $4, $5, $6,
         NOT EXISTS (
           SELECT 1
           FROM cities
           WHERE user_id = $1 AND is_primary = TRUE
         )
       )
       RETURNING
         id, city, state, country,
         latitude, longitude, created_at, is_primary`,
      [auth.userId, city, state, country, latitude, longitude]
    );

    return NextResponse.json(
      {
        message: "City saved successfully",
        city: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving city:", error);

    return NextResponse.json(
      { message: "Error saving city" },
      { status: 500 }
    );
  }
}




// DELETE: Remove a saved city belonging to the logged-in user.
export async function DELETE(request: NextRequest) {
  const auth = authenticate(request);

  if ("response" in auth) return auth.response;

  const cityId = Number(request.nextUrl.searchParams.get("id"));

  if (!Number.isInteger(cityId) || cityId <= 0) {
    return NextResponse.json(
      { message: "A valid city ID is required" },
      { status: 400 }
    );
  }

  try {
    const result = await pool.query(
      `DELETE FROM cities
       WHERE id = $1 AND user_id = $2
       RETURNING id, city`,
      [cityId, auth.userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { message: "Saved city not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "City removed successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error removing city:", error);

    return NextResponse.json(
      { message: "Error removing city" },
      { status: 500 }
    );
  }
}

// export async function PATCH(request: NextRequest) {
//   const auth = authenticate(request);

//   if ("response" in auth) return auth.response;

//   let body: { cityId?: unknown };

//   try {
//     body = await request.json();
//   } catch {
//     return NextResponse.json(
//       { message: "Invalid JSON request body" },
//       { status: 400 }
//     );
//   }

//   const cityId = Number(body.cityId);

//   if (!Number.isInteger(cityId) || cityId <= 0) {
//     return NextResponse.json(
//       { message: "A valid cityId is required" },
//       { status: 400 }
//     );
//   }

//   let client: Awaited<ReturnType<typeof pool.connect>> | undefined;

//   try {
//     client = await pool.connect();
//     await client.query("BEGIN");

//     const target = await client.query(
//       `SELECT id FROM cities
//        WHERE id = $1 AND user_id = $2
//        FOR UPDATE`,
//       [cityId, auth.userId]
//     );

//     if (target.rowCount === 0) {
//       await client.query("ROLLBACK");

//       return NextResponse.json(
//         { message: "Saved city not found" },
//         { status: 404 }
//       );
//     }

//     await client.query(
//       `UPDATE cities
//        SET is_primary = FALSE
//        WHERE user_id = $1 AND id <> $2`,
//       [auth.userId, cityId]
//     );

//     const updated = await client.query(
//       `UPDATE cities
//        SET is_primary = TRUE
//        WHERE id = $1 AND user_id = $2
//        RETURNING id, city, state, country,
//                  latitude, longitude, created_at, is_primary`,
//       [cityId, auth.userId]
//     );

//     await client.query("COMMIT");

//     return NextResponse.json({
//       message: "Primary city updated successfully",
//       city: updated.rows[0],
//     });
//   } catch (error) {
//     if (client) {
//       await client.query("ROLLBACK").catch(() => {});
//     }

//     console.error("Error updating primary city:", error);

//     return NextResponse.json(
//       { message: "Error updating primary city" },
//       { status: 500 }
//     );
//   } finally {
//     client?.release();
//   }
// }


export async function PATCH(request: NextRequest) {

  const auth = authenticate(request);

  if ("response" in auth) {
    return auth.response;
  }

  // 2. Read the requested city ID
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const cityIdValue = (body as Record<string, unknown>).cityId;

  if (
    typeof cityIdValue !== "number" ||
    !Number.isInteger(cityIdValue) ||
    cityIdValue <= 0
  ) {
    return NextResponse.json(
      { message: "A valid cityId is required" },
      { status: 400 }
    );
  }

  const cityId = cityIdValue;

  let client: PoolClient | undefined;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    
    await client.query(
      `SELECT id FROM users WHERE id = $1 FOR UPDATE`,
      [auth.userId]
    );

    
    const cityResult = await client.query(
      `SELECT id
       FROM cities
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [cityId, auth.userId]
    );

    if (cityResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { message: "Saved city not found" },
        { status: 404 }
      );
    }

    
    await client.query(
      `UPDATE cities
       SET is_primary = FALSE
       WHERE user_id = $1 AND is_primary = TRUE`,
      [auth.userId]
    );

    
    const updatedCity = await client.query(
      `UPDATE cities
       SET is_primary = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING
         id, city, state, country,
         latitude, longitude, created_at, is_primary`,
      [cityId, auth.userId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      message: "Primary city updated successfully",
      city: updatedCity.rows[0],
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Error updating primary city:", error);

    return NextResponse.json(
      { message: "Error updating primary city" },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}

