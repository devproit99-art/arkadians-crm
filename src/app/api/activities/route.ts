import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { demoActivities, type DemoActivity } from "@/lib/demo-data";
import { ActivityStatus, ActivityType, Prisma } from "@prisma/client";

const createActivitySchema = z.object({
  leadId: z.string().min(1),
  type: z.enum([
    "task",
    "call",
    "email",
    "whatsapp",
    "viewing",
    "meeting",
    "note",
    "follow_up",
  ]),
  title: z.string().min(1),
  notes: z.string().optional(),
  dueAt: z.string().datetime().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const leadId = searchParams.get("leadId") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const overdue = searchParams.get("overdue") === "true";

    const statusParam = searchParams.get("status");
    const status: ActivityStatus | undefined =
      statusParam && (Object.values(ActivityStatus) as string[]).includes(statusParam)
        ? (statusParam as ActivityStatus)
        : undefined;

    const typeParam = searchParams.get("type");
    const type: ActivityType | undefined =
      typeParam && (Object.values(ActivityType) as string[]).includes(typeParam)
        ? (typeParam as ActivityType)
        : undefined;

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const skip = (page - 1) * limit;

    if (!hasDatabase()) {
      const now = Date.now();
      const filtered = demoActivities.filter((a) => {
        if (leadId && a.leadId !== leadId) return false;
        if (status && a.status !== status) return false;
        if (type && a.type !== type) return false;
        if (overdue && a.dueLabel && a.dueLabel.toLowerCase().includes("tomorrow"))
          return false;
        if (overdue && !a.dueLabel) return false;
        void now;
        return true;
      });
      return NextResponse.json({
        data: filtered.slice(skip, skip + limit) satisfies DemoActivity[],
        meta: { total: filtered.length, page, limit },
      });
    }

    const where: Prisma.ActivityWhereInput = {};
    if (leadId) where.leadId = leadId;
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (overdue) {
      where.dueAt = { lt: new Date() };
      where.status = { notIn: ["completed", "cancelled"] };
    }

    const [total, activities] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.findMany({
        where,
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          status: true,
          priority: true,
          title: true,
          dueAt: true,
          createdAt: true,
          lead: { select: { id: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: activities.map((a) => ({
        id: a.id,
        leadId: a.lead.id,
        leadName: a.lead.name,
        type: a.type,
        status: a.status,
        priority: a.priority,
        title: a.title,
        dueLabel: a.dueAt ? "Scheduled" : undefined,
        createdAtLabel: "Recently",
      })),
      meta: { total, page, limit },
    });
  } catch {
    return NextResponse.json(
      {
        error: { code: "ACTIVITIES_LIST_FAILED", message: "Unable to load activities." },
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!hasDatabase()) {
      return NextResponse.json(
        {
          error: {
            code: "DATABASE_NOT_CONFIGURED",
            message: "DATABASE_URL is not configured for write operations.",
          },
        },
        { status: 501 },
      );
    }

    const json = await req.json();
    const parsed = createActivitySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input.",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const activity = await prisma.activity.create({
      data: {
        leadId: body.leadId,
        type: body.type,
        title: body.title,
        notes: body.notes ?? null,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        priority: body.priority ?? "medium",
        status: "pending",
      },
      select: { id: true },
    });

    return NextResponse.json({ data: { id: activity.id } }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: { code: "ACTIVITY_CREATE_FAILED", message: "Unable to create activity." },
      },
      { status: 500 },
    );
  }
}

