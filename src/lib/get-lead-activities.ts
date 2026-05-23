import { prisma } from "@/lib/prisma";
import { demoActivities } from "@/lib/demo-data";
import { formatDateTime } from "@/lib/datetime";

export type LeadActivityRow = {
  id: string;
  type: string;
  title: string;
  status: string;
  createdLabel: string;
  dueLabel: string | null;
};

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

/** Recent activities for a lead (DB or demo). No HTTP — for Server Components. */
export async function getRecentActivitiesForLead(
  leadId: string,
  take = 10,
): Promise<LeadActivityRow[]> {
  if (!hasDatabase()) {
    return demoActivities
      .filter((a) => a.leadId === leadId)
      .slice(0, take)
      .map((a) => ({
        id: a.id,
        type: a.type.replaceAll("_", " "),
        title: a.title,
        status: a.status.replaceAll("_", " "),
        createdLabel: a.createdAtLabel,
        dueLabel: a.dueLabel ?? null,
      }));
  }

  const rows = await prisma.activity.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      title: true,
      status: true,
      createdAt: true,
      dueAt: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    type: r.type.replaceAll("_", " "),
    title: r.title,
    status: r.status.replaceAll("_", " "),
    createdLabel: formatDateTime(r.createdAt),
    dueLabel: r.dueAt ? formatDateTime(r.dueAt) : null,
  }));
}
