import { NextResponse } from "next/server";
import { GAME_SESSION_COOKIE_NAME } from "@/lib/auth-game-constants";

export async function POST() {
  const res = NextResponse.json({ data: { ok: true } });
  res.cookies.set(GAME_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 0,
  });
  return res;
}
