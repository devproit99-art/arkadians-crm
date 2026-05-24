import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatPkrCrore, getLeadBudgetValuePkr } from "@/lib/admin-metrics";
import { CeoExecutiveOverviewSurface } from "@/components/dashboard/ceo/CeoExecutiveOverviewSurface";
import type { FunnelDatum } from "@/components/dashboard/CeoExecutiveFunnelChart";
import type { PipelineCountsPlain } from "@/components/dashboard/ceo/CeoInteractiveCharts";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

const STATUS_ROWS = [
  { status: "new" as const, label: "New" },
  { status: "contacted" as const, label: "Contacted" },
  { status: "viewing_booked" as const, label: "Viewing booked" },
  { status: "negotiating" as const, label: "Negotiating" },
  { status: "closed_won" as const, label: "Won" },
  { status: "closed_lost" as const, label: "Lost" },
];

export default async function CeoPage() {
  const session = await getSession();
  if (!session) redirect(`/login?from=${encodeURIComponent("/ceo")}`);
  const isCeo = (session.role ?? "").toLowerCase() === "ceo";
  if (!isCeo) redirect("/");

  if (!hasDatabase()) {
    return (
      <div className="px-5 sm:px-8 py-8">
        <div className="w-full max-w-none">
          <div className="rounded-xl border border-light-grey bg-white shadow-card p-6">
            <div className="font-(--font-display) text-lg text-navy">CEO Profile</div>
            <p className="mt-2 text-sm text-medium-grey">
              Database is not configured. Set <span className="font-mono">DATABASE_URL</span> to enable pipeline
              reporting.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const [totalProspects, hotProspects, statusGroups, budgetRows] = await Promise.all([
    prisma.lead.count({ where: { deletedAt: null } }),
    prisma.lead.count({ where: { deletedAt: null, score: { gte: 75 } } }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.lead.findMany({
      where: { deletedAt: null },
      select: { budgetMin: true, budgetMax: true },
    }),
  ]);

  const statusCount = Object.fromEntries(statusGroups.map((g: any) => [g.status, g._count._all])) as Record<
    string,
    number
  >;
  const viewingsBooked = statusCount.viewing_booked ?? 0;
  const closedWon = statusCount.closed_won ?? 0;
  const closedLost = statusCount.closed_lost ?? 0;
  const activePipeline =
    (statusCount.new ?? 0) +
    (statusCount.contacted ?? 0) +
    (statusCount.viewing_booked ?? 0) +
    (statusCount.negotiating ?? 0);

  const pipelineValuePkr = budgetRows.reduce(
    (acc, l) => acc + getLeadBudgetValuePkr({ budgetMin: l.budgetMin, budgetMax: l.budgetMax }),
    BigInt(0),
  );
  const projectedRevenuePkr = (pipelineValuePkr * BigInt(3)) / BigInt(100);

  const decided = closedWon + closedLost;
  const winRatePct = decided > 0 ? Math.round((closedWon / decided) * 1000) / 10 : null;

  const kpis = [
    { title: "Total prospects", value: String(totalProspects), badge: "Registry" },
    { title: "Active pipeline", value: String(activePipeline), badge: "Open stages" },
    { title: "Hot prospects", value: String(hotProspects), badge: "Score 75+" },
    { title: "Pipeline value", value: formatPkrCrore(pipelineValuePkr), badge: "Est. budgets" },
    { title: "Viewings booked", value: String(viewingsBooked), badge: "Stage" },
    { title: "Won / Lost", value: `${closedWon} / ${closedLost}`, badge: winRatePct != null ? `Win rate ${winRatePct}%` : "Outcomes" },
  ];

  const funnelData: FunnelDatum[] = [
    { stage: "New", count: statusCount.new ?? 0 },
    { stage: "Contacted", count: statusCount.contacted ?? 0 },
    { stage: "Viewing", count: statusCount.viewing_booked ?? 0 },
    { stage: "Negotiating", count: statusCount.negotiating ?? 0 },
    { stage: "Won", count: statusCount.closed_won ?? 0 },
    { stage: "Lost", count: statusCount.closed_lost ?? 0 },
  ];

  const pipelineCountsPlain: PipelineCountsPlain = {
    new: statusCount.new ?? 0,
    contacted: statusCount.contacted ?? 0,
    viewing_booked: statusCount.viewing_booked ?? 0,
    negotiating: statusCount.negotiating ?? 0,
    closed_won: statusCount.closed_won ?? 0,
    closed_lost: statusCount.closed_lost ?? 0,
  };

  const statusTiles = STATUS_ROWS.map(({ status, label }) => ({
    status,
    label,
    count: statusCount[status] ?? 0,
    warn: status === "closed_lost",
  }));

  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <CeoExecutiveOverviewSurface
          name={session.name}
          email={session.email}
          kpis={kpis}
          funnelData={funnelData}
          pipelineCounts={pipelineCountsPlain}
          winRatePct={winRatePct}
          projectedRevenueLabel={formatPkrCrore(projectedRevenuePkr)}
          statusTiles={statusTiles}
        />
      </div>
    </div>
  );
}

