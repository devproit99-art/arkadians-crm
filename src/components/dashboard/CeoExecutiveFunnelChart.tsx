"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BAR_COLORS = [
  "rgba(10,22,40,0.55)",
  "rgba(10,22,40,0.68)",
  "rgba(201,168,76,0.75)",
  "rgba(166,134,46,0.85)",
  "rgba(34,139,87,0.75)",
  "rgba(180,90,70,0.65)",
];

export type FunnelDatum = { stage: string; count: number };

export function CeoExecutiveFunnelChart({
  data,
  className = "",
}: {
  data: FunnelDatum[];
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d: any) => d.count));

  return (
    <section
      className={`rounded-lg border border-gold/20 bg-white shadow-[0_4px_24px_rgba(10,22,40,0.02)] p-6 sm:p-8 relative overflow-hidden ${className}`}
    >
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
      <div className="relative z-10">
        <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Organisation-wide</div>
        <h2 className="mt-2 font-(--font-display) text-xl text-navy tracking-tight">
          Prospect funnel
        </h2>
        <p className="mt-1 text-sm text-medium-grey max-w-2xl">
          Live counts by stage across every advisor — use Pipeline for the full board.
        </p>
        <div className="mt-6 h-72 w-full min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
              <CartesianGrid stroke="rgba(10,22,40,0.08)" vertical={false} />
              <XAxis
                dataKey="stage"
                tick={{ fill: "#5B728F", fontSize: 11 }}
                interval={0}
                angle={-18}
                textAnchor="end"
                height={56}
              />
              <YAxis
                tick={{ fill: "#5B728F", fontSize: 12 }}
                allowDecimals={false}
                domain={[0, Math.ceil(max * 1.15)]}
              />
              <Tooltip
                cursor={{ fill: "rgba(201,168,76,0.08)" }}
                contentStyle={{
                  borderRadius: 12,
                  borderColor: "rgba(10,22,40,0.10)",
                  fontSize: 13,
                }}
                formatter={(value) => [String(value ?? 0), "Prospects"]}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Count">
                {data.map((row, i) => (
                  <Cell key={row.stage} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

