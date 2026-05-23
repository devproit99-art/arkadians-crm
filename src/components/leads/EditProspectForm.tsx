"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { formatBudgetInput, parseBudgetInput } from "@/lib/budget";

const SOURCES: { value: string; label: string }[] = [
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone" },
  { value: "referral", label: "Referral" },
  { value: "broker", label: "Broker" },
  { value: "website_form", label: "Website form" },
  { value: "website_voice", label: "Website voice" },
  { value: "website_game", label: "Website game" },
  { value: "social_media", label: "Social media" },
];

const UNITS: { value: string; label: string }[] = [
  { value: "", label: "Not specified" },
  { value: "two_bed", label: "2-bedroom suite" },
  { value: "three_bed", label: "3-bedroom suite" },
  { value: "three_bed_large", label: "3-bedroom large" },
  { value: "four_bed_duplex", label: "4-bedroom duplex" },
  { value: "penthouse", label: "Penthouse" },
];

const VIEWS: { value: string; label: string }[] = [
  { value: "", label: "Not specified" },
  { value: "sea", label: "Arabian Sea" },
  { value: "golf", label: "Golf course" },
  { value: "city", label: "City skyline" },
  { value: "dual", label: "Sea & golf" },
];

const STATUSES: { value: string; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "viewing_booked", label: "Viewing booked" },
  { value: "negotiating", label: "Negotiating" },
  { value: "closed_won", label: "Closed won" },
  { value: "closed_lost", label: "Closed lost" },
];

const URGENCY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "immediate", label: "Immediate" },
] as const;

type UrgencyValue = (typeof URGENCY_OPTIONS)[number]["value"];

type LeadEditModel = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  status: string;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredUnit: string | null;
  preferredView: string | null;
  urgency: UrgencyValue;
  language: string;
  notes: string | null;
};

function errorMessageFromJson(json: unknown): string {
  if (!json || typeof json !== "object" || !("error" in json)) {
    return "Could not update prospect.";
  }
  const err = (json as { error?: unknown }).error;
  if (!err || typeof err !== "object") return "Could not update prospect.";
  const e = err as { message?: string; details?: unknown };
  const message = typeof e.message === "string" ? e.message : "Request failed.";
  const details = e.details;
  if (!details || typeof details !== "object") return message;
  const d = details as {
    formErrors?: string[];
    fieldErrors?: Record<string, string[] | undefined>;
  };
  const lines: string[] = [message];
  for (const fe of d.formErrors ?? []) {
    if (fe) lines.push(fe);
  }
  for (const [field, msgs] of Object.entries(d.fieldErrors ?? {})) {
    if (msgs?.length) lines.push(`${field}: ${msgs.join(", ")}`);
  }
  return lines.join("\n");
}

export function EditProspectForm({ lead }: { lead: LeadEditModel }) {
  const router = useRouter();

  const [name, setName] = useState(lead.name);
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [source, setSource] = useState(lead.source);
  const [status, setStatus] = useState(lead.status);
  const [preferredUnit, setPreferredUnit] = useState(lead.preferredUnit ?? "");
  const [preferredView, setPreferredView] = useState(lead.preferredView ?? "");
  const [urgency, setUrgency] = useState<UrgencyValue>(lead.urgency ?? "medium");
  const [language, setLanguage] = useState(lead.language ?? "en");
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [budgetInput, setBudgetInput] = useState(() =>
    formatBudgetInput(
      lead.budgetMin != null ? BigInt(lead.budgetMin) : null,
      lead.budgetMax != null ? BigInt(lead.budgetMax) : null,
    ),
  );

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const parsedBudget = useMemo(() => {
    const t = budgetInput.trim();
    if (!t) return null;
    const p = parseBudgetInput(t);
    if (p.budgetMin == null && p.budgetMax == null) return null;
    return p;
  }, [budgetInput]);

  function guardForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    void handleSave();
  }

  async function handleSave() {
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Failed to save prospect: Name is required.");
      return;
    }

    const budgetTrim = budgetInput.trim();
    if (budgetTrim && !parsedBudget) {
      setErrorMsg("Failed to save prospect: Please enter budget like 3 crore or 10-12 crore.");
      return;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      phone: phone.trim() ? phone.trim() : null,
      email: email.trim() ? email.trim() : null,
      source,
      status,
      preferredUnit: preferredUnit ? preferredUnit : null,
      preferredView: preferredView ? preferredView : null,
      urgency,
      language: language.trim() || "en",
      notes: notes.trim() ? notes.trim() : null,
      budgetMin: parsedBudget?.budgetMin != null ? Number(parsedBudget.budgetMin) : null,
      budgetMax: parsedBudget?.budgetMax != null ? Number(parsedBudget.budgetMax) : null,
    };

    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMsg(`Failed to save prospect: ${errorMessageFromJson(data)}`);
        return;
      }

      setSuccessMsg("Saved. Returning to prospect…");
      setTimeout(() => {
        router.push(`/leads/${lead.id}`);
        router.refresh();
      }, 600);
    } catch (err) {
      const detail =
        err instanceof TypeError && (err.message === "Failed to fetch" || err.message === "Load failed")
          ? "Could not reach the server."
          : err instanceof Error
            ? err.message
            : "Network error";
      setErrorMsg(`Failed to save prospect: ${detail}`);
    } finally {
      setSaving(false);
    }
  }

  const fieldDisabled = saving;
  const fieldClass =
    "mt-2 w-full rounded-lg border border-light-grey bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className="max-w-2xl">
      <form onSubmit={guardForm} className="space-y-0" noValidate>
        {saving ? (
          <div className="mb-6 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-navy" role="status">
            Saving…
          </div>
        ) : successMsg ? (
          <div
            className="mb-6 rounded-lg border border-success/50 bg-success/10 px-4 py-3 text-sm text-navy shadow-sm"
            role="status"
            aria-live="polite"
          >
            <div className="font-semibold text-navy">Prospect updated</div>
            <p className="mt-1 text-medium-grey leading-snug">{successMsg}</p>
          </div>
        ) : errorMsg ? (
          <div className="mb-6 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-navy whitespace-pre-line">
            {errorMsg}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <label className="sm:col-span-2 block">
            <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">
              Full name <span className="text-gold">*</span>
            </span>
            <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} disabled={fieldDisabled} />
          </label>

          <label className="block">
            <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">Phone</span>
            <input className={fieldClass} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={fieldDisabled} />
          </label>

          <label className="block">
            <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">Email</span>
            <input
              className={fieldClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={fieldDisabled}
            />
          </label>

          <label className="block">
            <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">Source</span>
            <select className={fieldClass} value={source} onChange={(e) => setSource(e.target.value)} disabled={fieldDisabled}>
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">Status</span>
            <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value)} disabled={fieldDisabled}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">Urgency</span>
            <select
              className={fieldClass}
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as UrgencyValue)}
              disabled={fieldDisabled}
            >
              {URGENCY_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">Language</span>
            <input className={fieldClass} value={language} onChange={(e) => setLanguage(e.target.value)} disabled={fieldDisabled} />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">Budget</span>
            <input
              className={fieldClass}
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="e.g. 3 crore, 10-12 crore, 50 lakh"
              disabled={fieldDisabled}
            />
            <span className="mt-1 block text-[11px] text-medium-grey/80">
              {budgetInput.trim() && !parsedBudget ? (
                <span className="text-error">Please enter budget like 3 crore or 10-12 crore.</span>
              ) : (
                <span>Tip: you can type “50 lakh” or “10-12 crore”.</span>
              )}
            </span>
          </label>

          <label className="block">
            <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">Unit preference</span>
            <select className={fieldClass} value={preferredUnit} onChange={(e) => setPreferredUnit(e.target.value)} disabled={fieldDisabled}>
              {UNITS.map((u) => (
                <option key={u.value === "" ? "__empty" : u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">View preference</span>
            <select className={fieldClass} value={preferredView} onChange={(e) => setPreferredView(e.target.value)} disabled={fieldDisabled}>
              {VIEWS.map((v) => (
                <option key={v.value === "" ? "__empty" : v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">Notes</span>
            <textarea
              className={[fieldClass, "min-h-[120px]"].join(" ")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={fieldDisabled}
            />
          </label>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-lg px-6 py-3 text-sm font-semibold text-white bg-[linear-gradient(135deg,#C9A84C,#A6862E)] shadow-gold hover:shadow-[0_0_28px_rgba(201,168,76,0.22)] transition-shadow disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          <Link
            href={`/leads/${lead.id}`}
            className="rounded-lg border border-light-grey bg-white px-6 py-3 text-sm font-semibold text-navy hover:border-gold hover:bg-cream/40 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

