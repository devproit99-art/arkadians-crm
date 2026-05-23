import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActivityStatus, ActivityType, CallLogDirection, LeadStatus, Priority, UnitType, Urgency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  cleanBrowserTranscriptLines,
  parseStoredBrowserTranscript,
  serializeBrowserTranscript,
  type BrowserTranscriptLine,
} from "@/lib/vapi/parse-web-transcript-message";
import { extractLeadDetailsFromTranscript, formatCallbackAt } from "@/lib/transcript-extraction";

const bodySchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(["completed", "failed", "ended"]).default("completed"),
  transcript: z.string().max(500_000).optional(),
  summary: z.string().max(20_000).optional().nullable(),
  vapiCallId: z.string().max(200).optional().nullable(),
  durationSeconds: z.number().int().min(0).max(86400).optional(),
});

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function isGenericLeadName(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n) return true;
  return ["prospect", "lead", "unknown", "demo", "test"].some((k) => n === k || n.includes(k));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ callLogId: string }> },
) {
  const { callLogId } = await params;

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

    const body = parsed.data;
    const existing = await prisma.callLog.findFirst({
      where: {
        id: callLogId,
        leadId: body.leadId,
        direction: CallLogDirection.OUTBOUND,
        status: { startsWith: "browser_test" },
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: { code: "CALL_LOG_NOT_FOUND", message: "Call log not found for this lead." } },
        { status: 404 },
      );
    }

    const endedAt = new Date();
    const dbStatus = body.status === "failed" ? "browser_test_failed" : "browser_test_completed";

    const storedLines = body.transcript ? parseStoredBrowserTranscript(body.transcript) : null;
    const cleanedLines = storedLines ? cleanBrowserTranscriptLines(storedLines) : null;
    const cleanedTranscript = cleanedLines ? serializeBrowserTranscript(cleanedLines) : body.transcript;

    const lead = await prisma.lead.findFirst({
      where: { id: body.leadId, deletedAt: null },
      select: { id: true, name: true, notes: true, budgetMin: true, budgetMax: true, preferredUnit: true, urgency: true, status: true, ownerId: true },
    });

    const extracted = cleanedTranscript
      ? extractLeadDetailsFromTranscript(cleanedTranscript, lead ?? undefined)
      : { summary: "Browser AI test completed.", buyingIntent: "unknown" as const };

    await prisma.$transaction(async (tx) => {
      await tx.callLog.update({
        where: { id: callLogId },
        data: {
          status: dbStatus,
          endedAt,
          transcript: cleanedTranscript === undefined ? undefined : cleanedTranscript,
          summary: extracted.summary,
          vapiCallId: body.vapiCallId === undefined ? undefined : body.vapiCallId,
        },
      });

      if (lead) {
        const leadUpdates: Record<string, unknown> = {
          lastCallAt: endedAt,
        };

        if (extracted.name && isGenericLeadName(lead.name)) {
          leadUpdates.name = extracted.name;
        }

        if (extracted.budgetMin != null || extracted.budgetMax != null) {
          // Only set if not already present, to avoid overwriting real CRM inputs.
          if (lead.budgetMin == null && extracted.budgetMin != null) {
            leadUpdates.budgetMin = BigInt(Number(extracted.budgetMin));
          }
          if (lead.budgetMax == null && extracted.budgetMax != null) {
            leadUpdates.budgetMax = BigInt(Number(extracted.budgetMax));
          }
        }

        const extractedUnit = extracted.preferredUnit;
        const allowedUnits = new Set(["two_bed", "three_bed", "three_bed_large", "four_bed_duplex", "penthouse"]);
        if (extractedUnit && lead.preferredUnit == null && allowedUnits.has(extractedUnit)) {
          leadUpdates.preferredUnit = extractedUnit;
        }

        if (extracted.buyingIntent === "buying_soon") {
          leadUpdates.urgency = Urgency.high;
          leadUpdates.status = LeadStatus.contacted;
        } else if (extracted.buyingIntent === "looking") {
          // keep it softer; don't downgrade if already higher
          if (lead.urgency === Urgency.low) leadUpdates.urgency = Urgency.medium;
        }

        const noteLines: string[] = [`AI browser test: ${extracted.summary}`];
        if (extracted.callbackTimeText) {
          noteLines.push(`AI callback confirmed: ${extracted.callbackTimeText}`);
          if (extracted.callbackAt) {
            noteLines.push(`Parsed callback: ${formatCallbackAt(extracted.callbackAt)}`);
          }
        }
        const existingNotes = lead.notes?.trim();
        leadUpdates.notes = existingNotes ? `${existingNotes}\n${noteLines.join("\n")}` : noteLines.join("\n");

        await tx.lead.update({
          where: { id: body.leadId },
          data: leadUpdates,
        });

        const activityNotesParts: string[] = [];
        if (extracted.propertyInterest) activityNotesParts.push(`Property: ${extracted.propertyInterest}`);
        if (extracted.budgetText) activityNotesParts.push(`Budget: ${extracted.budgetText}`);
        if (extracted.buyingIntent && extracted.buyingIntent !== "unknown") {
          activityNotesParts.push(`Intent: ${extracted.buyingIntent === "buying_soon" ? "buying soon" : "looking"}`);
        }
        if (extracted.callbackTimeText) activityNotesParts.push(`Callback: ${extracted.callbackTimeText}`);
        if (extracted.callbackAt) activityNotesParts.push(`Parsed callback: ${formatCallbackAt(extracted.callbackAt)}`);
        if (extracted.whatsappConfirmed != null) {
          activityNotesParts.push(`WhatsApp: ${extracted.whatsappConfirmed ? "yes" : "no"}`);
        }
        const activityNotes = activityNotesParts.join(" · ") || extracted.summary;

        if (extracted.callbackTimeText) {
          const activityTitle = "Callback confirmed";
          await tx.activity.create({
            data: {
              leadId: body.leadId,
              type: ActivityType.follow_up,
              status: ActivityStatus.pending,
              priority: extracted.buyingIntent === "buying_soon" ? Priority.high : Priority.medium,
              title: activityTitle,
              notes: activityNotes,
              dueAt: extracted.callbackAt ?? null,
                  userId: lead.ownerId ?? null,
              completedAt: null,
            },
          });
        }
      }
    });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: { code: "BROWSER_CALL_END_FAILED", message: "Could not update browser call log." } },
      { status: 500 },
    );
  }
}
