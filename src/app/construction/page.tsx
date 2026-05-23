const milestones = [
  { phase: 1, label: "Foundation & Piling", status: "completed", progress: 100 },
  { phase: 2, label: "Structural Framework", status: "in_progress", progress: 55 },
  { phase: 3, label: "Interiors & MEP", status: "upcoming", progress: 0 },
  { phase: 4, label: "Amenities & Landscaping", status: "upcoming", progress: 0 },
  { phase: 5, label: "Handover & Possession", status: "upcoming", progress: 0 },
];

function statusDot(status: string) {
  if (status === "completed") return "bg-success";
  if (status === "in_progress") return "bg-gold animate-[pulse-gold_2s_ease-in-out_infinite]";
  return "bg-light-grey";
}

export default function ConstructionPage() {
  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <div>
          <h1 className="font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">
            Construction
          </h1>
          <p className="mt-2 text-medium-grey max-w-2xl">
            A premium progress tracker for key delivery milestones.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-light-grey bg-white shadow-card p-6">
          <div className="relative pl-6 border-l border-gold space-y-6">
            {milestones.map((m) => (
              <div key={m.phase} className="relative">
                <div
                  className={[
                    "absolute left-[-31px] top-1.5 w-3 h-3 rounded-full",
                    statusDot(m.status),
                  ].join(" ")}
                />
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <div className="text-xs tracking-widest uppercase text-medium-grey">
                      Phase {m.phase}
                    </div>
                    <div className="mt-1 font-medium text-navy">{m.label}</div>
                  </div>
                  <div className="text-sm font-semibold text-navy">
                    {m.progress}%
                  </div>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-light-grey overflow-hidden">
                  <div
                    className="h-full bg-[linear-gradient(135deg,#C9A84C,#A6862E)]"
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

