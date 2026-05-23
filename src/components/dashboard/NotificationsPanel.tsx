"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatTime12 } from "@/lib/datetime";

type Row = {
  id: string;
  leadId: string;
  leadName: string;
  type: string;
  status: string;
  priority: string;
  title: string;
  dueAt: string | null; // ISO
  userName: string | null;
};

type ReminderMinutes = 5 | 10;
type ReminderSetting = "off" | "5" | "10";

function typeBadge(type: string) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("viewing")) return "bg-gold/20 text-navy border-gold/30";
  if (t.includes("meeting")) return "bg-navy/10 text-navy border-navy/15";
  if (t.includes("follow") || t.includes("call")) return "bg-success/15 text-success border-success/25";
  if (t.includes("payment") || t.includes("deposit")) return "bg-purple/10 text-purple border-purple/20";
  return "bg-cream/60 text-navy border-light-grey";
}

function statusTone(status: string, dueAtIso: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "completed") return "text-success";
  if (s === "cancelled") return "text-medium-grey";
  if (dueAtIso) {
    const d = new Date(dueAtIso);
    if (!Number.isNaN(d.getTime()) && d.getTime() < Date.now()) return "text-error";
  }
  return "text-navy";
}

function reminderKey(userScope: string, activityId: string) {
  return `arkadians:reminder:${userScope}:${activityId}`;
}

export function NotificationsPanel(props: {
  ownerId: string | null; // for admin viewing a staff dashboard; staff gets their own session on API
  isAdmin: boolean;
  title?: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ title: string; subtitle: string; leadId: string } | null>(null);
  const firedRef = useRef<Set<string>>(new Set());

  const userScope = useMemo(() => (props.isAdmin ? props.ownerId ?? "all" : "me"), [props.isAdmin, props.ownerId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const qs = props.isAdmin && props.ownerId ? `?userId=${encodeURIComponent(props.ownerId)}` : "";
      const res = await fetch(`/api/notifications/today${qs}`, { credentials: "same-origin" }).catch(() => null);
      if (!alive) return;
      if (!res || !res.ok) {
        setRows([]);
        setLoading(false);
        return;
      }
      const json: unknown = await res.json().catch(() => null);
      const data = json && typeof json === "object" && "data" in json ? (json as any).data : null;
      setRows(Array.isArray(data) ? (data as Row[]) : []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [props.isAdmin, props.ownerId]);

  const today = useMemo(() => {
    const now = new Date();
    const nice = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short" }).format(now);
    return nice;
  }, []);

  const summary = useMemo(() => {
    const now = Date.now();
    let completed = 0;
    let missed = 0;
    let upcoming = 0;
    for (const r of rows) {
      const s = (r.status ?? "").toLowerCase();
      if (s === "completed") {
        completed++;
        continue;
      }
      const t = r.dueAt ? new Date(r.dueAt).getTime() : null;
      if (t != null && Number.isFinite(t) && t < now) missed++;
      else upcoming++;
    }
    return { completed, missed, upcoming, total: rows.length };
  }, [rows]);

  function getSetting(id: string): ReminderSetting {
    try {
      const v = localStorage.getItem(reminderKey(userScope, id));
      return v === "5" || v === "10" ? v : "off";
    } catch {
      return "off";
    }
  }

  function setSetting(id: string, v: ReminderSetting) {
    try {
      if (v === "off") localStorage.removeItem(reminderKey(userScope, id));
      else localStorage.setItem(reminderKey(userScope, id), v);
    } catch {
      // ignore
    }
    // trigger re-render
    setRows((prev) => [...prev]);
  }

  async function markCompleted(activityId: string) {
    const res = await fetch(`/api/activities/${activityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ status: "completed", completedAt: new Date().toISOString() }),
    }).catch(() => null);
    if (!res || !res.ok) return;
    setRows((prev) => prev.map((r) => (r.id === activityId ? { ...r, status: "completed" } : r)));
  }

  // Reminder engine (local only)
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      for (const r of rows) {
        if (!r.dueAt) continue;
        const s = (r.status ?? "").toLowerCase();
        if (s === "completed" || s === "cancelled") continue;

        const due = new Date(r.dueAt).getTime();
        if (!Number.isFinite(due)) continue;

        const setting = getSetting(r.id);
        const mins: ReminderMinutes | null = setting === "5" ? 5 : setting === "10" ? 10 : null;
        if (!mins) continue;

        const fireAt = due - mins * 60 * 1000;
        const idKey = `${r.id}:${mins}`;
        if (firedRef.current.has(idKey)) continue;

        if (now >= fireAt && now <= due + 60 * 1000) {
          firedRef.current.add(idKey);
          setToast({
            title: `${mins} min reminder — ${r.type.replaceAll("_", " ")}`,
            subtitle: `${r.leadName} · ${r.title}`,
            leadId: r.leadId,
          });
        }
      }
    };

    tick();
    const i = window.setInterval(tick, 30_000);
    return () => window.clearInterval(i);
  }, [rows, userScope]);

  return (
    <section className="rounded-xl border border-light-grey bg-white shadow-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-(--font-display) text-lg text-navy">{props.title ?? "Notifications"}</h2>
          <p className="mt-1 text-xs text-medium-grey">Today ({today}) — schedule reminders for callbacks, calls, meetings, viewings.</p>
        </div>
        <div className="text-right text-xs text-medium-grey">
          <div>
            <span className="font-semibold text-navy">{summary.upcoming}</span> upcoming
          </div>
          <div>
            <span className="font-semibold text-success">{summary.completed}</span> completed ·{" "}
            <span className="font-semibold text-error">{summary.missed}</span> missed
          </div>
        </div>
      </div>

      {toast ? (
        <div className="mt-4 rounded-xl border border-gold/30 bg-cream/70 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-navy">{toast.title}</div>
              <div className="mt-1 text-xs text-medium-grey">{toast.subtitle}</div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/leads/${toast.leadId}`}
                className="rounded-lg border border-light-grey bg-white px-3 py-2 text-[11px] font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors"
              >
                Open
              </Link>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="rounded-lg border border-light-grey bg-white px-3 py-2 text-[11px] font-semibold tracking-[0.15em] uppercase text-medium-grey hover:bg-cream/40 hover:text-navy transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 rounded-lg border border-light-grey bg-cream/20 p-4">
        {loading ? (
          <div className="text-sm text-medium-grey">Loading today’s schedule…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-medium-grey">No scheduled activities for today.</div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => {
              const time = r.dueAt ? formatTime12(r.dueAt) : "—";
              const setting = getSetting(r.id);
              return (
                <li key={r.id} className="rounded-lg border border-light-grey bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={["inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold", typeBadge(r.type)].join(" ")}>
                          {r.type.replaceAll("_", " ")}
                        </span>
                        <span className={["text-sm font-semibold", statusTone(r.status, r.dueAt)].join(" ")}>
                          {time}
                        </span>
                        <Link href={`/leads/${r.leadId}`} className="text-sm font-semibold text-navy hover:text-gold transition-colors truncate">
                          {r.leadName}
                        </Link>
                        {props.isAdmin && !props.ownerId && r.userName ? (
                          <span className="text-xs text-medium-grey">· {r.userName}</span>
                        ) : null}
                      </div>
                      <div className="mt-2 text-sm text-navy">{r.title}</div>
                      <div className="mt-1 text-xs text-medium-grey">
                        Status: {r.status.replaceAll("_", " ")} · Priority: <span className="font-semibold">{r.priority}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 rounded-lg border border-light-grey bg-white px-2 py-1">
                        <span className="text-[11px] text-medium-grey font-semibold">Remind</span>
                        <button
                          type="button"
                          onClick={() => setSetting(r.id, setting === "5" ? "off" : "5")}
                          className={[
                            "h-7 rounded-md px-2 text-[11px] font-semibold transition-colors",
                            setting === "5" ? "bg-navy text-white" : "bg-cream/40 text-navy hover:bg-cream/70",
                          ].join(" ")}
                        >
                          5m
                        </button>
                        <button
                          type="button"
                          onClick={() => setSetting(r.id, setting === "10" ? "off" : "10")}
                          className={[
                            "h-7 rounded-md px-2 text-[11px] font-semibold transition-colors",
                            setting === "10" ? "bg-navy text-white" : "bg-cream/40 text-navy hover:bg-cream/70",
                          ].join(" ")}
                        >
                          10m
                        </button>
                      </div>

                      {r.status !== "completed" ? (
                        <button
                          type="button"
                          onClick={() => void markCompleted(r.id)}
                          className="h-9 rounded-lg border border-light-grey bg-white px-3 text-[11px] font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors"
                        >
                          Mark done
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

