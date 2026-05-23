import { NextRequest, NextResponse } from "next/server";
import { verifyGameSessionToken } from "@/lib/auth-game";
import { GAME_SESSION_COOKIE_NAME } from "@/lib/auth-game-constants";

function googleClientIdConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_GAME_CLIENT_ID?.trim());
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(GAME_SESSION_COOKIE_NAME)?.value;
  const googleOn = googleClientIdConfigured();

  if (!googleOn) {
    return NextResponse.json({
      data: { signedIn: true, authMode: "guest" as const, email: null, name: null },
    });
  }

  if (!token) {
    return NextResponse.json({
      data: { signedIn: false, authMode: "google" as const, email: null, name: null },
    });
  }

  const user = await verifyGameSessionToken(token);
  if (!user) {
    return NextResponse.json({
      data: { signedIn: false, authMode: "google" as const, email: null, name: null },
    });
  }

  return NextResponse.json({
    data: {
      signedIn: true,
      authMode: "google" as const,
      email: user.email,
      name: user.name,
      picture: user.picture ?? null,
    },
  });
}
