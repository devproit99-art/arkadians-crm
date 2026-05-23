import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const patchActivitySchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  completedAt: z.string().datetime().optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  title: z.string().min(1).optional(),
  notes: z.string().optional().nullable(),
});

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
    const parsed = patchActivitySchema.safeParse(json);
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
    await prisma.activity.update({
      where: { id },
      data: {
        status: body.status,
        completedAt:
          body.completedAt === undefined
            ? undefined
            : body.completedAt === null
              ? null
              : new Date(body.completedAt),
        dueAt:
          body.dueAt === undefined
            ? undefined
            : body.dueAt === null
              ? null
              : new Date(body.dueAt),
        priority: body.priority,
        title: body.title,
        notes: body.notes === undefined ? undefined : body.notes,
      },
    });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      {
        error: { code: "ACTIVITY_UPDATE_FAILED", message: "Unable to update activity." },
      },
      { status: 500 },
    );
  }
}

