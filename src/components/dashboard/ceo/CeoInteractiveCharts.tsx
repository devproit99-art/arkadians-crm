"use client";

import {
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
import type { FunnelDatum } from "@/components/dashboard/CeoExecutiveFunnelChart";

export type PipelineCountsPlain = {
  new: number;
  contacted: number;
  viewing_booked: number;
  negotiating: number;
  closed_won: number;
  closed_lost: number;
};

const STAGE_COLORS = [
  "rgba(10,22,40,0.55)",
  "rgba(10,22,40,0.72)",
  "rgba(201,168,76,0.82)",
  "rgba(166,134,46,0.9)",
  "rgba(72,187,120,0.85)",
  "rgba(237,137,54,0.75)",
];

export function CeoWinRateOutcomeDonut({
  closedWon,
  closedLost,
  winRatePct,
}: {
  closedWon: number;
  closedLost: number;
  winRatePct: number | null;
}) {
  const decided = closedWon + closedLost;
  const pieData =
    decided > 0
      ? [
          { name: "Won", value: closedWon, fill: "rgba(72,187,120,0.92)" },
          { name: "Lost", value: closedLost, fill: "rgba(237,137,54,0.55)" },
        ]
      : [{ name: "No outcomes yet", value: 1, fill: "rgba(226,232,240,0.95)" }];

  return (
    <section className="rounded-lg border border-gold/20 bg-white shadow-[0_4px_24px_rgba(10,22,40,0.02)] p-6 sm:p-8 relative overflow-hidden h-full min-h-[280px] flex flex-col">
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-gold/8 blur-2xl pointer-events-none" />
      <div className="relative z-10 flex flex-col flex-1">
        <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Decided deals</div>
        <h2 className="mt-2 font-(--font-display) text-xl text-navy tracking-tight">Win / loss mix</h2>
        <p className="mt-1 text-sm text-medium-grey">Hover segments for counts — organisation totals.</p>
        <div className="mt-2 flex-1 min-h-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={decided > 0 ? 2 : 0}
                stroke="none"
              >
                {pieData.map((e, i) => (
                  <Cell key={`${e.name}-${i}`} fill={e.fill} stroke="rgba(255,255,255,0.85)" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [String(value ?? 0), String(name)]}
                contentStyle={{ borderRadius: 12, borderColor: "rgba(10,22,40,0.10)" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-6">
            <div className="text-center">
              <div className="text-3xl font-semibold text-navy tabular-nums tracking-tight">
                {winRatePct != null ? `${winRatePct}%` : "—"}
              </div>
              <div className="text-[10px] tracking-[0.22em] uppercase text-medium-grey mt-1">Win rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CeoStageDistributionPie({ data }: { data: FunnelDatum[] }) {
  const chartData = data.map((d, i) => ({
    name: d.stage,
    value: d.count,
    fill: STAGE_COLORS[i % STAGE_COLORS.length],
  }));

  return (
    <section className="rounded-lg border border-gold/20 bg-white shadow-[0_4px_24px_rgba(10,22,40,0.02)] p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute -top-12 right-0 w-44 h-44 rounded-full bg-navy/[0.04] blur-2xl pointer-events-none" />
      <div className="relative z-10">
        <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Distribution</div>
        <h2 className="mt-2 font-(--font-display) text-xl text-navy tracking-tight">Prospects by stage</h2>
        <p className="mt-1 text-sm text-medium-grey max-w-xl">
          Interactive pie — click legend or hover slices. Mirrors your funnel totals.
        </p>
        <div className="mt-4 h-64 w-full min-h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={88}
                labelLine={false}
                label={(props) => {
                  const pct = typeof props.percent === "number" ? props.percent : 0;
                  const name = String(props.name ?? "");
                  return pct > 0.06 ? `${name} ${(pct * 100).toFixed(0)}%` : "";
                }}
              >
                {chartData.map((e, i) => (
                  <Cell key={e.name} fill={e.fill} stroke="#fff" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [String(value ?? 0), "Prospects"]}
                contentStyle={{ borderRadius: 12, borderColor: "rgba(10,22,40,0.10)" }}
              />
              <Legend verticalAlign="bottom" height={28} formatter={(value) => <span className="text-xs text-navy">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

export function CeoPipelineStackedStrip({ counts }: { counts: PipelineCountsPlain }) {
  const row = {
    label: "Registry mix",
    new: counts.new,
    contacted: counts.contacted,
    viewing: counts.viewing_booked,
    negotiating: counts.negotiating,
    won: counts.closed_won,
    lost: counts.closed_lost,
  };

  const keys = [
    { key: "new" as const, label: "New", fill: STAGE_COLORS[0] },
    { key: "contacted" as const, label: "Contacted", fill: STAGE_COLORS[1] },
    { key: "viewing" as const, label: "Viewing", fill: STAGE_COLORS[2] },
    { key: "negotiating" as const, label: "Negotiating", fill: STAGE_COLORS[3] },
    { key: "won" as const, label: "Won", fill: STAGE_COLORS[4] },
    { key: "lost" as const, label: "Lost", fill: STAGE_COLORS[5] },
  ];

  return (
    <section className="rounded-lg border border-gold/20 bg-white shadow-[0_4px_24px_rgba(10,22,40,0.02)] p-6 sm:p-8 relative overflow-hidden">
      <div className="relative z-10">
        <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Composition</div>
        <h2 className="mt-2 font-(--font-display) text-xl text-navy tracking-tight">Single-line registry mix</h2>
        <p className="mt-1 text-sm text-medium-grey max-w-2xl">
          Stacked volume across all stages — scroll tooltips on mobile; hover each segment on desktop.
        </p>
        <div className="mt-6 h-24 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={[row]} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,22,40,0.06)" horizontal={false} />
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <YAxis type="category" dataKey="label" width={1} tick={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(201,168,76,0.06)" }}
                contentStyle={{ borderRadius: 12, borderColor: "rgba(10,22,40,0.10)" }}
              />
              {keys.map((k: any) => (
                <Bar
                  key={k.key}
                  stackId="mix"
                  dataKey={k.key}
                  name={k.label}
                  fill={k.fill}
                  radius={[0, 0, 0, 0]}
                  barSize={28}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-medium-grey">
          {keys.map((k: any) => (
            <span key={k.key} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: k.fill }} aria-hidden />
              {k.label}: <span className="font-medium text-navy tabular-nums">{(row as any)[k.key]}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

