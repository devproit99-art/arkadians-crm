import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SEC } from "@/lib/auth-constants";
import {
  LEGACY_PASSWORD_HASH_PLACEHOLDER,
  SEED_USER_PASSWORD,
} from "@/lib/seed-auth";

const DEMO_ADMIN_EMAIL = "admin@arkadians.local";
const DEMO_ADMIN_PASSWORD = "ArkadiansDemo2026!";
const DEMO_CEO_EMAIL = "ceo@arkadians.local";

const bodySchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(1)
    .transform((s) => s.trim()),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "Invalid email or password." } },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Demo admin convenience: if the DB was not re-seeded, allow the demo admin
    // credentials to create/activate the user on demand.
    if (normalizedEmail === DEMO_ADMIN_EMAIL && password === DEMO_ADMIN_PASSWORD) {
      const adminPasswordHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10);
      const adminUser = await prisma.user.upsert({
        where: { email: DEMO_ADMIN_EMAIL },
        update: {
          name: "Arkadians Admin",
          role: "admin",
          status: "active",
          passwordHash: adminPasswordHash,
        },
        create: {
          name: "Arkadians Admin",
          email: DEMO_ADMIN_EMAIL,
          passwordHash: adminPasswordHash,
          role: "admin",
          status: "active",
        },
      });

      const token = await createSessionToken({
        userId: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      });

      const res = NextResponse.json({
        data: { email: adminUser.email, name: adminUser.name },
      });

      res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.COOKIE_SECURE === "true",
        path: "/",
        maxAge: SESSION_MAX_AGE_SEC,
      });

      return res;
    }

    // Demo CEO convenience: same idea as admin — works even if seed was never updated on this DB.
    if (normalizedEmail === DEMO_CEO_EMAIL && password === SEED_USER_PASSWORD) {
      const ceoPasswordHash = await bcrypt.hash(password, 10);
      const ceoUser = await prisma.user.upsert({
        where: { email: DEMO_CEO_EMAIL },
        update: {
          name: "CEO Demo",
          role: "ceo",
          status: "active",
          passwordHash: ceoPasswordHash,
        },
        create: {
          name: "CEO Demo",
          email: DEMO_CEO_EMAIL,
          passwordHash: ceoPasswordHash,
          role: "ceo",
          status: "active",
        },
      });

      const token = await createSessionToken({
        userId: ceoUser.id,
        email: ceoUser.email,
        name: ceoUser.name,
        role: ceoUser.role,
      });

      const res = NextResponse.json({
        data: { email: ceoUser.email, name: ceoUser.name },
      });

      res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.COOKIE_SECURE === "true",
        path: "/",
        maxAge: SESSION_MAX_AGE_SEC,
      });

      return res;
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
        status: "active",
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: { message: "Invalid email or password." } },
        { status: 401 },
      );
    }

    let ok = await bcrypt.compare(password, user.passwordHash);

    if (
      !ok &&
      user.passwordHash === LEGACY_PASSWORD_HASH_PLACEHOLDER &&
      password === SEED_USER_PASSWORD
    ) {
      const newHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });
      ok = true;
    }

    if (!ok) {
      return NextResponse.json(
        { error: { message: "Invalid email or password." } },
        { status: 401 },
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const res = NextResponse.json({
      data: { email: user.email, name: user.name },
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      // HTTP deployments (e.g. http://IP:3001): do not set secure. Use COOKIE_SECURE=true only behind HTTPS.
      secure: process.env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: SESSION_MAX_AGE_SEC,
    });

    return res;
  } catch (e) {
    console.error("POST /api/auth/login", e);
    return NextResponse.json(
      { error: { message: "Login failed. Try again." } },
      { status: 500 },
    );
  }
}
