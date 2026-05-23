type Trend = "up" | "down" | "flat";

export interface StatCardProps {
  title: string;
  value: number | string;
  change: number;
  trend: Trend;
  accentColor?: "gold" | "warning" | "success" | "error";
  icon?: React.ReactNode;
}

function trendLabel(trend: Trend) {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return "•";
}

function trendClasses(trend: Trend) {
  if (trend === "up") return "bg-success/15 text-success";
  if (trend === "down") return "bg-error/15 text-error";
  return "bg-navy/10 text-navy/70";
}

export function StatCard({
  title,
  value,
  change,
  trend,
  icon,
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-gold/20 bg-white p-6 shadow-[0_4px_24px_rgba(10,22,40,0.02)] relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gold/10 blur-2xl" />
      <div className="flex items-start justify-between gap-6">
        <div className="text-xs tracking-[0.2em] text-medium-grey uppercase">
          {title}
        </div>
        <div className="text-navy/40">{icon ?? null}</div>
      </div>
      <div className="mt-6 flex items-end gap-3">
        <div className="text-3xl font-medium tracking-tight text-navy">
          {value}
        </div>
        <div
          className={[
            "mb-1 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium",
            trendClasses(trend),
          ].join(" ")}
        >
          <span>{change >= 0 ? `+${change}` : change}%</span>
          <span aria-hidden="true">{trendLabel(trend)}</span>
        </div>
      </div>
    </div>
  );
}

