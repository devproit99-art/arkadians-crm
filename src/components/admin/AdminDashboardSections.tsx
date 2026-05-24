"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, Collapsible, SectionHeader, SOURCE_COLORS, performanceBadge, toneBadge } from "./admin-dashboard.primitives";
import type { AdminDashboardClientProps, HotProspectRow, HotProspectSortBy } from "./admin-dashboard.types";

export function DashboardHero({ updatedLabel }: { updatedLabel: string }) {
  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Admin</div>
          <h1 className="mt-2 font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">Arkadians Command Centre</h1>
          <p className="mt-2 text-sm text-medium-grey max-w-3xl leading-relaxed">
            Private registry overview, sales pipeline, AI-qualified prospects and team performance
          </p>
          <div className="mt-3 text-xs text-medium-grey">Updated: {updatedLabel}</div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg border border-light-grey bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors"
          >
            Personal Command Centre
          </Link>
          <Link
            href="/pipeline/my-board"
            className="rounded-lg border border-light-grey bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors"
          >
            Employee Dashboards
          </Link>
          <Link
            href="/leads"
            className="rounded-lg border border-navy/20 bg-navy px-4 py-2.5 text-xs font-semibold tracking-[0.15em] uppercase text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow"
          >
            Prospects
          </Link>
        </div>
      </div>
    </Card>
  );
}

export function KpiGrid({ kpis }: { kpis: AdminDashboardClientProps["kpis"] }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((k: any) => (
        <div key={k.title} className="rounded-xl border border-light-grey bg-white shadow-card p-5 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-gold/10 blur-2xl" />
          <div className="text-xs tracking-[0.22em] uppercase text-medium-grey">{k.title}</div>
          <div className="mt-4 font-(--font-display) text-2xl text-navy">{k.value}</div>
          {k.badge ? (
            <div className={["mt-3 inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold", toneBadge(k.tone)].join(" ")}>
              {k.badge}
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}

export function PipelineAndRevenueSection({
  pipelineByStatus,
  sources,
  scoreDist,
  revenueTrend,
}: Pick<AdminDashboardClientProps, "pipelineByStatus" | "sources" | "scoreDist" | "revenueTrend">) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-6">
        <Card>
          <SectionHeader title="Pipeline by Status" subtitle="Counts and estimated pipeline value (crore)" />
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineByStatus} margin={{ top: 10, right: 10, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="rgba(10,22,40,0.08)" vertical={false} />
                <XAxis dataKey="status" tick={{ fill: "#5B728F", fontSize: 12 }} />
                <YAxis tick={{ fill: "#5B728F", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: "rgba(10,22,40,0.10)" }}
                  formatter={(v, n) => (n === "pipelineCrore" ? [`${Number(v).toFixed(1)} crore`, "Pipeline"] : [v, "Leads"])}
                />
                <Legend />
                <Bar dataKey="count" name="Leads" fill="rgba(10,22,40,0.75)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="pipelineCrore" name="Pipeline (crore)" fill="rgba(212,175,55,0.85)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <Card>
          <SectionHeader title="Lead Sources" subtitle="Volume + average score" />
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: "rgba(10,22,40,0.10)" }}
                  formatter={(_v, _n, item) => {
                    const payload = item?.payload as { count?: number; avgScore?: number; source?: string } | undefined;
                    if (!payload) return ["—", "Source"];
                    const count = Number(payload.count ?? 0);
                    const avgScore = Number(payload.avgScore ?? 0);
                    const source = payload.source ?? "Source";
                    return [`${count} leads · avg score ${avgScore.toFixed(0)}`, source];
                  }}
                />
                <Pie data={sources} dataKey="count" nameKey="source" innerRadius={55} outerRadius={80} paddingAngle={3}>
                  {sources.map((_, i) => (
                    <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-2">
            {sources.slice(0, 5).map((s, i) => (
              <div key={s.source} className="flex items-center justify-between text-xs text-medium-grey">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                  <span className="capitalize">{s.source.replaceAll("_", " ")}</span>
                </div>
                <span className="font-semibold text-navy">{s.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="lg:col-span-3 space-y-6">
        <Card>
          <SectionHeader title="Score Distribution" subtitle="Hot / Warm / Cold" />
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDist} margin={{ top: 10, right: 10, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="rgba(10,22,40,0.08)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fill: "#5B728F", fontSize: 12 }} />
                <YAxis tick={{ fill: "#5B728F", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "rgba(10,22,40,0.10)" }} />
                <Bar dataKey="count" fill="rgba(212,175,55,0.85)" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Projected Revenue Trend" subtitle="Projected from current pipeline" />
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(212,175,55,0.55)" />
                    <stop offset="100%" stopColor="rgba(212,175,55,0.05)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(10,22,40,0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#5B728F", fontSize: 12 }} />
                <YAxis tick={{ fill: "#5B728F", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: "rgba(10,22,40,0.10)" }}
                  formatter={(v) => [`PKR ${Number(v).toFixed(1)} crore`, "Projected"]}
                />
                <Area type="monotone" dataKey="valueCrore" stroke="rgba(212,175,55,0.95)" fill="url(#revFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </section>
  );
}

export function HotProspectsAndOpsSection({
  filteredHot,
  hotSearch,
  onlyAiQualified,
  sortBy,
  followUps,
  aiOps,
  setHotSearch,
  setOnlyAiQualified,
  setSortBy,
}: {
  filteredHot: HotProspectRow[];
  hotSearch: string;
  onlyAiQualified: boolean;
  sortBy: HotProspectSortBy;
  followUps: AdminDashboardClientProps["followUps"];
  aiOps: AdminDashboardClientProps["aiOps"];
  setHotSearch: (value: string) => void;
  setOnlyAiQualified: (next: boolean) => void;
  setSortBy: (next: HotProspectSortBy) => void;
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8">
        <Collapsible
          title="Top Hot Prospects"
          subtitle="Interactive: filter, sort, and collapse"
          actions={
            <div className="flex items-center gap-2">
              <input
                value={hotSearch}
                onChange={(e) => setHotSearch(e.target.value)}
                placeholder="Search…"
                className="h-9 w-40 rounded-lg border border-light-grey bg-white px-3 text-xs text-navy placeholder:text-medium-grey focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
              <button
                type="button"
                onClick={() => setOnlyAiQualified(!onlyAiQualified)}
                className={[
                  "h-9 rounded-lg border px-3 text-xs font-semibold transition-colors",
                  onlyAiQualified ? "border-gold bg-cream/60 text-navy" : "border-light-grey bg-white text-medium-grey hover:bg-cream/40 hover:text-navy",
                ].join(" ")}
              >
                AI qualified
              </button>
              <button
                type="button"
                onClick={() => setSortBy(sortBy === "score" ? "budget" : "score")}
                className="h-9 rounded-lg border border-light-grey bg-white px-3 text-xs font-semibold text-medium-grey hover:bg-cream/40 hover:text-navy transition-colors"
              >
                Sort: {sortBy === "score" ? "Score" : "Budget"}
              </button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs tracking-widest uppercase text-medium-grey">
                <tr className="border-b border-light-grey">
                  <th className="py-3 text-left">Prospect</th>
                  <th className="py-3 text-left">Budget</th>
                  <th className="py-3 text-left">Interest</th>
                  <th className="py-3 text-left">Score</th>
                  <th className="py-3 text-left">Status</th>
                  <th className="py-3 text-left">Source</th>
                  <th className="py-3 text-left">Next Action</th>
                </tr>
              </thead>
              <tbody className="text-navy">
                {filteredHot.map((r: any) => (
                  <tr key={r.id} className="border-b border-light-grey/70">
                    <td className="py-3">
                      <Link href={`/leads/${r.id}`} className="font-semibold hover:text-gold transition-colors">
                        {r.name}
                      </Link>
                      {r.aiQualified ? (
                        <div className="mt-1">
                          <span className="inline-flex items-center rounded-full border border-success/25 bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                            AI qualified
                          </span>
                        </div>
                      ) : null}
                      {r.callbackLabel ? <div className="mt-1 text-[11px] text-medium-grey">Callback: {r.callbackLabel}</div> : null}
                    </td>
                    <td className="py-3">{r.budget}</td>
                    <td className="py-3">{r.interest}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center rounded-full border border-light-grey bg-cream/30 px-2 py-1 text-xs font-semibold">
                        {r.score}
                      </span>
                    </td>
                    <td className="py-3">{r.status}</td>
                    <td className="py-3">{r.source}</td>
                    <td className="py-3 text-medium-grey">{r.nextAction}</td>
                  </tr>
                ))}
                {filteredHot.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-medium-grey">
                      No prospects match your filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Collapsible>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <Collapsible title="Follow-ups / Callbacks" subtitle="Upcoming pending activities" defaultOpen>
          {followUps.length === 0 ? (
            <p className="text-sm text-medium-grey">No follow-ups due.</p>
          ) : (
            <ul className="space-y-3">
              {followUps.map((a: any) => (
                <li key={a.id} className="rounded-lg border border-light-grey bg-cream/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-wider text-medium-grey">{a.status}</div>
                  <div className="mt-1 text-sm font-semibold text-navy">{a.leadName}</div>
                  <div className="mt-1 text-xs text-medium-grey leading-relaxed">{a.title}</div>
                  {a.dueLabel ? <div className="mt-1 text-xs text-medium-grey">Due {a.dueLabel}</div> : null}
                  {a.ownerLabel ? <div className="mt-1 text-[11px] text-medium-grey">Owner {a.ownerLabel}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </Collapsible>

        <Collapsible title="AI Operations" subtitle="System is operational" defaultOpen>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {aiOps.map((x: any) => (
              <div key={x.k} className="rounded-lg border border-light-grey bg-cream/20 px-4 py-3">
                <div className="text-xs text-medium-grey">{x.k}</div>
                <div className="mt-1 font-(--font-display) text-xl text-navy">{x.v}</div>
              </div>
            ))}
          </div>
          <ul className="mt-4 text-xs text-medium-grey space-y-1.5">
            {[
              "Voice agent qualifies enquiries",
              "Transcripts saved to client profile",
              "Callback times extracted",
              "Follow-up activity created",
              "WhatsApp/email drafting ready",
            ].map((t: any) => (
              <li key={t} className="flex gap-2">
                <span className="text-gold">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Collapsible>
      </div>
    </section>
  );
}

export function BookingsSection({ bookings }: { bookings: AdminDashboardClientProps["bookings"] }) {
  return (
    <Collapsible title="Bookings & Payment Snapshot" subtitle="Demo snapshot derived from CRM pipeline (no accounting schema yet)" defaultOpen={false}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs tracking-widest uppercase text-medium-grey">
            <tr className="border-b border-light-grey">
              <th className="py-3 text-left">Client</th>
              <th className="py-3 text-left">Interest</th>
              <th className="py-3 text-left">Booking Status</th>
              <th className="py-3 text-left">Paid Status</th>
              <th className="py-3 text-left">Estimated Value</th>
              <th className="py-3 text-left">Outstanding / Next Step</th>
            </tr>
          </thead>
          <tbody className="text-navy">
            {bookings.map((r: any) => (
              <tr key={r.id} className="border-b border-light-grey/70">
                <td className="py-3 font-semibold">{r.client}</td>
                <td className="py-3">{r.interest}</td>
                <td className="py-3">{r.bookingStatus}</td>
                <td className="py-3">{r.paidStatus}</td>
                <td className="py-3">{r.estimatedValue}</td>
                <td className="py-3 text-medium-grey">{r.nextStep}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Collapsible>
  );
}

export function TeamAndAdvisorSection({
  team,
  advisorPipeline,
}: Pick<AdminDashboardClientProps, "team" | "advisorPipeline">) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8">
        <Collapsible title="Team Performance" subtitle="Advisor metrics and pipeline impact" defaultOpen>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs tracking-widest uppercase text-medium-grey">
                <tr className="border-b border-light-grey">
                  <th className="py-3 text-left">Advisor</th>
                  <th className="py-3 text-left">Role</th>
                  <th className="py-3 text-left">Assigned Leads</th>
                  <th className="py-3 text-left">Hot Leads</th>
                  <th className="py-3 text-left">Calls</th>
                  <th className="py-3 text-left">Follow-ups Due</th>
                  <th className="py-3 text-left">Viewings</th>
                  <th className="py-3 text-left">Pipeline Value</th>
                  <th className="py-3 text-left">Performance</th>
                </tr>
              </thead>
              <tbody className="text-navy">
                {team.map((r: any) => (
                  <tr key={r.name} className="border-b border-light-grey/70">
                    <td className="py-3 font-semibold">{r.name}</td>
                    <td className="py-3 text-medium-grey">{r.role}</td>
                    <td className="py-3">{r.assigned}</td>
                    <td className="py-3">{r.hot}</td>
                    <td className="py-3">{r.calls}</td>
                    <td className="py-3">{r.followUpsDue}</td>
                    <td className="py-3">{r.viewings}</td>
                    <td className="py-3">{r.pipelineValue}</td>
                    <td className="py-3">
                      <span className={["inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold", performanceBadge(r.performance)].join(" ")}>
                        {r.performance}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Collapsible>
      </div>

      <div className="lg:col-span-4">
        <Card>
          <SectionHeader title="Advisor Pipeline Value" subtitle="Estimated pipeline value (crore)" />
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={advisorPipeline} margin={{ top: 10, right: 10, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="rgba(10,22,40,0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#5B728F", fontSize: 12 }} />
                <YAxis tick={{ fill: "#5B728F", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: "rgba(10,22,40,0.10)" }}
                  formatter={(v) => [`${Number(v).toFixed(1)} crore`, "Pipeline"]}
                />
                <Bar dataKey="valueCrore" fill="rgba(212,175,55,0.85)" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </section>
  );
}

