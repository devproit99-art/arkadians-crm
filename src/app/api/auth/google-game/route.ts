import { NextResponse } from "next/server";
import { z } from "zod";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createGameSessionToken } from "@/lib/auth-game";
import { GAME_SESSION_COOKIE_NAME, GAME_SESSION_MAX_AGE_SEC } from "@/lib/auth-game-constants";

const bodySchema = z.object({
  credential: z.string().min(10),
});

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export async function POST(req: Request) {
  try {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_GAME_CLIENT_ID?.trim();
    if (!clientId) {
      return NextResponse.json(
        { error: { code: "GOOGLE_NOT_CONFIGURED", message: "Google sign-in is not configured for the experience." } },
        { status: 501 },
      );
    }

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: { message: "Invalid credential." } }, { status: 400 });
    }

    const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
    const { payload } = await jwtVerify(parsed.data.credential, JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience: clientId,
    });

    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const name =
      (typeof payload.name === "string" && payload.name.trim()) ||
      email?.split("@")[0] ||
      "Guest";
    const picture = typeof payload.picture === "string" ? payload.picture : undefined;
    if (!sub || !email) {
      return NextResponse.json({ error: { message: "Invalid Google profile." } }, { status: 400 });
    }

    const token = await createGameSessionToken({
      sub: `google:${sub}`,
      email,
      name,
      picture,
    });

    const res = NextResponse.json({ data: { ok: true, email, name } });
    res.cookies.set(GAME_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: GAME_SESSION_MAX_AGE_SEC,
    });
    return res;
  } catch {
    return NextResponse.json({ error: { message: "Google sign-in failed." } }, { status: 401 });
  }
}
