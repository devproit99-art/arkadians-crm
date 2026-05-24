import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

const bodySchema = z.object({
  name: z.string().min(1).transform((s) => s.trim()),
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8).transform((s) => s.trim()),
  role: z.enum(["admin", "ceo", "manager", "sales_rep", "viewer"]),
});

export async function POST(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: { code: "DB_NOT_CONFIGURED", message: "Database is not configured." } },
      { status: 503 },
    );
  }

  const session = await getSession();
  const isAdmin = (session?.role ?? "").toLowerCase() === "admin";
  if (!session || !isAdmin) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Admin access required." } },
      { status: 403 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid user payload." } },
      { status: 400 },
    );
  }

  const { name, email, password, role } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const created = await prisma.user.create({
      data: {
        name,
        email,
        role,
        status: "active",
        passwordHash,
      },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    const isUnique = msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("duplicate");
    if (isUnique) {
      return NextResponse.json(
        { error: { code: "EMAIL_EXISTS", message: "A user with this email already exists." } },
        { status: 409 },
      );
    }
    console.error("POST /api/admin/users", e);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Could not create user." } },
      { status: 500 },
    );
  }
}


