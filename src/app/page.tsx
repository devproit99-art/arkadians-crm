import { MobileNav } from "@/components/layout/MobileNav";
import { StatCard } from "@/components/dashboard/StatCard";
import { HotLeadsList } from "@/components/dashboard/HotLeadsList";
import { RecentCalls } from "@/components/dashboard/RecentCalls";
import { AIRecommendations } from "@/components/dashboard/AIRecommendations";
import { TargetGraph } from "@/components/dashboard/TargetGraph";
import { NotificationsPanel } from "@/components/dashboard/NotificationsPanel";
import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  Flame,
  PieChart,
  Users,
} from "lucide-react";
import type { DemoCall, DemoLead } from "@/lib/demo-data";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmployeeDashboardSwitcher } from "@/components/dashboard/EmployeeDashboardSwitcher";
import { CeoCommandCentreExperience } from "@/components/dashboard/ceo/CeoCommandCentreExperience";
import type { PipelineCountsPlain } from "@/components/dashboard/ceo/CeoInteractiveCharts";

type DashboardStats = {
  totalLeads: number;
  hotLeads: number;
  viewingsBooked: number;
  conversionRate: number;
  monthOverMonth: number;
};

type PipelineCounts = {
  new: number;
  contacted: number;
  viewing_booked: number;
  negotiating: number;
  closed_won: number;
  closed_lost: number;
};

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

async function getDashboardHotLeads(baseUrl: string): Promise<DemoLead[]> {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const res = await fetch(`${baseUrl}/api/dashboard/hot-leads`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  });
  if (!res.ok) return [];
  const json: unknown = await res.json();
  const data =
    json && typeof json === "object" && "data" in json ? (json as { data?: unknown }).data : null;
  return Array.isArray(data) ? (data as DemoLead[]) : [];
}

async function getDashboardRecentCalls(baseUrl: string, ownerId: string | null): Promise<DemoCall[]> {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const qs = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : "";
  const res = await fetch(`${baseUrl}/api/dashboard/recent-calls${qs}`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  });
  if (!res.ok) return [];
  const json: unknown = await res.json();
  const data =
    json && typeof json === "object" && "data" in json ? (json as { data?: unknown }).data : null;
  return Array.isArray(data) ? (data as DemoCall[]) : [];
}

async function getPipelineCounts(baseUrl: string, ownerId: string | null): Promise<PipelineCounts | null> {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const qs = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : "";
  const res = await fetch(`${baseUrl}/api/dashboard/pipeline-counts${qs}`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  });
  if (!res.ok) return null;
  const json: unknown = await res.json();
  const data =
    json && typeof json === "object" && "data" in json ? (json as { data?: unknown }).data : null;
  if (!data || typeof data !== "object") return null;
  const d = data as Partial<PipelineCounts>;
  return {
    new: Number(d.new ?? 0),
    contacted: Number(d.contacted ?? 0),
    viewing_booked: Number(d.viewing_booked ?? 0),
    negotiating: Number(d.negotiating ?? 0),
    closed_won: Number(d.closed_won ?? 0),
    closed_lost: Number(d.closed_lost ?? 0),
  };
}

async function getDashboardStats(baseUrl: string, ownerId: string | null): Promise<DashboardStats | null> {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const qs = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : "";
  const res = await fetch(`${baseUrl}/api/dashboard/stats${qs}`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  });
  if (!res.ok) return null;
  const json: unknown = await res.json();
  const data =
    json && typeof json === "object" && "data" in json ? (json as { data?: unknown }).data : null;
  if (!data || typeof data !== "object") return null;
  const d = data as Partial<DashboardStats>;
  return {
    totalLeads: Number(d.totalLeads ?? 0),
    hotLeads: Number(d.hotLeads ?? 0),
    viewingsBooked: Number(d.viewingsBooked ?? 0),
    conversionRate: Number(d.conversionRate ?? 0),
    monthOverMonth: Number(d.monthOverMonth ?? 0),
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ownerId?: string }>;
}) {
  const baseUrl = await getBaseUrl();
  const session = await getSession();
  const sp = await searchParams;

  const role = (session?.role ?? "").toLowerCase();
  const isAdmin = role === "admin";
  const isCeo = role === "ceo";
  const requestedOwnerId = sp.ownerId?.trim() || null;
  // CEO: organisation-wide dashboard (same APIs as admin overview without per-owner filter).
  const ownerId = isAdmin ? requestedOwnerId ?? session?.userId ?? null : isCeo ? null : session?.userId ?? null;

  const [stats, hotLeads, recentCalls, pipelineCounts, userOptions] = await Promise.all([
    getDashboardStats(baseUrl, ownerId),
    (async () => {
      const qs = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : "";
      const h = await headers();
      const cookie = h.get("cookie") ?? "";
      const res = await fetch(`${baseUrl}/api/dashboard/hot-leads${qs}`, {
        cache: "no-store",
        headers: cookie ? { cookie } : undefined,
      });
      if (!res.ok) return [];
      const json: unknown = await res.json();
      const data =
        json && typeof json === "object" && "data" in json ? (json as { data?: unknown }).data : null;
      return Array.isArray(data) ? (data as DemoLead[]) : [];
    })(),
    getDashboardRecentCalls(baseUrl, ownerId),
    getPipelineCounts(baseUrl, ownerId),
    isAdmin
      ? prisma.user.findMany({
          where: { status: "active", role: { in: ["manager", "sales_rep"] } },
          orderBy: [{ role: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
          take: 50,
        })
      : Promise.resolve([]),
  ]);

  const selectedName =
    isAdmin && ownerId ? userOptions.find((u: any) => u.id === ownerId)?.name ?? session?.name ?? "Dashboard" : session?.name ?? "Dashboard";

  const funnelChartData = [
    { stage: "New", count: pipelineCounts?.new ?? 0 },
    { stage: "Contacted", count: pipelineCounts?.contacted ?? 0 },
    { stage: "Viewing", count: pipelineCounts?.viewing_booked ?? 0 },
    { stage: "Negotiating", count: pipelineCounts?.negotiating ?? 0 },
    { stage: "Won", count: pipelineCounts?.closed_won ?? 0 },
    { stage: "Lost", count: pipelineCounts?.closed_lost ?? 0 },
  ];
  const activePipelineCount =
    (pipelineCounts?.new ?? 0) +
    (pipelineCounts?.contacted ?? 0) +
    (pipelineCounts?.viewing_booked ?? 0) +
    (pipelineCounts?.negotiating ?? 0);
  const decidedOutcomes = (pipelineCounts?.closed_won ?? 0) + (pipelineCounts?.closed_lost ?? 0);
  const winRatePct =
    decidedOutcomes > 0
      ? Math.round(((pipelineCounts?.closed_won ?? 0) / decidedOutcomes) * 1000) / 10
      : null;

  const pipelineCountsSafe: PipelineCountsPlain = pipelineCounts ?? {
    new: 0,
    contacted: 0,
    viewing_booked: 0,
    negotiating: 0,
    closed_won: 0,
    closed_lost: 0,
  };

  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/arkadians-clearlogo-alpha.png"
                alt="The Arkadians"
                width={520}
                height={180}
                priority
                className="h-12 w-auto"
              />
            </div>
            <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">
              {isCeo ? "Executive command surface" : "Private Dashboard"}
            </div>
            <h1 className="mt-2 font-(--font-display) text-4xl sm:text-5xl text-navy tracking-tight">
              {isCeo ? "Executive briefing for " : "Good morning, "}
              {selectedName?.split(" ")[0] ?? selectedName}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <MobileNav sessionUser={session} />
            {isAdmin && ownerId && userOptions.length > 0 ? (
              <EmployeeDashboardSwitcher
                options={userOptions}
                selectedOwnerId={ownerId}
              />
            ) : null}
            {!isCeo ? (
              <Link
                href="/leads/new"
                className="rounded px-5 py-3 text-xs font-semibold tracking-[0.2em] uppercase text-white bg-[linear-gradient(135deg,#0A1628,#1a2c4e)] hover:shadow-[0_4px_15px_rgba(10,22,40,0.30)] transition-shadow"
              >
                Register Prospect
              </Link>
            ) : (
              <Link
                href="/ceo"
                className="rounded px-5 py-3 text-xs font-semibold tracking-[0.2em] uppercase text-navy border border-light-grey bg-white hover:border-gold hover:bg-cream/40 transition-colors"
              >
                Full executive view
              </Link>
            )}
          </div>
        </div>

        {!isCeo ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Leads"
              value={stats?.totalLeads ?? 0}
              change={stats?.monthOverMonth ?? 0}
              trend="up"
              icon={<Users className="w-5 h-5" />}
            />
            <StatCard
              title="Hot Leads"
              value={stats?.hotLeads ?? 0}
              change={0}
              trend="up"
              icon={<Flame className="w-5 h-5" />}
            />
            <StatCard
              title="Viewings Booked"
              value={stats?.viewingsBooked ?? 0}
              change={0}
              trend="up"
              icon={<Activity className="w-5 h-5" />}
            />
            <StatCard
              title="Conversion Rate"
              value={`${(stats?.conversionRate ?? 0).toFixed(1)}%`}
              change={0}
              trend="up"
              icon={<PieChart className="w-5 h-5" />}
            />
          </div>
        ) : null}

        {isCeo ? (
          <CeoCommandCentreExperience
            stats={{
              totalLeads: stats?.totalLeads ?? 0,
              hotLeads: stats?.hotLeads ?? 0,
              viewingsBooked: stats?.viewingsBooked ?? 0,
              conversionRate: stats?.conversionRate ?? 0,
              monthOverMonth: stats?.monthOverMonth ?? 0,
            }}
            funnelChartData={funnelChartData}
            pipelineCounts={pipelineCountsSafe}
            winRatePct={winRatePct}
          >
            <div className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <HotLeadsList leads={hotLeads} />
                </div>
                <div className="lg:col-span-5">
                  <div className="ceo-card-hover rounded-lg border border-gold/25 bg-white/95 backdrop-blur-sm shadow-[0_4px_24px_rgba(10,22,40,0.04)] p-6 sm:p-8 h-full transition-colors">
                    <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">What matters now</div>
                    <h2 className="mt-2 font-(--font-display) text-lg text-navy">Executive snapshot</h2>
                    <ul className="mt-5 space-y-4 text-sm text-medium-grey">
                      <li className="flex justify-between gap-4 border-b border-light-grey/80 pb-3">
                        <span>Open pipeline (active stages)</span>
                        <span className="font-semibold text-navy tabular-nums">{activePipelineCount}</span>
                      </li>
                      <li className="flex justify-between gap-4 border-b border-light-grey/80 pb-3">
                        <span>Qualified &quot;hot&quot; prospects</span>
                        <span className="font-semibold text-navy tabular-nums">{stats?.hotLeads ?? 0}</span>
                      </li>
                      <li className="flex justify-between gap-4 border-b border-light-grey/80 pb-3">
                        <span>Viewings on the books</span>
                        <span className="font-semibold text-navy tabular-nums">{stats?.viewingsBooked ?? 0}</span>
                      </li>
                      <li className="flex justify-between gap-4 pb-1">
                        <span>Win rate (won vs decided)</span>
                        <span className="font-semibold text-navy tabular-nums">
                          {winRatePct != null ? `${winRatePct}%` : "—"}
                        </span>
                      </li>
                    </ul>
                    <p className="mt-5 text-xs text-medium-grey leading-relaxed">
                      Totals include every advisor. Use{" "}
                      <span className="font-medium text-navy">Pipeline</span> for the live board and{" "}
                      <span className="font-medium text-navy">Prospects</span> for profiles.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href="/pipeline"
                        className="inline-flex rounded px-4 py-2.5 text-[11px] font-semibold tracking-[0.15em] uppercase text-white bg-[linear-gradient(135deg,#0A1628,#1a2c4e)] hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow"
                      >
                        Open pipeline
                      </Link>
                      <Link
                        href="/leads"
                        className="inline-flex rounded-lg border border-light-grey bg-cream/40 px-4 py-2.5 text-[11px] font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold transition-colors"
                      >
                        All prospects
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <NotificationsPanel ownerId={ownerId} isAdmin={isAdmin} />

              <div className="ceo-card-hover rounded-lg border border-gold/25 bg-white/95 backdrop-blur-sm shadow-[0_4px_24px_rgba(10,22,40,0.04)] p-8 transition-colors">
                <div className="flex items-center justify-between gap-6">
                  <div className="font-(--font-display) text-navy text-lg">Pipeline overview</div>
                  <Link
                    href="/pipeline"
                    className="text-xs font-semibold tracking-[0.2em] uppercase text-gold hover:text-navy transition-colors"
                  >
                    View full funnel
                  </Link>
                </div>
                <div className="mt-6 flex items-center justify-between relative pt-4 pb-2 overflow-x-auto">
                  <div className="absolute top-1/2 left-0 w-full h-px bg-light-grey/80 -translate-y-1/2" />
                  {[
                    { label: "New", value: pipelineCountsSafe.new },
                    { label: "Contacted", value: pipelineCountsSafe.contacted },
                    { label: "Viewing", value: pipelineCountsSafe.viewing_booked },
                    { label: "Negotiating", value: pipelineCountsSafe.negotiating },
                    { label: "Won", value: pipelineCountsSafe.closed_won },
                  ].map((stage) => (
                    <div
                      key={stage.label}
                      className="relative bg-white/90 px-3 sm:px-4 flex flex-col items-center gap-3 shrink-0"
                    >
                      <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center border border-light-grey text-navy font-medium">
                        {stage.value}
                      </div>
                      <div className="text-xs tracking-[0.2em] uppercase text-medium-grey whitespace-nowrap">
                        {stage.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CeoCommandCentreExperience>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <HotLeadsList leads={hotLeads} />
              </div>
              <div className="lg:col-span-5">
                <RecentCalls calls={recentCalls} />
              </div>
            </div>

            <div className="mt-8">
              <NotificationsPanel ownerId={ownerId} isAdmin={isAdmin} />
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <AIRecommendations />
              </div>
              <div className="lg:col-span-7 flex flex-col gap-6">
                <TargetGraph />
                <div className="rounded-lg border border-gold/20 bg-white shadow-[0_4px_24px_rgba(10,22,40,0.02)] p-8">
                  <div className="flex items-center justify-between gap-6">
                    <div className="font-(--font-display) text-navy text-lg">
                      Pipeline Overview
                    </div>
                    <Link
                      href="/pipeline"
                      className="text-xs font-semibold tracking-[0.2em] uppercase text-gold hover:text-navy transition-colors"
                    >
                      View Full Funnel
                    </Link>
                  </div>

                  <div className="mt-6 flex items-center justify-between relative pt-4 pb-2">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-light-grey/80 -translate-y-1/2" />
                    {[
                      { label: "New", value: pipelineCounts?.new ?? 0 },
                      { label: "Contacted", value: pipelineCounts?.contacted ?? 0 },
                      { label: "Viewing", value: pipelineCounts?.viewing_booked ?? 0 },
                      { label: "Negotiating", value: pipelineCounts?.negotiating ?? 0 },
                      { label: "Won", value: pipelineCounts?.closed_won ?? 0 },
                    ].map((stage) => (
                      <div
                        key={stage.label}
                        className="relative bg-white px-4 flex flex-col items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center border border-light-grey text-navy font-medium">
                          {stage.value}
                        </div>
                        <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">
                          {stage.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

