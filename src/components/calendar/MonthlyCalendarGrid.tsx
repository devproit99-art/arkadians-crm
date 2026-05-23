"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatTime12 } from "@/lib/datetime";

export type CalendarUserOption = { id: string; name: string };

export type CalendarEvent = {
  id: string;
  dueAt: string; // ISO
  type: string;
  title: string;
  status: string;
  leadId: string;
  leadName: string;
  userName: string | null;
};

type DayCell = {
  key: string; // YYYY-MM-DD
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfWeekMonday(d: Date) {
  const day = d.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // Mon=0
  const out = new Date(d);
  out.setDate(d.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(d.getDate() + n);
  return out;
}

function monthLabel(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(d);
}

function typeChipClasses(type: string) {
  const t = type.toLowerCase();
  if (t.includes("viewing")) return "bg-gold/20 text-navy border-gold/30";
  if (t.includes("meeting")) return "bg-navy/10 text-navy border-navy/15";
  if (t.includes("follow") || t.includes("callback")) return "bg-success/15 text-success border-success/25";
  if (t.includes("task")) return "bg-warning/15 text-warning border-warning/25";
  if (t.includes("payment") || t.includes("deposit")) return "bg-purple/10 text-purple border-purple/20";
  return "bg-light-grey/60 text-navy border-light-grey";
}

function dayHighlightClasses(events: CalendarEvent[]) {
  if (events.some((e) => e.type.toLowerCase().includes("viewing"))) return "ring-1 ring-gold/40 bg-cream/40";
  if (events.some((e) => e.type.toLowerCase().includes("meeting"))) return "ring-1 ring-navy/15 bg-white";
  if (events.some((e) => e.type.toLowerCase().includes("follow") || e.type.toLowerCase().includes("callback")))
    return "ring-1 ring-success/25 bg-success/5";
  if (events.length > 0) return "ring-1 ring-light-grey bg-cream/20";
  return "bg-white";
}

export function MonthlyCalendarGrid(props: {
  monthIso: string; // YYYY-MM
  selectedUserId: string; // "" for all staff (admin only)
  isAdmin: boolean;
  userOptions: CalendarUserOption[];
  events: CalendarEvent[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const baseMonth = useMemo(() => {
    const m = props.monthIso.match(/^(\d{4})-(\d{2})$/);
    if (!m) return new Date();
    return new Date(Number(m[1]), Number(m[2]) - 1, 1);
  }, [props.monthIso]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of props.events) {
      const d = new Date(e.dueAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    // sort each day by time
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
      map.set(k, arr);
    }
    return map;
  }, [props.events]);

  const cells: DayCell[] = useMemo(() => {
    const start = startOfWeekMonday(startOfMonth(baseMonth));
    const end = endOfMonth(baseMonth);
    const endGrid = addDays(startOfWeekMonday(addDays(end, 6)), 6); // ensure 6 rows
    const out: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i);
      const key = toKey(d);
      out.push({
        key,
        date: d,
        inMonth: d.getMonth() === baseMonth.getMonth(),
        isToday: d.getTime() === today.getTime(),
        events: byDay.get(key) ?? [],
      });
    }
    return out;
  }, [baseMonth, byDay, today]);

  function pushParams(next: { month?: string; userId?: string }) {
    const nextParams = new URLSearchParams(sp.toString());
    if (next.month !== undefined) {
      if (next.month) nextParams.set("month", next.month);
      else nextParams.delete("month");
    }
    if (next.userId !== undefined) {
      if (next.userId) nextParams.set("userId", next.userId);
      else nextParams.delete("userId");
    }
    const q = nextParams.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
    router.refresh();
  }

  function shiftMonth(delta: number) {
    const d = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + delta, 1);
    pushParams({ month: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}` });
  }

  function goToday() {
    const d = new Date();
    pushParams({ month: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}` });
  }

  return (
    <div className="rounded-xl border border-light-grey bg-white shadow-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Calendar</div>
          <div className="mt-2 font-(--font-display) text-2xl text-navy">{monthLabel(baseMonth)}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {props.isAdmin ? (
            <select
              value={props.selectedUserId}
              onChange={(e) => pushParams({ userId: e.target.value })}
              className="h-10 rounded-xl border border-light-grey bg-white px-3 text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value="">Overall / All staff</option>
              {props.userOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          ) : null}

          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="h-10 rounded-xl border border-light-grey bg-white px-3 text-xs font-semibold text-medium-grey hover:bg-cream/40 hover:text-navy transition-colors"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => goToday()}
            className="h-10 rounded-xl border border-gold/40 bg-cream/60 px-3 text-xs font-semibold text-navy hover:border-gold transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="h-10 rounded-xl border border-light-grey bg-white px-3 text-xs font-semibold text-medium-grey hover:bg-cream/40 hover:text-navy transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2 text-[11px] tracking-widest uppercase text-medium-grey">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {cells.map((c) => (
          <div
            key={c.key}
            className={[
              "min-h-[120px] rounded-lg border border-light-grey p-2 overflow-hidden",
              c.inMonth ? "" : "opacity-55",
              c.isToday ? "ring-2 ring-gold/45" : "",
              dayHighlightClasses(c.events),
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-navy">{c.date.getDate()}</div>
              {c.events.length > 0 ? (
                <div className="text-[10px] font-semibold text-medium-grey">{c.events.length}</div>
              ) : null}
            </div>

            <div className="mt-2 space-y-1.5">
              {c.events.slice(0, 4).map((e) => {
                const time = formatTime12(e.dueAt);
                return (
                  <Link
                    key={e.id}
                    href={`/leads/${e.leadId}`}
                    className={[
                      "block rounded-md border px-2 py-1 text-[11px] leading-snug hover:shadow-[0_6px_18px_rgba(10,22,40,0.06)] transition-shadow",
                      typeChipClasses(e.type),
                    ].join(" ")}
                    title={e.title}
                  >
                    <span className="font-semibold">{time}</span>{" "}
                    <span className="text-navy/90">{e.leadName}</span>
                    {props.isAdmin && !props.selectedUserId && e.userName ? (
                      <span className="text-medium-grey"> · {e.userName.split(" ")[0]}</span>
                    ) : null}
                  </Link>
                );
              })}
              {c.events.length > 4 ? (
                <div className="text-[11px] text-medium-grey">+{c.events.length - 4} more…</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

