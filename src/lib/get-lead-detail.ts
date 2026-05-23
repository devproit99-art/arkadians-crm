import { prisma } from "@/lib/prisma";
import { getLeadById, type DemoLead } from "@/lib/demo-data";
import { formatBudget } from "@/lib/budget";
import { formatDateTime } from "@/lib/datetime";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function budgetLabel(min?: bigint | null, max?: bigint | null) {
  return formatBudget(min ?? null, max ?? null);
}

/**
 * Load a single lead for the detail page or API. Avoids HTTP self-fetch from
 * Server Components (fixes "Failed to fetch" on localhost / Turbopack on Windows).
 */
export async function getLeadDetailById(id: string): Promise<DemoLead | null> {
  if (!hasDatabase()) {
    return getLeadById(id) ?? null;
  }

  const lead = await prisma.lead.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      source: true,
      status: true,
      score: true,
      budgetMin: true,
      budgetMax: true,
      preferredUnit: true,
      preferredView: true,
      urgency: true,
      language: true,
      notes: true,
      ownerId: true,
      owner: { select: { name: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!lead) return null;

  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone ?? undefined,
    email: lead.email ?? undefined,
    source: lead.source,
    status: lead.status,
    score: lead.score,
    budgetMin: lead.budgetMin != null ? Number(lead.budgetMin) : undefined,
    budgetMax: lead.budgetMax != null ? Number(lead.budgetMax) : undefined,
    budgetLabel: budgetLabel(lead.budgetMin, lead.budgetMax),
    preferredUnit: lead.preferredUnit ?? undefined,
    preferredView: lead.preferredView ?? undefined,
    urgency: lead.urgency,
    language: lead.language,
    notes: lead.notes ?? undefined,
    ownerId: lead.ownerId ?? undefined,
    ownerLabel: lead.owner?.name ?? undefined,
    updatedLabel: "Recently",
    createdAtLabel: formatDateTime(lead.createdAt),
    updatedAtLabel: formatDateTime(lead.updatedAt),
  };
}
