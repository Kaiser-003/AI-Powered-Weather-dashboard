
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, current_user AS user"
    );

    return NextResponse.json({
      success: true,
      message: "PostgreSQL connected successfully!",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return NextResponse.json(
      { success: false, message: "Database connection failed" },
      { status: 500 }
    );
  }
}
