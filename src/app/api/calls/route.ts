import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoCalls, type DemoCall } from "@/lib/demo-data";
import { Prisma, Sentiment } from "@prisma/client";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId") || undefined;

    const sentimentParam = searchParams.get("sentiment");
    const sentiment: Sentiment | undefined =
      sentimentParam && (Object.values(Sentiment) as string[]).includes(sentimentParam)
        ? (sentimentParam as Sentiment)
        : undefined;

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const skip = (page - 1) * limit;

    if (!hasDatabase()) {
      const filtered = demoCalls.filter((c) => {
        if (leadId && c.leadId !== leadId) return false;
        if (sentiment && c.sentiment !== sentiment) return false;
        return true;
      });
      return NextResponse.json({
        data: filtered.slice(skip, skip + limit) satisfies DemoCall[],
        meta: { total: filtered.length, page, limit },
      });
    }

    const where: Prisma.CallWhereInput = {};
    if (leadId) where.leadId = leadId;
    if (sentiment) where.sentiment = sentiment;

    const [total, calls] = await Promise.all([
      prisma.call.count({ where }),
      prisma.call.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          createdAt: true,
          durationSeconds: true,
          sentiment: true,
          summary: true,
          transcript: true,
          lead: { select: { id: true, name: true } },
        },
      }),
    ]);

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
      meta: { total, page, limit },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "CALLS_LIST_FAILED", message: "Unable to load calls." } },
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

