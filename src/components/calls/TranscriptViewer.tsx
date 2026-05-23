"use client";

import type { DemoCall } from "@/lib/demo-data";

function bubbleClasses(speaker: DemoCall["transcript"][number]["speaker"]) {
  if (speaker === "Agent") {
    return "bg-white border border-light-grey text-navy";
  }
  return "bg-navy text-white border border-navy";
}

function alignClasses(speaker: DemoCall["transcript"][number]["speaker"]) {
  return speaker === "Agent" ? "justify-start" : "justify-end";
}

export function TranscriptViewer({ call }: { call: DemoCall }) {
  return (
    <div className="rounded-lg border border-light-grey bg-[#FAFAFA] p-6">
      <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">
        Transcript
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {call.transcript.map((m, idx) => (
          <div key={idx} className={["flex", alignClasses(m.speaker)].join(" ")}>
            <div className="max-w-[520px] w-fit">
              <div className="text-[11px] tracking-[0.2em] uppercase text-medium-grey mb-1">
                {m.speaker}
              </div>
              <div className={["rounded-xl px-4 py-3 text-sm", bubbleClasses(m.speaker)].join(" ")}>
                {m.text}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

