"use client";

import { useMemo, useState } from "react";
import type { DemoCall } from "@/lib/demo-data";
import { TranscriptViewer } from "./TranscriptViewer";

function sentimentPill(sentiment: DemoCall["sentiment"]) {
  if (sentiment === "positive") return "bg-success/15 text-success";
  if (sentiment === "negative") return "bg-error/15 text-error";
  return "bg-navy/10 text-navy/70";
}

export function CallTable({ calls }: { calls: DemoCall[] }) {
  const [openId, setOpenId] = useState<string | null>(calls[0]?.id ?? null);

  const openCall = useMemo(
    () => calls.find((c) => c.id === openId) ?? null,
    [calls, openId],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 rounded-lg border border-gold/20 bg-white shadow-[0_4px_24px_rgba(10,22,40,0.02)] overflow-hidden">
        <div className="px-6 py-4 border-b border-light-grey/70 bg-navy text-white">
          <div className="grid grid-cols-12 gap-4 text-xs tracking-[0.2em] uppercase">
            <div className="col-span-3">Date/Time</div>
            <div className="col-span-3">Prospect</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-2">Sentiment</div>
            <div className="col-span-2">Action</div>
          </div>
        </div>
        <div>
          {calls.map((call, idx) => {
            const active = call.id === openId;
            return (
              <button
                key={call.id}
                type="button"
                onClick={() => setOpenId(call.id)}
                className={[
                  "w-full text-left px-6 py-4 transition-colors",
                  idx % 2 === 0 ? "bg-white" : "bg-cream/30",
                  active ? "border-l-[3px] border-gold pl-[21px]" : "",
                  "hover:bg-[#FAFAFA]",
                ].join(" ")}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3 text-sm text-medium-grey">
                    {call.createdAtLabel}
                  </div>
                  <div className="col-span-3 font-medium text-navy truncate">
                    {call.leadName}
                  </div>
                  <div className="col-span-2 text-sm text-medium-grey font-mono">
                    {call.duration}
                  </div>
                  <div className="col-span-2">
                    <span
                      className={[
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                        sentimentPill(call.sentiment),
                      ].join(" ")}
                    >
                      {call.sentiment}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm font-semibold text-gold">
                    View
                  </div>
                </div>
                <div className="mt-2 text-sm text-medium-grey line-clamp-2">
                  {call.summary}
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
              Call Detail
            </div>
            {openCall ? (
              <div className="mt-4 text-sm text-medium-grey">
                <div className="font-medium text-navy">{openCall.leadName}</div>
                <div className="mt-1">
                  {openCall.createdAtLabel} •{" "}
                  <span className="font-mono">{openCall.duration}</span>
                </div>
                <div className="mt-3 rounded-lg border border-light-grey bg-cream/30 p-4">
                  <div className="text-xs tracking-widest uppercase text-medium-grey">
                    Summary
                  </div>
                  <div className="mt-2 text-sm text-medium-grey">
                    {openCall.summary}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-medium-grey">
                Select a call to view details.
              </div>
            )}
          </div>
        </div>

        {openCall ? <TranscriptViewer call={openCall} /> : null}

        <button
          type="button"
          className="rounded-lg px-5 py-3 text-sm font-semibold text-white bg-[linear-gradient(135deg,#C9A84C,#A6862E)] shadow-gold hover:shadow-[0_0_28px_rgba(201,168,76,0.22)] transition-shadow"
        >
          Analyse Call (AI)
        </button>
      </div>
    </div>
  );
}

