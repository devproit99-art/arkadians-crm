"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import type { Kpi, TeamRow } from "./admin-dashboard.types";

export const SOURCE_COLORS = ["#D4AF37", "#0A1628", "#91A4C0", "#5B728F", "#C9B26C", "#2E3B52", "#B7C2D0"];

export function toneBadge(tone: Kpi["tone"]) {
  if (tone === "success") return "bg-success/15 text-success border-success/25";
  if (tone === "warning") return "bg-warning/15 text-warning border-warning/25";
  if (tone === "gold") return "bg-gold/15 text-navy border-gold/25";
  return "bg-navy/5 text-navy/70 border-light-grey";
}

export function performanceBadge(performance: TeamRow["performance"]) {
  if (performance === "Excellent") return "border-success/25 bg-success/15 text-success";
  if (performance === "Active") return "border-warning/25 bg-warning/15 text-warning";
  if (performance === "Needs attention") return "border-error/25 bg-error/15 text-error";
  return "border-light-grey bg-navy/5 text-navy/70";
}

export function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="font-(--font-display) text-lg text-navy">{title}</h2>
        {subtitle ? <div className="mt-1 text-xs text-medium-grey">{subtitle}</div> : null}
      </div>
      {right ?? null}
    </div>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-light-grey bg-white shadow-card p-6">{children}</div>;
}

export function Collapsible({
  title,
  subtitle,
  defaultOpen = true,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-left flex-1"
          aria-expanded={open}
        >
          <div className="flex items-center gap-2">
            <div className="font-(--font-display) text-lg text-navy">{title}</div>
            <span className="text-xs text-medium-grey">{open ? "—" : "+"}</span>
          </div>
          {subtitle ? <div className="mt-1 text-xs text-medium-grey">{subtitle}</div> : null}
        </button>
        {actions ?? null}
      </div>
      {open ? <div className="mt-4">{children}</div> : null}
    </Card>
  );
}
