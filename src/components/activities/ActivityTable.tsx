"use client";

import { useMemo, useState } from "react";
import type { DemoActivity } from "@/lib/demo-data";

function pillClass(status: DemoActivity["status"]) {
  if (status === "completed") return "bg-success/15 text-success";
  if (status === "in_progress") return "bg-gold/20 text-navy";
  if (status === "cancelled") return "bg-error/15 text-error";
  return "bg-warning/15 text-warning";
}

function priorityClass(priority: DemoActivity["priority"]) {
  if (priority === "urgent") return "text-error";
  if (priority === "high") return "text-warning";
  return "text-medium-grey";
}

export function ActivityTable({ activities }: { activities: DemoActivity[] }) {
  const [activeId, setActiveId] = useState<string | null>(activities[0]?.id ?? null);
  const active = useMemo(
    () => activities.find((a) => a.id === activeId) ?? null,
    [activities, activeId],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 rounded-lg border border-gold/20 bg-white shadow-[0_4px_24px_rgba(10,22,40,0.02)] overflow-hidden">
        <div className="px-6 py-4 border-b border-light-grey/70 bg-navy text-white">
          <div className="grid grid-cols-12 gap-4 text-xs tracking-[0.2em] uppercase">
            <div className="col-span-3">Due</div>
            <div className="col-span-4">Activity</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Priority</div>
            <div className="col-span-1">Lead</div>
          </div>
        </div>
        <div>
          {activities.map((a, idx) => {
            const activeRow = a.id === activeId;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setActiveId(a.id)}
                className={[
                  "w-full text-left px-6 py-4 transition-colors",
                  idx % 2 === 0 ? "bg-white" : "bg-cream/30",
                  activeRow ? "border-l-[3px] border-gold pl-[21px]" : "",
                  "hover:bg-[#FAFAFA]",
                ].join(" ")}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3 text-sm text-medium-grey">
                    {a.dueLabel ?? "—"}
                  </div>
                  <div className="col-span-4 min-w-0">
                    <div className="font-medium text-navy truncate">{a.title}</div>
                    <div className="text-xs text-medium-grey mt-1 uppercase tracking-[0.2em]">
                      {a.type.replaceAll("_", " ")}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span
                      className={[
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                        pillClass(a.status),
                      ].join(" ")}
                    >
                      {a.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className={["col-span-2 text-sm font-semibold", priorityClass(a.priority)].join(" ")}>
                    {a.priority}
                  </div>
                  <div className="col-span-1 text-sm text-gold font-semibold">
                    View
                  </div>
                </div>
                <div className="mt-2 text-sm text-medium-grey">
                  Prospect: <span className="text-navy font-medium">{a.leadName}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="rounded-xl border border-gold/30 bg-white shadow-card p-6 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="font-(--font-display) text-lg text-navy">
              Quick Actions
            </div>

            {active ? (
              <div className="mt-4">
                <div className="rounded-lg border border-light-grey bg-cream/30 p-4">
                  <div className="text-xs tracking-widest uppercase text-medium-grey">
                    Selected
                  </div>
                  <div className="mt-2 font-medium text-navy">{active.title}</div>
                  <div className="mt-1 text-sm text-medium-grey">
                    {active.leadName} • {active.dueLabel ?? "No due date"}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-lg px-4 py-3 text-sm font-semibold text-white bg-[linear-gradient(135deg,#C9A84C,#A6862E)] shadow-gold hover:shadow-[0_0_28px_rgba(201,168,76,0.22)] transition-shadow"
                  >
                    Mark Complete
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-gold/40 px-4 py-3 text-sm font-semibold text-navy hover:bg-gold/10 transition-colors"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-light-grey px-4 py-3 text-sm font-semibold text-navy hover:bg-cream/60 transition-colors"
                  >
                    Add Note
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-light-grey px-4 py-3 text-sm font-semibold text-navy hover:bg-cream/60 transition-colors"
                  >
                    Send Follow-up
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-medium-grey">
                Select an activity to see actions.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-light-grey bg-white shadow-card p-6">
          <div className="font-(--font-display) text-lg text-navy">
            Concierge Notes
          </div>
          <p className="mt-2 text-sm text-medium-grey">
            Notes and briefings will consolidate here (Phase 1).
          </p>
        </div>
      </div>
    </div>
  );
}

