import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/datetime";

const bodySchema = z.object({
  kind: z.enum(["email", "whatsapp"]),
  template: z.string().min(1).max(80),
  language: z.string().max(20).optional(),
  subject: z.string().max(200).optional(),
  content: z.string().min(1).max(20_000),
});

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export async function POST(
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

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
        { status: 401 },
      );
    }
    const isAdmin = (session.role ?? "").toLowerCase() === "admin";

    const json = await req.json();
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

    const lead = await prisma.lead.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, ownerId: true, notes: true },
    });
    if (!lead) {
      return NextResponse.json(
        { error: { code: "LEAD_NOT_FOUND", message: "Lead not found." } },
        { status: 404 },
      );
    }

    if (!isAdmin) {
      const ownsLead = lead.ownerId && lead.ownerId === session.userId;
      if (!ownsLead) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "You can only save messages for leads you own." } },
          { status: 403 },
        );
      }
    }

    const stamp = formatDateTime(new Date());
    const who = (session.name ?? "").trim() || "Advisor";
    const templateLabel =
      body.kind === "whatsapp" && body.language
        ? `${body.template} (${body.language})`
        : body.template;
    const header =
      body.kind === "email"
        ? `Generated Email — ${templateLabel}\nSubject: ${body.subject ?? ""}`.trim()
        : `Generated WhatsApp — ${templateLabel}`;
    const block = `[${stamp}] ${who}:\n${header}\n\n${body.content.trim()}`.trim();

    const nextNotes = [lead.notes?.trim(), block].filter(Boolean).join("\n\n");

    await prisma.lead.update({
      where: { id: lead.id },
      data: { notes: nextNotes },
    });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: { code: "AI_NOTE_FAILED", message: "Unable to save note." } },
      { status: 500 },
    );
  }
}

