import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  role?: string;
};

function getAuthSecretBytes(): Uint8Array | null {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) return null;
  return new TextEncoder().encode(s);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const secret = getAuthSecretBytes();
  if (!secret) throw new Error("AUTH_SECRET is not set (min 16 characters).");

  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  const secret = getAuthSecretBytes();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const sub = payload.sub;
    const email = typeof payload.email === "string" ? payload.email : null;
    const name = typeof payload.name === "string" ? payload.name : null;
    const role = typeof payload.role === "string" ? payload.role : undefined;
    if (typeof sub !== "string" || !email) return null;
    return { userId: sub, email, name: name ?? email, role };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
