import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoCalls } from "@/lib/demo-data";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get("ownerId")?.trim() || null;

    if (!hasDatabase()) {
      return NextResponse.json({ data: demoCalls.slice(0, 5) });
    }

    const calls = await prisma.call.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      where: ownerId ? { lead: { ownerId } } : undefined,
      select: {
        id: true,
        createdAt: true,
        durationSeconds: true,
        sentiment: true,
        summary: true,
        transcript: true,
        lead: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      data: calls.map((c) => ({
        id: c.id,
        leadId: c.lead.id,
        leadName: c.lead.name,
        createdAtLabel: "Recently",
        duration: formatDuration(c.durationSeconds ?? 0),
        sentiment: c.sentiment ?? "neutral",
        summary: c.summary ?? "Summary pending.",
        transcript: parseTranscript(c.transcript),
      })),
    });
  } catch {
    return NextResponse.json(
      {
        error: { code: "RECENT_CALLS_FAILED", message: "Unable to load recent calls." },
      },
      { status: 500 },
    );
  }
}

function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function parseTranscript(
  transcript: string | null,
): { speaker: "Agent" | "Caller"; text: string }[] {
  if (!transcript) return [];
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const isAgent = line.toLowerCase().startsWith("agent:");
      const isCaller = line.toLowerCase().startsWith("caller:");
      if (isAgent) return { speaker: "Agent" as const, text: line.slice(6).trim() };
      if (isCaller) return { speaker: "Caller" as const, text: line.slice(7).trim() };
      return { speaker: "Caller" as const, text: line };
    });
}

