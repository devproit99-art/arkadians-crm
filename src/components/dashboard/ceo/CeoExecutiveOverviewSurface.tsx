"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CeoExecutiveFunnelChart, type FunnelDatum } from "@/components/dashboard/CeoExecutiveFunnelChart";
import {
  CeoPipelineStackedStrip,
  CeoStageDistributionPie,
  CeoWinRateOutcomeDonut,
  type PipelineCountsPlain,
} from "@/components/dashboard/ceo/CeoInteractiveCharts";

type Kpi = { title: string; value: string; badge: string };

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

function useCountUp(target: number, enabled: boolean, durationMs = 880) {
  const [v, setV] = useState(enabled ? 0 : target);
  useEffect(() => {
    if (!enabled || target <= 0) {
      setV(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) * (1 - t);
      setV(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled, durationMs]);
  return v;
}

function KpiCard({
  k,
  index,
  reduced,
}: {
  k: Kpi;
  index: number;
  reduced: boolean;
}) {
  const numeric = /^\d+$/.test(k.value.trim());
  const target = numeric ? parseInt(k.value, 10) : null;
  const countEnabled = Boolean(target != null && target >= 0 && !reduced);
  const animated = useCountUp(target ?? 0, countEnabled);
  const display = reduced || !numeric || target == null ? k.value : String(animated);

  return (
    <div
      className={reduced ? "" : "ceo-rise-motion"}
      style={reduced ? undefined : { animationDelay: `${index * 65}ms` }}
    >
      <div className="ceo-card-hover group rounded-xl border border-gold/25 bg-white/95 backdrop-blur-sm shadow-[0_6px_28px_rgba(10,22,40,0.05)] p-5 h-full transition-colors">
        <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">{k.title}</div>
        <div className="mt-3 text-xl sm:text-2xl font-semibold text-navy tabular-nums tracking-tight transition-transform duration-300 group-hover:translate-y-[-1px]">
          {display}
        </div>
        <div className="mt-2 text-xs text-medium-grey leading-snug">{k.badge}</div>
      </div>
    </div>
  );
}

function StatusTile({
  label,
  count,
  index,
  reduced,
  warn,
}: {
  label: string;
  count: number;
  index: number;
  reduced: boolean;
  warn?: boolean;
}) {
  const animated = useCountUp(count, !reduced);
  const emphasis = warn
    ? "border-warning/45 bg-gradient-to-br from-warning/8 to-white"
    : "border-light-grey/90 bg-gradient-to-br from-white to-cream/25";

  return (
    <div
      className={reduced ? "" : "ceo-rise-motion"}
      style={reduced ? undefined : { animationDelay: `${280 + index * 55}ms` }}
    >
      <div
        className={`ceo-card-hover rounded-xl border shadow-[0_4px_20px_rgba(10,22,40,0.04)] p-4 h-full transition-colors ${emphasis}`}
      >
        <div className="text-xs tracking-widest uppercase text-medium-grey">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-navy tabular-nums">{animated}</div>
      </div>
    </div>
  );
}

export function CeoExecutiveOverviewSurface({
  name,
  email,
  kpis,
  funnelData,
  pipelineCounts,
  winRatePct,
  projectedRevenueLabel,
  statusTiles,
}: {
  name: string;
  email: string;
  kpis: Kpi[];
  funnelData: FunnelDatum[];
  pipelineCounts: PipelineCountsPlain;
  winRatePct: number | null;
  projectedRevenueLabel: string;
  statusTiles: { status: string; label: string; count: number; warn?: boolean }[];
}) {
  const reduced = usePrefersReducedMotion();

  const heroBlock = (children: ReactNode, delay: number) => (
    <div
      className={reduced ? "" : "ceo-rise-motion"}
      style={reduced ? undefined : { animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );

  return (
    <div className="relative rounded-2xl border border-gold/25 bg-gradient-to-br from-white via-cream/35 to-white p-6 sm:p-8 lg:p-10 shadow-[0_14px_56px_rgba(10,22,40,0.08)] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 60% at 15% -15%, rgba(201,168,76,0.16), transparent 52%), radial-gradient(ellipse 60% 45% at 100% 10%, rgba(10,22,40,0.07), transparent 55%)",
        }}
      />

      <div className="relative z-10 space-y-10">
        {heroBlock(
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Executive</div>
              <h1 className="mt-2 font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">
                Executive overview
              </h1>
              <p className="mt-2 text-medium-grey max-w-2xl text-sm leading-relaxed">
                {name} · {email}. Live funnel, outcomes, and pipeline composition — boardroom ready.
              </p>
              <p className="mt-3 text-xs text-medium-grey">
                Indicative 3% of pipeline value:{" "}
                <span className="font-semibold text-navy">{projectedRevenueLabel}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded px-5 py-3 text-xs font-semibold tracking-[0.2em] uppercase text-white bg-[linear-gradient(135deg,#0A1628,#1a2c4e)] hover:shadow-[0_4px_15px_rgba(10,22,40,0.30)] transition-shadow inline-block text-center"
              >
                Command Centre
              </Link>
              <Link
                href="/pipeline"
                className="rounded-lg border border-light-grey bg-white/90 px-5 py-3 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors inline-block text-center"
              >
                Overall pipeline
              </Link>
              <Link
                href="/leads"
                className="rounded-lg border border-light-grey bg-white/90 px-5 py-3 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors inline-block text-center"
              >
                All prospects
              </Link>
            </div>
          </div>,
          0,
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((k, i) => (
            <KpiCard key={k.title} k={k} index={i} reduced={reduced} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <div
            className={reduced ? "lg:col-span-7" : "ceo-rise-motion lg:col-span-7"}
            style={reduced ? undefined : { animationDelay: "420ms" }}
          >
            <CeoExecutiveFunnelChart data={funnelData} className="border-gold/25 shadow-[0_8px_32px_rgba(10,22,40,0.05)] h-full" />
          </div>
          <div
            className={reduced ? "lg:col-span-5" : "ceo-rise-motion lg:col-span-5"}
            style={reduced ? undefined : { animationDelay: "480ms" }}
          >
            <CeoWinRateOutcomeDonut
              closedWon={pipelineCounts.closed_won}
              closedLost={pipelineCounts.closed_lost}
              winRatePct={winRatePct}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <div
            className={reduced ? "lg:col-span-6" : "ceo-rise-motion lg:col-span-6"}
            style={reduced ? undefined : { animationDelay: "540ms" }}
          >
            <CeoStageDistributionPie data={funnelData} />
          </div>
          <div
            className={reduced ? "lg:col-span-6" : "ceo-rise-motion lg:col-span-6"}
            style={reduced ? undefined : { animationDelay: "600ms" }}
          >
            <CeoPipelineStackedStrip counts={pipelineCounts} />
          </div>
        </div>

        <div>
          <div className={reduced ? "" : "ceo-rise-motion"} style={reduced ? undefined : { animationDelay: "660ms" }}>
            <h2 className="font-(--font-display) text-lg text-navy">Prospects by status</h2>
            <p className="mt-1 text-sm text-medium-grey max-w-2xl">
              Counts across every advisor. Lost and won reflect closed outcomes; middle stages are active work.
            </p>
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {statusTiles.map((t, i) => (
              <StatusTile
                key={t.status}
                label={t.label}
                count={t.count}
                index={i}
                reduced={reduced}
                warn={t.warn}
              />
            ))}
          </div>
        </div>

        <div
          className={[
            "rounded-xl border border-light-grey bg-cream/40 p-5 text-sm text-medium-grey backdrop-blur-sm",
            reduced ? "" : "ceo-rise-motion",
          ]
            .filter(Boolean)
            .join(" ")}
          style={reduced ? undefined : { animationDelay: "720ms" }}
        >
          <span className="font-semibold text-navy">Role boundary:</span> Admins use Command Centre, user management,
          and inventory admin. Your navigation is limited to executive dashboards, overall pipeline, prospects,
          activities, and construction — organisation-wide where data supports it.
        </div>
      </div>
    </div>
  );
}

