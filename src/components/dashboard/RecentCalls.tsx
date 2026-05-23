import Link from "next/link";
import type { DemoCall } from "@/lib/demo-data";

type RecentCall = {
  id: string;
  name: string;
  duration: string;
  sentiment: "Positive" | "Neutral" | "Negative";
  note: string;
};

function sentimentTitle(sentiment: DemoCall["sentiment"]) {
  if (sentiment === "positive") return "Positive";
  if (sentiment === "negative") return "Negative";
  return "Neutral";
}

function sentimentPill(sentiment: RecentCall["sentiment"]) {
  if (sentiment === "Positive") return "bg-success/15 text-success";
  if (sentiment === "Negative") return "bg-error/15 text-error";
  return "bg-navy/10 text-navy/70";
}

export function RecentCalls({ calls }: { calls: DemoCall[] }) {
  const items: RecentCall[] = calls.map((c) => ({
    id: c.id,
    name: c.leadName,
    duration: c.duration,
    sentiment: sentimentTitle(c.sentiment),
    note: c.summary,
  }));

  return (
    <section className="rounded-lg border border-gold/20 bg-white shadow-[0_4px_24px_rgba(10,22,40,0.02)] overflow-hidden">
      <div className="px-6 py-4 border-b border-light-grey/70 bg-[#FAFAFA] flex items-center justify-between">
        <div className="font-(--font-display) text-navy text-lg">
          Recent Calls
        </div>
        <Link
          href="/calls"
          className="text-medium-grey hover:text-gold transition-colors text-sm"
        >
          View log
        </Link>
      </div>

      <div className="p-3">
        <div className="flex flex-col gap-2">
          {items.map((call) => (
            <Link
              key={call.id}
              href="/calls"
              className="rounded-lg border border-transparent hover:border-light-grey hover:bg-[#FAFAFA] transition-colors p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-navy truncate">
                    {call.name}
                  </div>
                  <div className="text-xs text-medium-grey/60">{call.duration}</div>
                </div>
                <div className="mt-1 text-sm text-medium-grey">{call.note}</div>
              </div>
              <div
                className={[
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                  sentimentPill(call.sentiment),
                ].join(" ")}
              >
                {call.sentiment}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

