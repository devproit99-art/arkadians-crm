import Link from "next/link";

const demoItems = [
  "Call Ahmed Khan — high intent, no contact in 3 days.",
  "Send payment plan to Fatima Syed — she asked twice.",
  "Follow up Omar Raza — game signals penthouse curiosity.",
];

export function AIRecommendations() {
  return (
    <section className="rounded-lg border border-gold/20 bg-white shadow-[0_8px_30px_rgba(10,22,40,0.05)] p-8 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-navy/5 border border-light-grey flex items-center justify-center">
          <span className="text-gold font-semibold text-xs tracking-[0.2em]">AI</span>
        </div>
      <div className="font-(--font-display) text-navy text-lg">
          AI Recommendations
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {demoItems.map((text) => (
          <div key={text} className="flex gap-3">
            <div className="mt-2 w-2 h-2 rounded-full bg-gold shadow-gold" />
            <div className="text-sm text-medium-grey leading-relaxed">{text}</div>
          </div>
        ))}
      </div>

      <Link
        href="/activities"
        className="mt-6 w-full rounded-lg border border-gold/40 px-4 py-3 text-sm font-semibold tracking-wide text-navy hover:bg-gold/10 transition-colors text-center"
      >
        Review Actions
      </Link>
    </section>
  );
}

