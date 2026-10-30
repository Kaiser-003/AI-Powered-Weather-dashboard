import { NextRequest ,NextResponse} from "next/server";
import {pool} from "@/lib/db";
import bcrypt from "bcryptjs";
// @ts-expect-error jsonwebtoken declarations are not installed in this project
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
    try{
        const {email,password} = await request.json();

        if(!email||!password){
            return NextResponse.json({message:"Missing required fields"}, {status:400});
        }

        const result = await pool.query(
            "SELECT id, name, email, password_hash FROM users WHERE email = $1",
            [email]
        );

        if(result.rows.length === 0){
            return NextResponse.json({message:"Invalid email or password"}, {status:401});
        }

        const users = result.rows[0];

        const isPasswordValid = await bcrypt.compare(
            password,users.password_hash
        );

        if(!isPasswordValid){
            return NextResponse.json({message:"Invalid email or password"}, {status:401});
        }

        const token = jwt.sign(
            {id:users.id,
                name:users.name,
            },
            process.env.JWT_SECRET!,
            {expiresIn: "2h"} 
        );

        return NextResponse.json({
            message: "Login successful",
            token,
            user: {
                id: users.id,
                name: users.name,
                email: users.email
            }
        }, {status: 200});
    }
    catch (error) {
        console.error("Error logging in user:", error);
        return NextResponse.json({message:"Internal server error"}, {status:500});
    }
}