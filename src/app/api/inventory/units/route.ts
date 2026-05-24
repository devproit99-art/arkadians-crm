import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

const listQuerySchema = z.object({
  tower: z.string().optional(),
  viewCategory: z.string().optional(),
  type: z.string().optional(),
  status: z
    .enum([
      "available",
      "interested",
      "viewing",
      "deposit_secured",
      "payment_secured",
      "sold_assigned",
    ])
    .optional(),
  q: z.string().optional(),
  scope: z.enum(["user", "admin"]).optional(), // admin => full stock visibility
});

const upsertBodySchema = z.object({
  id: z.string().uuid().optional(),
  tower: z.string().min(1),
  flatNumber: z.string().min(1),
  sizeSqft: z.number().int().nonnegative(),
  type: z.string().min(1),
  viewCategory: z.string().min(1),
  price: z.number().int().nonnegative(),
  status: z.enum([
    "available",
    "interested",
    "viewing",
    "deposit_secured",
    "payment_secured",
    "sold_assigned",
  ]),
  customerName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
});

function roleIsAdmin(role: string | null | undefined) {
  return (role ?? "").toLowerCase() === "admin";
}

function normalizeRoleScope(sessionRole: string | null | undefined, requestedScope?: "user" | "admin") {
  const isAdmin = roleIsAdmin(sessionRole);
  if (isAdmin && requestedScope === "admin") return "admin" as const;
  return "user" as const;
}

function userVisibleStatuses() {
  return ["available", "interested", "viewing"] as const;
}

async function ensureSeeded() {
  const count = await prisma.inventoryUnit.count();
  if (count > 0) return;

  const towers = ["A", "B", "C", "D", "E"];
  const floors = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const types = ["4 Room", "5 Room", "Duplex", "Economy"];
  const views = ["Golf View", "Arabian Sea View", "Other View"];

  type SeedUnit = {
    tower: string;
    flatNumber: string;
    sizeSqft: number;
    type: string;
    viewCategory: string;
    price: bigint;
    status: "available";
  };
  const units: SeedUnit[] = [];
  let idx = 0;
  for (const tower of towers) {
    for (const floor of floors) {
      idx += 1;
      const unitNo = 1 + (idx % 4);
      const flatNumber = `${tower}-${String(floor).padStart(2, "0")}${String(unitNo).padStart(2, "0")}`;
      const type = types[idx % types.length]!;
      const viewCategory = views[idx % views.length]!;
      const baseSize = type === "Duplex" ? 2350 : type === "5 Room" ? 2100 : type === "4 Room" ? 1650 : 1250;
      const sizeSqft = baseSize + (idx % 5) * 35;
      const price = Math.round(sizeSqft * (1150 + (idx % 6) * 40));

      units.push({
        tower,
        flatNumber,
        sizeSqft,
        type,
        viewCategory,
        price: BigInt(price),
        status: "available",
      });
    }
  }

  await prisma.inventoryUnit.createMany({ data: units, skipDuplicates: true });
}

export async function GET(req: Request) {
  if (!hasDatabase()) return NextResponse.json({ data: [] });

  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  }

  await ensureSeeded();

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid query." } },
      { status: 400 },
    );
  }

  const { tower, viewCategory, type, status, q, scope } = parsed.data;
  const effectiveScope = normalizeRoleScope(session.role, scope);

  if (effectiveScope !== "admin" && status && !(userVisibleStatuses() as readonly string[]).includes(status)) {
    return NextResponse.json({ data: [] });
  }

  const rows = await prisma.inventoryUnit.findMany({
    where: {
      ...(tower ? { tower } : {}),
      ...(viewCategory ? { viewCategory } : {}),
      ...(type ? { type } : {}),
      ...(status
        ? { status }
        : effectiveScope === "admin"
          ? {}
          : { status: { in: [...userVisibleStatuses()] } }),
      ...(q
        ? {
            flatNumber: { contains: q, mode: "insensitive" },
          }
        : {}),
    },
    orderBy: [{ viewCategory: "asc" }, { tower: "asc" }, { flatNumber: "asc" }],
    take: effectiveScope === "admin" ? 2000 : 800,
  });

  const data = rows.map((u: any) => ({
    id: u.id,
    tower: u.tower,
    flatNumber: u.flatNumber,
    sizeSqft: u.sizeSqft,
    type: u.type,
    viewCategory: u.viewCategory,
    price: u.price.toString(),
    status: u.status,
    customerName: u.customerName,
    notes: u.notes,
    leadId: u.leadId,
  }));

  return NextResponse.json({
    data,
    meta: { scope: effectiveScope, role: (session.role ?? "").toLowerCase() },
  });
}

export async function POST(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: { code: "DB_NOT_CONFIGURED", message: "Database is not configured." } },
      { status: 503 },
    );
  }

  const session = await getSession();
  const isAdmin = roleIsAdmin(session?.role);
  if (!session || !isAdmin) {
    console.warn("POST /api/inventory/units -> forbidden", { hasSession: Boolean(session), role: session?.role });
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Admin access required." } },
      { status: 403 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = upsertBodySchema.safeParse(json);
  if (!parsed.success) {
    console.warn("POST /api/inventory/units -> bad request", {
      issues: parsed.error.issues,
      bodyType: json ? typeof json : null,
    });
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Invalid inventory payload.",
          details: process.env.NODE_ENV === "production" ? undefined : parsed.error.issues,
        },
      },
      { status: 400 },
    );
  }

  const body = parsed.data;
  console.log("POST /api/inventory/units -> saving", {
    id: body.id ?? null,
    flatNumber: body.flatNumber,
    tower: body.tower,
    status: body.status,
    leadId: body.leadId ?? null,
  });
  const data = {
    tower: body.tower,
    flatNumber: body.flatNumber,
    sizeSqft: body.sizeSqft,
    type: body.type,
    viewCategory: body.viewCategory,
    price: BigInt(body.price),
    status: body.status,
    customerName: body.customerName ?? null,
    notes: body.notes ?? null,
    leadId: body.leadId ?? null,
    statusAt: new Date(),
  } as const;

  // If id is provided, update that row. Otherwise upsert by unique flatNumber
  // to prevent duplicates and make "Save Flat" idempotent.
  try {
    const saved = body.id
      ? await prisma.inventoryUnit.update({ where: { id: body.id }, data })
      : await prisma.inventoryUnit.upsert({
          where: { flatNumber: body.flatNumber },
          update: data,
          create: data,
        });

    console.log("POST /api/inventory/units -> saved", { id: saved.id });
    return NextResponse.json({
      data: {
        id: saved.id,
        tower: saved.tower,
        flatNumber: saved.flatNumber,
        sizeSqft: saved.sizeSqft,
        type: saved.type,
        viewCategory: saved.viewCategory,
        price: saved.price.toString(),
        status: saved.status,
        customerName: saved.customerName,
        notes: saved.notes,
        leadId: saved.leadId,
      },
    });
  } catch (e) {
    console.error("POST /api/inventory/units -> prisma error", e);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Could not save inventory unit." } },
      { status: 500 },
    );
  }
}


