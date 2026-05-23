import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({ data: [] });
  }

  const session = await getSession();
  const isAdmin = (session?.role ?? "").toLowerCase() === "admin";
  if (!session || !isAdmin) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Admin access required." } },
      { status: 403 },
    );
  }

  const users = await prisma.user.findMany({
    where: { status: "active", role: { in: ["manager", "sales_rep"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true, email: true },
    take: 50,
  });

  return NextResponse.json({ data: users });
}

