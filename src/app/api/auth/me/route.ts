import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

