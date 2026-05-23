import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoLeads } from "@/lib/demo-data";
import { formatBudget } from "@/lib/budget";
import { scoreLead } from "@/lib/lead-scoring";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get("ownerId")?.trim() || null;

    if (!hasDatabase()) {
      const scored = [...demoLeads]
        .map((l) => ({
          ...l,
          score: scoreLead({
            status: l.status,
            budgetMin: l.budgetMin ?? null,
            budgetMax: l.budgetMax ?? null,
            urgency: l.urgency ?? null,
            notes: l.notes ?? null,
            source: l.source,
            preferredUnit: l.preferredUnit ?? null,
            preferredView: l.preferredView ?? null,
            updatedAt: null,
            lastCallAt: null,
          }).score,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      return NextResponse.json({ data: scored });
    }

    // Pull more than 5, score deterministically, then take top 5.
    const leads = await prisma.lead.findMany({
      where: { deletedAt: null, ownerId: ownerId ?? undefined },
      orderBy: [{ updatedAt: "desc" }],
      take: 30,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        source: true,
        status: true,
        budgetMin: true,
        budgetMax: true,
        preferredUnit: true,
        preferredView: true,
        urgency: true,
        language: true,
        updatedAt: true,
        notes: true,
        lastCallAt: true,
      },
    });

    const leadIds = leads.map((l) => l.id);
    const activities = await prisma.activity.findMany({
      where: {
        leadId: { in: leadIds },
        dueAt: { not: null },
        status: { in: ["pending", "in_progress", "completed"] },
      },
      orderBy: [{ dueAt: "asc" }],
      select: { id: true, leadId: true, type: true, status: true, title: true, dueAt: true },
      take: 500,
    });

    const byLead = new Map<string, { next: (typeof activities)[number] | null; latest: (typeof activities)[number] | null }>();
    for (const id of leadIds) byLead.set(id, { next: null, latest: null });
    const now = Date.now();
    for (const a of activities) {
      const bucket = byLead.get(a.leadId);
      if (!bucket) continue;
      if (a.dueAt) {
        const t = a.dueAt.getTime();
        if (t >= now && (bucket.next == null || t < bucket.next.dueAt!.getTime())) bucket.next = a;
        if (bucket.latest == null || t > bucket.latest.dueAt!.getTime()) bucket.latest = a;
      }
    }

    const scored = leads
      .map((l) => {
        const acts = byLead.get(l.id) ?? { next: null, latest: null };
        const res = scoreLead(
          {
            status: l.status,
            budgetMin: l.budgetMin,
            budgetMax: l.budgetMax,
            urgency: l.urgency,
            notes: l.notes,
            source: l.source,
            preferredUnit: l.preferredUnit,
            preferredView: l.preferredView,
            lastCallAt: l.lastCallAt,
            updatedAt: l.updatedAt,
          },
          {
            latestActivity: acts.latest
              ? {
                  type: acts.latest.type,
                  status: acts.latest.status,
                  title: acts.latest.title,
                  dueAt: acts.latest.dueAt,
                }
              : null,
            nextActivity: acts.next
              ? { type: acts.next.type, status: acts.next.status, title: acts.next.title, dueAt: acts.next.dueAt }
              : null,
          },
        );
        return { lead: l, score: res.score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ lead: l, score }) => ({
        id: l.id,
        name: l.name,
        phone: l.phone ?? undefined,
        email: l.email ?? undefined,
        source: l.source,
        status: l.status,
        score,
        budgetLabel: formatBudget(l.budgetMin, l.budgetMax),
        preferredUnit: l.preferredUnit ?? undefined,
        preferredView: l.preferredView ?? undefined,
        urgency: l.urgency,
        language: l.language,
        updatedLabel: "Recently",
      }));

    return NextResponse.json({
      data: scored,
    });
  } catch {
    return NextResponse.json(
      { error: { code: "HOT_LEADS_FAILED", message: "Unable to load hot leads." } },
      { status: 500 },
    );
  }
}
