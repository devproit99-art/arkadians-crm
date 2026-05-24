import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/datetime";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { scoreLead } from "@/lib/lead-scoring";
import { ActivityOversightPanel } from "@/components/admin/ActivityOversightPanel";
import {
  deriveBookingStatus,
  deriveNextAction,
  deriveOutstandingNextStep,
  derivePaidStatus,
  formatPkrCrore,
  getLeadBudgetValuePkr,
  getLeadInterest,
  performanceBadge,
  stableAdvisorForLead,
  type AdminActivityRow,
  type AdminCallLogRow,
  type AdminLeadRow,
} from "@/lib/admin-metrics";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function badgeClasses(kind: "success" | "warning" | "slate") {
  if (kind === "success") return "bg-success/15 text-success border-success/20";
  if (kind === "warning") return "bg-warning/15 text-warning border-warning/25";
  return "bg-navy/5 text-navy/70 border-light-grey";
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect(`/login?from=${encodeURIComponent("/admin")}`);
  const isAdmin = (session.role ?? "").toLowerCase() === "admin";
  if (!isAdmin) redirect("/");

  const now = new Date();

  if (!hasDatabase()) {
    return (
      <div className="px-5 sm:px-8 py-8">
        <div className="w-full max-w-none">
          <div className="rounded-xl border border-light-grey bg-white shadow-card p-6">
            <div className="font-(--font-display) text-lg text-navy">Arkadians Command Centre</div>
            <p className="mt-2 text-sm text-medium-grey">
              Database is not configured. Set <span className="font-mono">DATABASE_URL</span> to enable admin
              reporting.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const [leads, activities, callLogs, totalActivitiesCount] = await Promise.all([
    prisma.lead.findMany({
      where: { deletedAt: null },
      orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        status: true,
        source: true,
        score: true,
        budgetMin: true,
        budgetMax: true,
        preferredUnit: true,
        preferredView: true,
        urgency: true,
        notes: true,
        lastCallAt: true,
        ownerId: true,
        owner: { select: { name: true } },
      },
      take: 400,
    }),
    prisma.activity.findMany({
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      where: { status: "pending" },
      select: {
        id: true,
        leadId: true,
        title: true,
        status: true,
        type: true,
        dueAt: true,
        createdAt: true,
        userId: true,
        lead: { select: { name: true } },
        user: { select: { name: true } },
      },
      take: 40,
    }),
    prisma.callLog.findMany({
      orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        leadId: true,
        status: true,
        transcript: true,
        startedAt: true,
        createdAt: true,
      },
      take: 500,
    }),
    prisma.activity.count({}),
  ]);

  const leadRows: AdminLeadRow[] = leads.map((l: any) => ({
    id: l.id,
    name: l.name,
    status: l.status,
    source: l.source,
    score: scoreLead({
      status: l.status,
      budgetMin: l.budgetMin,
      budgetMax: l.budgetMax,
      urgency: l.urgency,
      notes: l.notes,
      source: l.source,
      preferredUnit: l.preferredUnit,
      preferredView: l.preferredView,
      lastCallAt: l.lastCallAt,
      updatedAt: null,
    }).score,
    budgetMin: l.budgetMin ?? null,
    budgetMax: l.budgetMax ?? null,
    preferredUnit: l.preferredUnit ?? null,
    preferredView: l.preferredView ?? null,
    urgency: l.urgency,
    notes: l.notes ?? null,
    lastCallAt: l.lastCallAt ?? null,
    ownerId: l.ownerId ?? null,
    ownerName: l.owner?.name ?? null,
  }));

  const activityRows: (AdminActivityRow & { leadName?: string | null; userName?: string | null })[] = activities.map(
    (a: any) => ({
      id: a.id,
      leadId: a.leadId,
      title: a.title,
      status: a.status,
      type: a.type,
      dueAt: a.dueAt ?? null,
      createdAt: a.createdAt,
      userId: a.userId ?? null,
      leadName: a.lead?.name ?? null,
      userName: a.user?.name ?? null,
    }),
  );

  const callLogRows: AdminCallLogRow[] = callLogs.map((c: any) => ({
    id: c.id,
    leadId: c.leadId,
    status: c.status,
    transcript: c.transcript ?? null,
    startedAt: c.startedAt ?? null,
    createdAt: c.createdAt,
  }));

  const totalProspects = leadRows.length;
  const hotProspects = leadRows.filter((l) => l.score >= 75).length;
  const pipelineValuePkr = leadRows.reduce((acc, l) => acc + getLeadBudgetValuePkr(l), BigInt(0));
  const projectedRevenuePkr = (pipelineValuePkr * BigInt(3)) / BigInt(100); // 3% projected
  const followUpsDue = activityRows.filter((a: any) => a.status === "pending").length;
  const viewingsBooked = leadRows.filter((l) => l.status === "viewing_booked").length;
  const aiCallsLogged = callLogRows.length;

  const byLeadPendingActivity = new Map<string, AdminActivityRow>();
  for (const a of activityRows) {
    if (!byLeadPendingActivity.has(a.leadId)) byLeadPendingActivity.set(a.leadId, a);
  }

  const conversionFocus = leadRows.filter((l) => {
    if (l.score < 75) return false;
    const hasFollowUp = byLeadPendingActivity.has(l.id);
    const hasRecentCall = l.lastCallAt ? now.getTime() - l.lastCallAt.getTime() < 1000 * 60 * 60 * 24 * 14 : false;
    const hasAnyCallLog = callLogRows.some((c) => c.leadId === l.id);
    return hasFollowUp || hasRecentCall || hasAnyCallLog;
  }).length;

  const pipelineByStatus = Object.entries(
    leadRows.reduce<Record<string, number>>((acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label: label.replaceAll("_", " "), value }));

  const sourcePerformance = Object.entries(
    leadRows.reduce<Record<string, { count: number; scoreSum: number }>>((acc, l) => {
      const k = l.source;
      const prev = acc[k] ?? { count: 0, scoreSum: 0 };
      acc[k] = { count: prev.count + 1, scoreSum: prev.scoreSum + l.score };
      return acc;
    }, {}),
  )
    .map(([source, v]) => ({
      source,
      count: v.count,
      avgScore: v.count ? v.scoreSum / v.count : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  const hot = leadRows.filter((l) => l.score >= 75).length;
  const warm = leadRows.filter((l) => l.score >= 45 && l.score <= 74).length;
  const cold = Math.max(0, totalProspects - hot - warm);

  const revenueTrend = [
    { label: "This month", value: 3.0 },
    { label: "Next month", value: 3.6 },
    { label: "Quarter", value: 4.2 },
  ];

  const topHot = leadRows
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((l: any) => {
      const pending = byLeadPendingActivity.get(l.id) ?? null;
      const hasCallback = Boolean(pending?.dueAt);
      return {
        lead: l,
        nextAction: deriveNextAction({ lead: l, hasCallback }),
        hasTranscript: callLogRows.some((c) => c.leadId === l.id && (c.transcript?.trim() ?? "").length > 0),
      };
    });

  const upcoming = activityRows.slice(0, 10);

  const showSuggestedFollowUps = totalActivitiesCount === 0;
  const suggestedFollowUps = showSuggestedFollowUps
    ? topHot.slice(0, 6).map((x, idx) => ({
        id: `suggested_${idx}`,
        leadName: x.lead.name,
        title: x.nextAction,
        dueLabel: "Next 24 hours",
        status: "pending",
        advisor: stableAdvisorForLead(x.lead).advisorName,
      }))
    : [];

  const bookingSnapshot = leadRows
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((l: any) => {
      const bookingStatus = deriveBookingStatus(l);
      const paidStatus = derivePaidStatus(bookingStatus);
      return {
        lead: l,
        bookingStatus,
        paidStatus,
        next: deriveOutstandingNextStep(bookingStatus),
      };
    });

  const aiBrowserCompleted = callLogRows.filter((c) => c.status === "browser_test_completed").length;
  const transcriptsSaved = callLogRows.filter((c) => (c.transcript?.trim() ?? "").length > 0).length;
  const callbackTasksCreated = activityRows.filter((a: any) => a.type === "follow_up").length;
  const hotLeadsIdentified = hotProspects;
  const draftsDemo = Math.min(hotProspects, 12);

  // Team performance
  const users = await prisma.user.findMany({
    where: { status: "active" },
    select: { id: true, name: true, role: true },
    take: 20,
  });
  const userById = new Map(users.map((u: any) => [u.id, u]));

  const leadsByAdvisor = new Map<string, AdminLeadRow[]>();
  for (const l of leadRows) {
    const advisor = l.ownerId && (userById.get(l.ownerId) as any)?.name ? userById.get(l.ownerId)!.name : stableAdvisorForLead(l).advisorName;
    const arr = leadsByAdvisor.get(advisor) ?? [];
    arr.push(l);
    leadsByAdvisor.set(advisor, arr);
  }

  const activitiesByAdvisor = new Map<string, AdminActivityRow[]>();
  for (const a of activityRows) {
    const advisor = a.userId && userById.get(a.userId)?.name ? userById.get(a.userId)!.name : stableAdvisorForLead({ id: a.leadId, ownerId: null, ownerName: null }).advisorName;
    const arr = activitiesByAdvisor.get(advisor) ?? [];
    arr.push(a);
    activitiesByAdvisor.set(advisor, arr);
  }

  const callsByAdvisor = new Map<string, AdminCallLogRow[]>();
  for (const c of callLogRows) {
    const lead = leadRows.find((l) => l.id === c.leadId);
    const advisor = lead ? stableAdvisorForLead(lead).advisorName : stableAdvisorForLead({ id: c.leadId, ownerId: null, ownerName: null }).advisorName;
    const arr = callsByAdvisor.get(advisor) ?? [];
    arr.push(c);
    callsByAdvisor.set(advisor, arr);
  }

  const advisorNames = Array.from(new Set([...leadsByAdvisor.keys(), ...activitiesByAdvisor.keys(), ...callsByAdvisor.keys()])).slice(0, 8);
  const advisorRows = advisorNames
    .map((name) => {
      const ownedLeads = leadsByAdvisor.get(name) ?? [];
      const ownedActs = activitiesByAdvisor.get(name) ?? [];
      const ownedCalls = callsByAdvisor.get(name) ?? [];
      const pipeline = ownedLeads.reduce((acc, l) => acc + getLeadBudgetValuePkr(l), BigInt(0));
      const hotCount = ownedLeads.filter((l) => l.score >= 75).length;
      const viewings = ownedLeads.filter((l) => l.status === "viewing_booked").length;
      const due = ownedActs.filter((a: any) => a.status === "pending").length;
      const completed = 0;
      const badge = performanceBadge({
        pipelineValuePkr: pipeline,
        hotLeads: hotCount,
        followUpsDue: due,
        followUpsCompleted: completed,
        callsLogged: ownedCalls.length,
      });

      const role = users.find((u) => u.name === name)?.role ?? "sales_rep";
      const prettyRole =
        role === "admin" ? "Admin" : role === "manager" ? "Sales Manager" : role === "sales_rep" ? "Property Consultant" : "Viewer";

      return {
        name,
        role: prettyRole,
        assigned: ownedLeads.length,
        hot: hotCount,
        calls: ownedCalls.length,
        due,
        viewings,
        pipeline,
        badge,
      };
    })
    .sort((a, b) => Number((b.pipeline - a.pipeline) / BigInt(1_000_000)));

  const advisorPipelineChart = advisorRows.slice(0, 6).map((r: any) => ({
    label: r.name.split(" ")[0] ?? r.name,
    valueCrore: Number(r.pipeline / BigInt(10_000_000)),
  }));

  const pipelineByStatusChart = Object.entries(
    leadRows.reduce<Record<string, { count: number; pipeline: bigint }>>((acc, l) => {
      const prev = acc[l.status] ?? { count: 0, pipeline: BigInt(0) };
      acc[l.status] = { count: prev.count + 1, pipeline: prev.pipeline + getLeadBudgetValuePkr(l) };
      return acc;
    }, {}),
  )
    .map(([status, v]) => ({
      status: status.replaceAll("_", " "),
      count: v.count,
      pipelineCrore: Number(v.pipeline / BigInt(10_000_000)),
    }))
    .sort((a, b) => b.pipelineCrore - a.pipelineCrore);

  const sourcesChart = sourcePerformance.map((s: any) => ({
    source: s.source.replaceAll("_", " "),
    count: s.count,
    avgScore: s.avgScore,
  }));

  const scoreDistChart = [
    { bucket: "Hot" as const, count: hot },
    { bucket: "Warm" as const, count: warm },
    { bucket: "Cold" as const, count: cold },
  ];

  const revenueTrendChart = revenueTrend.map((d: any) => ({
    label: d.label,
    valueCrore: Number(projectedRevenuePkr / BigInt(10_000_000)) * (d.value / 3.0),
  }));

  const kpis = [
    { title: "Total Prospects", value: String(totalProspects), badge: "+12% projected", tone: "gold" as const },
    { title: "Hot Prospects", value: String(hotProspects), badge: "AI-qualified focus", tone: "success" as const },
    { title: "Pipeline Value", value: formatPkrCrore(pipelineValuePkr), badge: "Live", tone: "gold" as const },
    { title: "Projected Revenue", value: formatPkrCrore(projectedRevenuePkr), badge: "Projected", tone: "warning" as const },
    { title: "Follow-ups Due", value: String(followUpsDue), badge: "Pending", tone: "warning" as const },
    { title: "Viewings Booked", value: String(viewingsBooked), badge: "Active", tone: "success" as const },
    { title: "AI Calls Logged", value: String(aiCallsLogged), badge: "Operational", tone: "slate" as const },
    { title: "Conversion Focus", value: String(conversionFocus), badge: "Hot + callback", tone: "gold" as const },
  ];

  const topHotRows = topHot.map((r: any) => {
    const pending = byLeadPendingActivity.get(r.lead.id) ?? null;
    return {
      id: r.lead.id,
      name: r.lead.name,
      budget: formatPkrCrore(getLeadBudgetValuePkr(r.lead)),
      interest: getLeadInterest(r.lead),
      score: r.lead.score,
      status: r.lead.status.replaceAll("_", " "),
      source: r.lead.source.replaceAll("_", " "),
      nextAction: r.nextAction,
      aiQualified: r.hasTranscript,
      callbackLabel: pending?.dueAt ? formatDateTime(pending.dueAt) : null,
    };
  });

  const followUpRows = (showSuggestedFollowUps ? suggestedFollowUps : upcoming).slice(0, 12).map((a: any) => ({
    id: a.id,
    leadName: a.leadName ?? a.leadName,
    title: a.title ?? a.title,
    dueLabel: a.dueAt ? formatDateTime(a.dueAt) : a.dueLabel ?? null,
    status: (a.status ?? "pending").replaceAll("_", " "),
    ownerLabel: a.userName ?? a.advisor ?? null,
  }));

  const bookingRows = bookingSnapshot.map((r: any) => ({
    id: r.lead.id,
    client: r.lead.name,
    interest: getLeadInterest(r.lead),
    bookingStatus: r.bookingStatus,
    paidStatus: r.paidStatus,
    estimatedValue: formatPkrCrore(getLeadBudgetValuePkr(r.lead)),
    nextStep: r.next,
  }));

  const teamRows = advisorRows.map((r: any) => ({
    name: r.name,
    role: r.role,
    assigned: r.assigned,
    hot: r.hot,
    calls: r.calls,
    followUpsDue: r.due,
    viewings: r.viewings,
    pipelineValue: formatPkrCrore(r.pipeline),
    performance: r.badge,
  }));

  const aiOps = [
    { k: "AI browser tests completed", v: aiBrowserCompleted },
    { k: "AI call attempts", v: aiCallsLogged },
    { k: "Transcripts saved", v: transcriptsSaved },
    { k: "Callback tasks created", v: callbackTasksCreated },
    { k: "Hot leads identified", v: hotLeadsIdentified },
    { k: "WhatsApp/email drafts", v: draftsDemo },
  ];

  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <ActivityOversightPanel />
        <AdminDashboardClient
          updatedLabel={formatDateTime(now)}
          kpis={kpis}
          pipelineByStatus={pipelineByStatusChart}
          sources={sourcesChart}
          scoreDist={scoreDistChart}
          revenueTrend={revenueTrendChart}
          topHot={topHotRows}
          followUps={followUpRows}
          bookings={bookingRows}
          aiOps={aiOps}
          team={teamRows}
          advisorPipeline={advisorPipelineChart}
        />
      </div>
    </div>
  );
}





