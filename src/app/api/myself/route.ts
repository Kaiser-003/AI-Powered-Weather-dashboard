import {NextResponse , NextRequest} from "next/server";
import {pool} from "@/lib/db";
// @ts-expect-error jsonwebtoken declarations are not available in this project.
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
    try{
        const authUser = request.headers.get("Authorization");

        if (!authUser || !authUser.startsWith("Bearer ")) {
            return NextResponse.json({
                message: "Authorization header missing or invalid",
                status: 401
            });
        }

        const token = authUser.split(" ")[1];

        const decode = jwt.verify(
            token,
            process.env.JWT_SECRET! 
        ) as {
             id: number;
  name: string;
        };

        // console.log("Decoded JWT:", decode);

        const result = await pool.query(
            `SELECT id, name, email FROM users WHERE id = $1`,
            [decode.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({
                message: "User not found",
                status: 404
            });
        }

        return NextResponse.json({
            message: "User retrieved successfully",
            data: result.rows[0],
        });

    } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json({
            message: "Internal server error",
            status: 500
        });
    }
}