import { NextRequest , NextResponse } from "next/server";
import {pool} from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request:NextRequest) {
try{
    const{name,email,password} = await request.json();

    if(!name ||!email||!password){
        return NextResponse.json({message:"Missing required fields"}, {status:400});
    }

    const userExists = await pool.query(
        "SELECT id FROM users Where email = $1",
        [email]
    );

    if (userExists.rows.length > 0) {
        return NextResponse.json({message:"User already exists"}, {status:409});
    }

    const hashPassword = await bcrypt.hash(password, 10);

   const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, hashPassword]
);

    return NextResponse.json({message:"User created successfully", user: result.rows[0]}, {status:201});
} catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json({message:"Internal server error"}, {status:500});
}
}