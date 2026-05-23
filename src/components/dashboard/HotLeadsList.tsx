import Link from "next/link";
import type { DemoLead } from "@/lib/demo-data";

type HotLead = {
  id: string;
  name: string;
  score: number;
  budgetLabel: string;
  unitLabel: string;
  lastContactLabel: string;
};

function scoreDot(score: number) {
  if (score >= 90) return "bg-success ring-2 ring-gold";
  if (score >= 70) return "bg-gold";
  if (score >= 40) return "bg-warning";
  return "bg-light-grey";
}

export function HotLeadsList({ leads }: { leads: DemoLead[] }) {
  const items: HotLead[] = leads.map((l) => ({
    id: l.id,
    name: l.name,
    score: l.score,
    budgetLabel: l.budgetLabel,
    unitLabel: l.preferredUnit ?? "Residence",
    lastContactLabel: l.updatedLabel,
  }));

  return (
    <section className="rounded-lg border border-gold/20 bg-white shadow-[0_4px_24px_rgba(10,22,40,0.02)] overflow-hidden">
      <div className="px-6 py-4 border-b border-light-grey/70 flex items-center justify-between bg-[#FAFAFA]">
        <div className="flex items-center gap-3">
          <div className="font-(--font-display) text-navy text-lg">
            Hot Prospects
          </div>
          <div className="text-xs px-2 py-0.5 rounded-full bg-error/10 text-error font-medium">
            Priority
          </div>
        </div>
        <Link
          href="/leads"
          className="text-medium-grey hover:text-gold transition-colors text-sm"
        >
          View registry
        </Link>
      </div>

      <div className="p-3">
        <div className="flex flex-col gap-2">
          {items.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="group rounded-lg border border-transparent hover:border-light-grey hover:bg-[#FAFAFA] transition-colors p-4 flex items-center justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="font-medium text-navy truncate">
                    {lead.name}
                  </div>
                </div>
                <div className="mt-1 text-sm text-medium-grey flex items-center gap-2 flex-wrap">
                  <span>{lead.budgetLabel}</span>
                  <span className="text-medium-grey/40">•</span>
                  <span>{lead.unitLabel}</span>
                  <span className="text-medium-grey/40">•</span>
                  <span>Last: {lead.lastContactLabel}</span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <div className="rounded-full border border-light-grey bg-white px-3 py-1 text-sm font-semibold text-navy flex items-center gap-2">
                  <span>{lead.score}</span>
                  <span
                    className={[
                      "w-2 h-2 rounded-full",
                      scoreDot(lead.score),
                    ].join(" ")}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

