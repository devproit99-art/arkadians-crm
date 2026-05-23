"use client";

import { useMemo } from "react";
import Link from "next/link";

type BonusTier = {
  label: string;
  thresholdPct: number;
  bonusLabel: string;
};

const tiers: BonusTier[] = [
  { label: "Tier I", thresholdPct: 80, bonusLabel: "PKR 150,000" },
  { label: "Tier II", thresholdPct: 100, bonusLabel: "PKR 350,000" },
  { label: "Tier III", thresholdPct: 120, bonusLabel: "PKR 750,000" },
];

export function TargetGraph({
  monthLabel = "April",
  achieved = 8_400_000,
  target = 12_000_000,
}: {
  monthLabel?: string;
  achieved?: number;
  target?: number;
}) {
  const pct = useMemo(() => {
    if (target <= 0) return 0;
    return Math.round((achieved / target) * 100);
  }, [achieved, target]);

  const cappedPct = Math.min(140, Math.max(0, pct));

  return (
    <section className="rounded-lg border border-gold/20 bg-white shadow-[0_4px_24px_rgba(10,22,40,0.02)] p-8 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-gold/10 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">
              Target Progress — {monthLabel}
            </div>
            <div className="mt-2 font-(--font-display) text-navy text-xl tracking-tight">
              Incentive Bonuses
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">
              Current
            </div>
            <div className="mt-1 text-navy font-medium">
              {formatPKR(achieved)}{" "}
              <span className="text-medium-grey font-normal">/ {formatPKR(target)}</span>
            </div>
            <div className="mt-1 text-xs tracking-[0.2em] uppercase text-gold">
              {pct}% of target
            </div>
            <div className="mt-2">
              <Link
                href="/activities"
                className="text-xs tracking-[0.2em] uppercase text-medium-grey hover:text-navy transition-colors"
              >
                View related actions
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="h-3 w-full rounded-full bg-cream border border-light-grey overflow-hidden">
            <div
              className="h-full bg-[linear-gradient(90deg,#C9A84C,#A6862E)]"
              style={{ width: `${Math.min(100, cappedPct)}%` }}
              aria-label="Target progress"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {tiers.map((t) => {
              const unlocked = pct >= t.thresholdPct;
              return (
                <div
                  key={t.label}
                  className={[
                    "rounded-lg border p-4",
                    unlocked
                      ? "border-gold/40 bg-gold/10"
                      : "border-light-grey bg-[#FAFAFA]",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">
                      {t.label}
                    </div>
                    <div
                      className={[
                        "text-xs font-semibold tracking-[0.2em] uppercase",
                        unlocked ? "text-gold" : "text-medium-grey",
                      ].join(" ")}
                    >
                      {t.thresholdPct}%
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-navy font-medium">
                    Bonus: {t.bonusLabel}
                  </div>
                  <div className="mt-2 text-xs text-medium-grey">
                    {unlocked ? "Unlocked" : "Locked"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatPKR(value: number) {
  const crore = 10_000_000;
  const lakh = 100_000;

  if (value >= crore) return `PKR ${(value / crore).toFixed(2)} crore`;
  if (value >= lakh) return `PKR ${(value / lakh).toFixed(1)} lakh`;
  return `PKR ${Math.round(value).toLocaleString("en-PK")}`;
}

