import { NextResponse } from "next/server";
import { CallLogDirection } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params;

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

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, deletedAt: null },
      select: { id: true },
    });
    if (!lead) {
      return NextResponse.json(
        { error: { code: "LEAD_NOT_FOUND", message: "Lead not found." } },
        { status: 404 },
      );
    }

    const startedAt = new Date();
    const callLog = await prisma.callLog.create({
      data: {
        leadId,
        direction: CallLogDirection.OUTBOUND,
        status: "browser_test",
        startedAt: startedAt,
        outcome: "browser_test",
      },
    });

    return NextResponse.json({
      data: {
        callLogId: callLog.id,
        startedAt: startedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "BROWSER_CALL_START_FAILED", message: "Could not start browser call log." } },
      { status: 500 },
    );
  }
}
