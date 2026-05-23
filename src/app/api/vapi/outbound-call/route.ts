import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { startOutboundCallForLead } from "@/lib/vapi/start-outbound-call-for-lead";

export const maxDuration = 60;

const bodySchema = z.object({
  leadId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Request body must be JSON." } },
        { status: 400 },
      );
    }

    const parsed = bodySchema.safeParse(json);
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

    const result = await startOutboundCallForLead({
      leadId: parsed.data.leadId,
      trigger: "manual_ui",
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    }

    return NextResponse.json({
      ok: true,
      data: {
        callLogId: result.data.callLogId,
        vapiCallId: result.data.vapiCallId,
        status: result.data.status,
      },
    });
  } catch (e) {
    console.error("POST /api/vapi/outbound-call", e);

    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2021") {
        return NextResponse.json(
          {
            error: {
              code: "TABLE_MISSING",
              message:
                "Database tables are missing. Run: npx prisma migrate deploy (or prisma db push) with your DATABASE_URL.",
            },
          },
          { status: 503 },
        );
      }
    }

    if (e instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        {
          error: {
            code: "DB_UNREACHABLE",
            message: "Cannot reach the database. Check DATABASE_URL and network.",
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "OUTBOUND_CALL_FAILED",
          message: "Unable to start outbound call.",
        },
      },
      { status: 500 },
    );
  }
}
