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

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
        { status: 401 },
      );
    }
    const isAdmin = (session.role ?? "").toLowerCase() === "admin";
    if (!isAdmin) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin only." } },
        { status: 403 },
      );
    }

    if (!hasDatabase()) {
      return NextResponse.json({ data: { staff: [], missed: [] } });
    }

    const now = new Date();
    const start = startOfToday(now);
    const end = endOfToday(now);

    const users = await prisma.user.findMany({
      where: { status: "active", role: { in: ["manager", "sales_rep"] } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, role: true },
      take: 50,
    });

    const acts = await prisma.activity.findMany({
      where: { dueAt: { gte: start, lte: end }, userId: { not: null } },
      orderBy: [{ dueAt: "asc" }],
      take: 1200,
      select: {
        id: true,
        userId: true,
        status: true,
        type: true,
        title: true,
        dueAt: true,
        leadId: true,
        lead: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    const staffMap = new Map<string, { userId: string; name: string; due: number; completed: number; missed: number }>();
    for (const u of users) {
      staffMap.set(u.id, { userId: u.id, name: u.name, due: 0, completed: 0, missed: 0 });
    }

    const missed: Array<{
      id: string;
      userId: string;
      userName: string;
      dueAt: string | null;
      type: string;
      title: string;
      leadId: string;
      leadName: string;
      status: string;
    }> = [];

    for (const a of acts) {
      if (!a.userId) continue;
      const row = staffMap.get(a.userId);
      if (!row) continue;
      row.due += 1;
      if (a.status === "completed") row.completed += 1;
      const isMissed = a.status !== "completed" && a.dueAt && a.dueAt.getTime() < now.getTime();
      if (isMissed) {
        row.missed += 1;
        missed.push({
          id: a.id,
          userId: a.userId,
          userName: a.user?.name ?? "Advisor",
          dueAt: a.dueAt ? a.dueAt.toISOString() : null,
          type: a.type,
          title: a.title,
          leadId: a.leadId,
          leadName: a.lead.name,
          status: a.status,
        });
      }
    }

    return NextResponse.json({
      data: {
        staff: Array.from(staffMap.values()).sort((a, b) => b.missed - a.missed),
        missed: missed.slice(0, 60),
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "ACTIVITY_OVERSIGHT_FAILED", message: "Unable to load oversight." } },
      { status: 500 },
    );
  }
}

