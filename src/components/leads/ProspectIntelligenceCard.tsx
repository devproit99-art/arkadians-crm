"use client";

import { useMemo, useState } from "react";

export type ProspectIntelligenceProps = {
  score: number;
  label: "Closing / Client" | "Hot" | "Warm" | "Cold";
  reasons: string[];
  recommendedAction: string;
  leadName: string;
  propertyInterest: string;
  budgetText: string;
  callbackText: string;
};

function labelStyles(label: "Closing / Client" | "Hot" | "Warm" | "Cold") {
  if (label === "Closing / Client") return "bg-success ring-2 ring-gold text-white";
  if (label === "Hot") return "bg-success text-white";
  if (label === "Warm") return "bg-gold text-navy";
  return "bg-light-grey text-navy";
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ProspectIntelligenceCard(props: ProspectIntelligenceProps) {
  const name = props.leadName?.trim() || "there";

  const whatsappTemplate = useMemo(() => {
    const property = props.propertyInterest?.trim() || "a residence";
    const budget = props.budgetText?.trim() || "your preferred budget";
    const callback = props.callbackText?.trim() || "soon";
    return `Assalamu alaikum ${name}, thank you for your interest in Arkadians DHA Phase 8. We have noted your interest in ${property} with a budget around ${budget}. Our team will contact you ${callback}. Thank you.`;
  }, [name, props.budgetText, props.callbackText, props.propertyInterest]);

  const emailSubject = "Arkadians DHA Phase 8 – Follow-up Confirmation";
  const emailBody = useMemo(() => {
    const property = props.propertyInterest?.trim() || "a residence";
    const budget = props.budgetText?.trim() || "your preferred budget";
    const callback = props.callbackText?.trim() || "soon";
    return `Dear ${name},\n\nThank you for your interest in Arkadians DHA Phase 8.\n\nWe have noted your interest in ${property} with an approximate budget of ${budget}. Our team will contact you ${callback}.\n\nKind regards,\nArkadians Team`;
  }, [name, props.budgetText, props.callbackText, props.propertyInterest]);

  const [whatsAppText, setWhatsAppText] = useState<string>("");
  const [emailText, setEmailText] = useState<string>("");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-light-grey bg-white shadow-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-(--font-display) text-lg text-navy">Prospect Intelligence</h2>
          <p className="mt-1 text-xs text-medium-grey">
            Demo-friendly guidance based on CRM + latest AI call.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-medium-grey">Score</div>
          <div className="mt-1 font-(--font-display) text-2xl text-navy tracking-tight">
            {props.score}/100
          </div>
          <div className={["mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold", labelStyles(props.label)].join(" ")}>
            {props.label} Lead
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="text-xs tracking-widest uppercase text-medium-grey">Reasons</div>
          {props.reasons.length === 0 ? (
            <p className="mt-2 text-sm text-medium-grey">Not enough data yet. Run an AI browser test.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-navy">
              {props.reasons.map((r) => (
                <li key={r} className="rounded-lg border border-light-grey bg-cream/20 px-3 py-2">
                  {r}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5">
            <div className="text-xs tracking-widest uppercase text-medium-grey">Recommended next action</div>
            <p className="mt-2 text-sm text-navy leading-relaxed">{props.recommendedAction}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-light-grey bg-cream/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs tracking-widest uppercase text-medium-grey">WhatsApp</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWhatsAppText(whatsappTemplate);
                    setCopyStatus(null);
                  }}
                  className="rounded-lg border border-light-grey bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:border-gold hover:bg-cream/40 transition-colors"
                >
                  Generate WhatsApp Message
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      const ok = await copyToClipboard(whatsAppText || whatsappTemplate);
                      setCopyStatus(ok ? "Copied." : "Copy failed.");
                    })();
                  }}
                  className="rounded-lg border border-navy/20 bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow"
                >
                  Copy
                </button>
              </div>
            </div>
            <textarea
              className="mt-3 w-full min-h-[110px] rounded-lg border border-light-grey bg-white px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              value={whatsAppText}
              onChange={(e) => setWhatsAppText(e.target.value)}
              placeholder="Click “Generate WhatsApp Message” to draft a message…"
            />
          </div>

          <div className="rounded-lg border border-light-grey bg-cream/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs tracking-widest uppercase text-medium-grey">Email</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmailText(`Subject: ${emailSubject}\n\n${emailBody}`);
                    setCopyStatus(null);
                  }}
                  className="rounded-lg border border-light-grey bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:border-gold hover:bg-cream/40 transition-colors"
                >
                  Generate Follow-up Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      const ok = await copyToClipboard(emailText || `Subject: ${emailSubject}\n\n${emailBody}`);
                      setCopyStatus(ok ? "Copied." : "Copy failed.");
                    })();
                  }}
                  className="rounded-lg border border-navy/20 bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow"
                >
                  Copy
                </button>
              </div>
            </div>
            <textarea
              className="mt-3 w-full min-h-[140px] rounded-lg border border-light-grey bg-white px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              placeholder="Click “Generate Follow-up Email” to draft email subject + body…"
            />
          </div>

          {copyStatus ? <div className="text-xs text-medium-grey">{copyStatus}</div> : null}
        </div>
      </div>
    </section>
  );
}

