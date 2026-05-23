import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

function authSecret(): Uint8Array | null {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) return null;
  return new TextEncoder().encode(s);
}

async function readSession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const secret = authSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const sub = payload.sub;
    const email = typeof payload.email === "string" ? payload.email : null;
    if (typeof sub !== "string" || !email) return null;
    return { sub, email };
  } catch {
    return null;
  }
}

function isPublicApiPath(pathname: string) {
  return (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/google-game") ||
    pathname.startsWith("/api/auth/game-session")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = authSecret();

  if (!secret) {
    if (
      pathname === "/login" ||
      pathname === "/api/auth/login" ||
      pathname.startsWith("/experience") ||
      isPublicApiPath(pathname)
    ) {
      return NextResponse.next();
    }
    return new NextResponse(
      "Missing AUTH_SECRET. Add it to .env (min 16 characters). See .env.example.",
      { status: 503 },
    );
  }

  if (pathname === "/login") {
    const session = await readSession(req);
    if (session) {
      return NextResponse.redirect(new URL("/pipeline", req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/experience")) {
    return NextResponse.next();
  }

  const session = await readSession(req);

  if (pathname.startsWith("/api/auth/login")) {
    return NextResponse.next();
  }

  if (isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (!session) {
      return NextResponse.json({ error: { message: "Unauthorized." } }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!session) {
    const login = new URL("/login", req.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|arkadians-game|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|html)$).*)",
  ],
};
