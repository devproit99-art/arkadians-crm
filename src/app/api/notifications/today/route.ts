import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function startOfToday(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfToday(d: Date) {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
        { status: 401 },
      );
    }

    if (!hasDatabase()) {
      return NextResponse.json({ data: [] });
    }

    const isAdmin = (session.role ?? "").toLowerCase() === "admin";
    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get("userId")?.trim() || "";
    const userId = isAdmin ? requestedUserId : session.userId;

    const now = new Date();
    const start = startOfToday(now);
    const end = endOfToday(now);

    const whereUser =
      isAdmin && !userId
        ? {}
        : {
            // staff: only their own activities
            // admin: if userId is provided, filter to that staff member
            userId,
          };

    const rows = await prisma.activity.findMany({
      where: {
        ...whereUser,
        dueAt: { gte: start, lte: end },
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 400,
      select: {
        id: true,
        leadId: true,
        type: true,
        status: true,
        priority: true,
        title: true,
        dueAt: true,
        userId: true,
        lead: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    return NextResponse.json({
      data: rows.map((a) => ({
        id: a.id,
        leadId: a.leadId,
        leadName: a.lead.name,
        type: a.type,
        status: a.status,
        priority: a.priority,
        title: a.title,
        dueAt: a.dueAt ? a.dueAt.toISOString() : null,
        userId: a.userId ?? null,
        userName: a.user?.name ?? null,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: { code: "NOTIFICATIONS_TODAY_FAILED", message: "Unable to load schedule." } },
      { status: 500 },
    );
  }
}

