"use client";

import { useMemo, useState } from "react";
import {
  generateLeadEmail,
  generateLeadWhatsapp,
  type EmailTemplateType,
  type WhatsappLanguage,
  type WhatsappTemplateType,
} from "@/lib/message-generators";

type PanelLead = {
  id: string;
  name: string;
  status: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  preferredUnit?: string | null;
  preferredView?: string | null;
  urgency?: string | null;
};

type PanelProgress = {
  stage: string;
  paymentStatus: string;
  nextAction: string;
  latestSignal?: string | null;
};

type PanelNextActivity = {
  title: string;
  type: string;
  dueAt: string | null; // ISO
} | null;

const EMAIL_TEMPLATES: Array<{ id: EmailTemplateType; label: string }> = [
  { id: "initial_follow_up", label: "Initial follow-up" },
  { id: "after_viewing", label: "After viewing" },
  { id: "payment_plan_follow_up", label: "Payment plan follow-up" },
  { id: "deposit_reminder", label: "Deposit reminder" },
  { id: "upgrade_upsell", label: "Upgrade / upsell option" },
  { id: "reactivation", label: "Reactivation message" },
];

const WHATSAPP_TEMPLATES: Array<{ id: WhatsappTemplateType; label: string }> = [
  { id: "initial_follow_up", label: "Initial follow-up" },
  { id: "viewing_confirmation", label: "Viewing confirmation" },
  { id: "callback_confirmation", label: "Callback confirmation" },
  { id: "payment_plan_follow_up", label: "Payment plan follow-up" },
  { id: "deposit_reminder", label: "Deposit reminder" },
  { id: "upgrade_upsell", label: "Upgrade / upsell suggestion" },
  { id: "reactivation", label: "Reactivation" },
];

function badgeClasses(temp: "Hot" | "Warm" | "Cold") {
  if (temp === "Hot") return "bg-success/15 text-success border-success/25";
  if (temp === "Warm") return "bg-warning/15 text-warning border-warning/25";
  return "bg-navy/5 text-navy/70 border-light-grey";
}

export function AISalesAssistantPanel(props: {
  lead: PanelLead;
  advisorName: string;
  canUseAssistant: boolean;
  score: { score: number; temperature: "Hot" | "Warm" | "Cold"; reasons: string[]; recommendedNextAction: string };
  progress: PanelProgress;
  nextActivity: PanelNextActivity;
}) {
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplateType>("initial_follow_up");
  const [waTemplate, setWaTemplate] = useState<WhatsappTemplateType>("initial_follow_up");
  const [waLang, setWaLang] = useState<WhatsappLanguage>("English");

  const [email, setEmail] = useState<{ subject: string; body: string } | null>(null);
  const [whatsapp, setWhatsapp] = useState<{ message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const nextActivity = useMemo(() => {
    if (!props.nextActivity) return null;
    return {
      title: props.nextActivity.title,
      type: props.nextActivity.type,
      dueAt: props.nextActivity.dueAt ? new Date(props.nextActivity.dueAt) : null,
    };
  }, [props.nextActivity]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copied.");
      setTimeout(() => setMsg(null), 1200);
    } catch {
      setMsg("Copy failed.");
      setTimeout(() => setMsg(null), 1500);
    }
  }

  async function saveGenerated(kind: "email" | "whatsapp") {
    setSaving(true);
    setMsg(null);
    try {
      const payload =
        kind === "email" && email
          ? {
              kind,
              template: emailTemplate,
              subject: email.subject,
              content: email.body,
            }
          : kind === "whatsapp" && whatsapp
            ? {
                kind,
                template: waTemplate,
                language: waLang,
                content: whatsapp.message,
              }
            : null;

      if (!payload) {
        setMsg("Generate first.");
        return;
      }

      const res = await fetch(`/api/leads/${props.lead.id}/ai-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          json && typeof json === "object" && "error" in json
            ? (json as { error?: { message?: string } }).error?.message
            : null;
        setMsg(message ?? "Could not save note.");
        return;
      }
      setMsg("Saved to notes.");
      setTimeout(() => setMsg(null), 1500);
      window.location.reload();
    } catch {
      setMsg("Network error.");
    } finally {
      setSaving(false);
    }
  }

  function generateEmail() {
    const out = generateLeadEmail({
      lead: {
        id: props.lead.id,
        name: props.lead.name,
        status: props.lead.status,
        budgetMin: props.lead.budgetMin ?? null,
        budgetMax: props.lead.budgetMax ?? null,
        preferredUnit: props.lead.preferredUnit ?? null,
        preferredView: props.lead.preferredView ?? null,
        urgency: props.lead.urgency ?? null,
        email: null,
      },
      advisorName: props.advisorName,
      progress: props.progress,
      nextActivity: nextActivity
        ? { title: nextActivity.title, type: nextActivity.type, dueAt: nextActivity.dueAt }
        : null,
      template: emailTemplate,
    });
    setEmail(out);
    setMsg(null);
  }

  function generateWhatsapp() {
    const out = generateLeadWhatsapp({
      lead: {
        id: props.lead.id,
        name: props.lead.name,
        status: props.lead.status,
        budgetMin: props.lead.budgetMin ?? null,
        budgetMax: props.lead.budgetMax ?? null,
        preferredUnit: props.lead.preferredUnit ?? null,
        preferredView: props.lead.preferredView ?? null,
        urgency: props.lead.urgency ?? null,
        email: null,
      },
      advisorName: props.advisorName,
      progress: props.progress,
      nextActivity: nextActivity
        ? { title: nextActivity.title, type: nextActivity.type, dueAt: nextActivity.dueAt }
        : null,
      template: waTemplate,
      language: waLang,
    });
    setWhatsapp(out);
    setMsg(null);
  }

  return (
    <section className="rounded-xl border border-light-grey bg-white shadow-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="font-(--font-display) text-lg text-navy">AI Sales Assistant</h2>
          <p className="mt-1 text-xs text-medium-grey">
            Generate, copy, and save premium outreach messages (no external sending).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-medium-grey">Score</span>
          <span className="rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white">{props.score.score}</span>
          <span className={["rounded-full border px-3 py-1 text-xs font-semibold", badgeClasses(props.score.temperature)].join(" ")}>
            {props.score.temperature}
          </span>
        </div>
      </div>

      {!props.canUseAssistant ? (
        <div className="mt-5 rounded-lg border border-light-grey bg-cream/20 p-4 text-sm text-medium-grey">
          You can only generate and save messages for leads you own.
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-light-grey bg-cream/20 p-4">
              <div className="text-xs tracking-widest uppercase text-medium-grey">Reasons</div>
              <ul className="mt-2 space-y-1 text-sm text-navy">
                {(props.score.reasons.length ? props.score.reasons : ["No strong signals yet."]).map((r) => (
                  <li key={r} className="leading-relaxed">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-light-grey bg-cream/20 p-4">
              <div className="text-xs tracking-widest uppercase text-medium-grey">Recommended next action</div>
              <div className="mt-2 text-sm font-medium text-navy leading-relaxed">{props.score.recommendedNextAction}</div>
              <div className="mt-2 text-xs text-medium-grey">
                Progress: <span className="font-semibold">{props.progress.stage}</span> · {props.progress.paymentStatus}
              </div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-light-grey bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="font-(--font-display) text-base text-navy">Generate Email</div>
                <select
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value as EmailTemplateType)}
                  className="h-9 rounded-lg border border-light-grey bg-white px-3 text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
                >
                  {EMAIL_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => generateEmail()}
                  className="rounded-lg border border-navy/20 bg-navy px-4 py-2 text-xs font-semibold tracking-[0.15em] uppercase text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow"
                >
                  Generate Email
                </button>
                {email ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void copy(`Subject: ${email.subject}\n\n${email.body}`)}
                      className="rounded-lg border border-light-grey bg-white px-4 py-2 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveGenerated("email")}
                      disabled={saving}
                      className="rounded-lg border border-light-grey bg-white px-4 py-2 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save as Note"}
                    </button>
                  </>
                ) : null}
                {msg ? <span className="text-xs text-medium-grey">{msg}</span> : null}
              </div>

              <div className="mt-4 rounded-lg border border-light-grey bg-cream/20 p-4">
                {!email ? (
                  <div className="text-sm text-medium-grey">Generate an email to preview it here.</div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-navy">Subject: {email.subject}</div>
                    <pre className="text-sm text-navy whitespace-pre-wrap leading-relaxed">{email.body}</pre>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-light-grey bg-white p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="font-(--font-display) text-base text-navy">Generate WhatsApp</div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={waTemplate}
                    onChange={(e) => setWaTemplate(e.target.value as WhatsappTemplateType)}
                    className="h-9 rounded-lg border border-light-grey bg-white px-3 text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
                  >
                    {WHATSAPP_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={waLang}
                    onChange={(e) => setWaLang(e.target.value as WhatsappLanguage)}
                    className="h-9 rounded-lg border border-light-grey bg-white px-3 text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
                  >
                    <option value="English">English</option>
                    <option value="Roman Urdu">Roman Urdu</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => generateWhatsapp()}
                  className="rounded-lg border border-navy/20 bg-navy px-4 py-2 text-xs font-semibold tracking-[0.15em] uppercase text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow"
                >
                  Generate WhatsApp
                </button>
                {whatsapp ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void copy(whatsapp.message)}
                      className="rounded-lg border border-light-grey bg-white px-4 py-2 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveGenerated("whatsapp")}
                      disabled={saving}
                      className="rounded-lg border border-light-grey bg-white px-4 py-2 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save as Note"}
                    </button>
                  </>
                ) : null}
                {msg ? <span className="text-xs text-medium-grey">{msg}</span> : null}
              </div>

              <div className="mt-4 rounded-lg border border-light-grey bg-cream/20 p-4">
                {!whatsapp ? (
                  <div className="text-sm text-medium-grey">Generate a WhatsApp message to preview it here.</div>
                ) : (
                  <pre className="text-sm text-navy whitespace-pre-wrap leading-relaxed">{whatsapp.message}</pre>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

