"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Activity, Flame, PieChart as PieChartIcon, Users } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/StatCard";
import { CeoExecutiveFunnelChart, type FunnelDatum } from "@/components/dashboard/CeoExecutiveFunnelChart";
import {
  CeoPipelineStackedStrip,
  CeoStageDistributionPie,
  CeoWinRateOutcomeDonut,
  type PipelineCountsPlain,
} from "@/components/dashboard/ceo/CeoInteractiveCharts";

type StatsPlain = {
  totalLeads: number;
  hotLeads: number;
  viewingsBooked: number;
  conversionRate: number;
  monthOverMonth: number;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

function MotionBlock({
  reduced,
  delayMs,
  className = "",
  children,
}: {
  reduced: boolean;
  delayMs: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={reduced ? className : `ceo-rise-motion ${className}`.trim()}
      style={reduced ? undefined : { animationDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}

export function CeoCommandCentreExperience({
  stats,
  funnelChartData,
  pipelineCounts,
  winRatePct,
  children,
}: {
  stats: StatsPlain;
  funnelChartData: FunnelDatum[];
  pipelineCounts: PipelineCountsPlain;
  winRatePct: number | null;
  children: ReactNode;
}) {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="relative mt-8 rounded-2xl border border-gold/20 bg-gradient-to-br from-white via-white to-cream/40 p-6 sm:p-8 lg:p-10 shadow-[0_12px_48px_rgba(10,22,40,0.07)] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 10% -10%, rgba(201,168,76,0.14), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 0%, rgba(10,22,40,0.06), transparent 50%)",
        }}
      />
      <div className="relative z-10 space-y-8 lg:space-y-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {[
            {
              title: "Total leads",
              value: stats.totalLeads,
              change: stats.monthOverMonth,
              icon: <Users className="w-5 h-5" />,
              delay: 0,
            },
            {
              title: "Hot leads",
              value: stats.hotLeads,
              change: 0,
              icon: <Flame className="w-5 h-5" />,
              delay: 70,
            },
            {
              title: "Viewings booked",
              value: stats.viewingsBooked,
              change: 0,
              icon: <Activity className="w-5 h-5" />,
              delay: 140,
            },
            {
              title: "Conversion rate",
              value: `${stats.conversionRate.toFixed(1)}%`,
              change: 0,
              icon: <PieChartIcon className="w-5 h-5" />,
              delay: 210,
            },
          ].map((s) => (
            <MotionBlock key={s.title} reduced={reduced} delayMs={s.delay}>
              <div className="ceo-card-hover rounded-lg h-full overflow-hidden">
                <StatCard
                  title={s.title}
                  value={s.value}
                  change={s.change}
                  trend="up"
                  icon={s.icon}
                />
              </div>
            </MotionBlock>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <MotionBlock reduced={reduced} delayMs={280} className="lg:col-span-7">
            <CeoExecutiveFunnelChart data={funnelChartData} className="h-full border-gold/25 shadow-[0_8px_32px_rgba(10,22,40,0.04)]" />
          </MotionBlock>
          <MotionBlock reduced={reduced} delayMs={340} className="lg:col-span-5">
            <CeoWinRateOutcomeDonut
              closedWon={pipelineCounts.closed_won}
              closedLost={pipelineCounts.closed_lost}
              winRatePct={winRatePct}
            />
          </MotionBlock>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <MotionBlock reduced={reduced} delayMs={400} className="lg:col-span-6">
            <CeoStageDistributionPie data={funnelChartData} />
          </MotionBlock>
          <MotionBlock reduced={reduced} delayMs={460} className="lg:col-span-6">
            <div className="ceo-card-hover rounded-lg border border-gold/20 bg-white/90 backdrop-blur-sm h-full p-6 sm:p-8 flex flex-col">
              <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Pulse</div>
              <h2 className="mt-2 font-(--font-display) text-xl text-navy tracking-tight">Executive actions</h2>
              <p className="mt-2 text-sm text-medium-grey flex-1 leading-relaxed">
                Deep-dive the live board, scan every prospect profile, or return to the full executive overview —
                each opens in context with the same organisation-wide data.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/pipeline"
                  className="inline-flex rounded px-4 py-2.5 text-[11px] font-semibold tracking-[0.15em] uppercase text-white bg-[linear-gradient(135deg,#0A1628,#1a2c4e)] hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow"
                >
                  Pipeline
                </Link>
                <Link
                  href="/leads"
                  className="inline-flex rounded-lg border border-light-grey bg-cream/50 px-4 py-2.5 text-[11px] font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold transition-colors"
                >
                  Prospects
                </Link>
                <Link
                  href="/ceo"
                  className="inline-flex rounded-lg border border-light-grey bg-white px-4 py-2.5 text-[11px] font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold transition-colors"
                >
                  Overview
                </Link>
              </div>
            </div>
          </MotionBlock>
        </div>

        <MotionBlock reduced={reduced} delayMs={520}>
          <CeoPipelineStackedStrip counts={pipelineCounts} />
        </MotionBlock>

        <MotionBlock reduced={reduced} delayMs={580}>
          {children}
        </MotionBlock>
      </div>
    </div>
  );
}
