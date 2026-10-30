
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

type TokenPayload = {
  id?: number;
  userId?: number;
};

type AuthResult =
  | { userId: number }
  | { response: NextResponse };

export function authenticate(request: NextRequest): AuthResult {
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
        { message: "JWT_SECRET is not configured" },
        { status: 500 }
      ),
    };
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, secret) as TokenPayload;
    const userId = decoded.userId ?? decoded.id;

    if (
      typeof userId !== "number" ||
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
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
