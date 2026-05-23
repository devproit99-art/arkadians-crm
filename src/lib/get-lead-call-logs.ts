import { CallLogDirection } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export type LeadCallLogRow = {
  id: string;
  direction: string;
  status: string;
  outcome: string | null;
  summary: string | null;
  vapiCallId: string | null;
  atLabel: string;
};

export async function getLeadCallLogs(leadId: string): Promise<LeadCallLogRow[]> {
  if (!hasDatabase()) return [];

  const rows = await prisma.callLog.findMany({
    where: { leadId },
    orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
    take: 25,
    select: {
      id: true,
      direction: true,
      status: true,
      outcome: true,
      summary: true,
      vapiCallId: true,
      startedAt: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    direction: r.direction,
    status: r.status,
    outcome: r.outcome,
    summary: r.summary,
    vapiCallId: r.vapiCallId,
    atLabel: (r.startedAt ?? r.createdAt).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  }));
}

export type LatestBrowserTestRow = {
  id: string;
  status: string;
  startedAtLabel: string;
  endedAtLabel: string | null;
  transcript: string | null;
  summary: string | null;
  durationSeconds: number | null;
};

export async function getLatestBrowserTestForLead(leadId: string): Promise<LatestBrowserTestRow | null> {
  if (!hasDatabase()) return null;

  const row = await prisma.callLog.findFirst({
    where: { leadId, direction: CallLogDirection.OUTBOUND, status: { startsWith: "browser_test" } },
    orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      startedAt: true,
      createdAt: true,
      endedAt: true,
      transcript: true,
      summary: true,
      durationSeconds: true,
    },
  });
  if (!row) return null;

  const started = row.startedAt ?? row.createdAt;
  return {
    id: row.id,
    status: row.status,
    startedAtLabel: started.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
    endedAtLabel: row.endedAt
      ? row.endedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
      : null,
    transcript: row.transcript,
    summary: row.summary,
    durationSeconds: row.durationSeconds,
  };
}
