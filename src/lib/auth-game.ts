import { SignJWT, jwtVerify } from "jose";

export type GameSessionUser = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};

function getAuthSecretBytes(): Uint8Array | null {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) return null;
  return new TextEncoder().encode(s);
}

export async function createGameSessionToken(user: GameSessionUser): Promise<string> {
  const secret = getAuthSecretBytes();
  if (!secret) throw new Error("AUTH_SECRET is not set (min 16 characters).");

  return new SignJWT({
    typ: "game_player",
    email: user.email,
    name: user.name,
    picture: user.picture,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyGameSessionToken(token: string): Promise<GameSessionUser | null> {
  const secret = getAuthSecretBytes();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.typ !== "game_player") return null;
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const name = typeof payload.name === "string" ? payload.name : null;
    if (!sub || !email || !name) return null;
    const picture = typeof payload.picture === "string" ? payload.picture : undefined;
    return { sub, email, name, picture };
  } catch {
    return null;
  }
}
