"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTime12 } from "@/lib/datetime";

type StaffRow = { userId: string; name: string; due: number; completed: number; missed: number };
type MissedRow = {
  id: string;
  userId: string;
  userName: string;
  dueAt: string | null;
  type: string;
  title: string;
  leadId: string;
  leadName: string;
  status: string;
};

function pillTone(kind: "ok" | "warn" | "bad") {
  if (kind === "ok") return "bg-success/15 text-success border-success/20";
  if (kind === "bad") return "bg-error/15 text-error border-error/20";
  return "bg-warning/15 text-warning border-warning/25";
}

export function ActivityOversightPanel() {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [missed, setMissed] = useState<MissedRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const res = await fetch("/api/admin/activity-oversight", { credentials: "same-origin" }).catch(() => null);
      if (!alive) return;
      if (!res || !res.ok) {
        setStaff([]);
        setMissed([]);
        setLoading(false);
        return;
      }
      const json: any = await res.json().catch(() => null);
      const data = json?.data ?? null;
      setStaff(Array.isArray(data?.staff) ? data.staff : []);
      setMissed(Array.isArray(data?.missed) ? data.missed : []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="rounded-xl border border-light-grey bg-white shadow-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Admin oversight</div>
          <h2 className="mt-2 font-(--font-display) text-lg text-navy">Today’s staff activity</h2>
          <p className="mt-1 text-sm text-medium-grey">
            Bird’s-eye view of what’s due today, what’s completed, and what’s been missed.
          </p>
        </div>
        <Link
          href="/calendar"
          className="rounded-lg border border-light-grey bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors"
        >
          Calendar
        </Link>
      </div>

      {loading ? (
        <div className="mt-5 text-sm text-medium-grey">Loading oversight…</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-lg border border-light-grey bg-cream/20 p-4">
            <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">By staff</div>
            {staff.length === 0 ? (
              <div className="mt-3 text-sm text-medium-grey">No staff activity found for today.</div>
            ) : (
              <ul className="mt-3 space-y-2">
                {staff.map((r) => {
                  const tone = r.missed >= 2 ? "bad" : r.missed === 1 ? "warn" : "ok";
                  return (
                    <li key={r.userId} className="rounded-lg border border-light-grey bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-navy">{r.name}</div>
                          <div className="mt-1 text-xs text-medium-grey">
                            Due: <span className="font-semibold text-navy">{r.due}</span> · Completed:{" "}
                            <span className="font-semibold text-success">{r.completed}</span>
                          </div>
                        </div>
                        <span className={["shrink-0 rounded-full border px-3 py-1 text-xs font-semibold", pillTone(tone as any)].join(" ")}>
                          Missed {r.missed}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="lg:col-span-7 rounded-lg border border-light-grey bg-cream/20 p-4">
            <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Missed items (today)</div>
            {missed.length === 0 ? (
              <div className="mt-3 text-sm text-medium-grey">No missed items so far.</div>
            ) : (
              <ul className="mt-3 space-y-2">
                {missed.map((m) => (
                  <li key={m.id} className="rounded-lg border border-light-grey bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-medium-grey">
                          {m.dueAt ? formatTime12(m.dueAt) : "—"} · {m.userName} · {m.type.replaceAll("_", " ")}
                        </div>
                        <div className="mt-1 text-sm text-navy">{m.title}</div>
                        <div className="mt-1 text-xs text-medium-grey">
                          Client:{" "}
                          <Link href={`/leads/${m.leadId}`} className="font-semibold hover:text-gold transition-colors">
                            {m.leadName}
                          </Link>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-error/20 bg-error/15 px-3 py-1 text-xs font-semibold text-error">
                        missed
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

