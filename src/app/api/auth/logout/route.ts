import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

export async function POST() {
  const res = NextResponse.json({ data: { ok: true } });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 0,
  });
  return res;
}
