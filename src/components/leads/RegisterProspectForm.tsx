"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { parseBudgetInput, formatBudget } from "@/lib/budget";

/** Optional override e.g. http://144.91.117.236:3001/api/leads — defaults to same-origin /api/leads. */
function leadsPostUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_LEADS_API_URL;
  if (typeof fromEnv === "string" && fromEnv.length > 0) return fromEnv;
  if (typeof window !== "undefined") return `${window.location.origin}/api/leads`;
  return "/api/leads";
}

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

const URGENCY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "immediate", label: "Immediate" },
] as const;

type UrgencyValue = (typeof URGENCY_OPTIONS)[number]["value"];

type CreateLeadResponse = { data?: { id?: string } };
type InventoryStage = "interested" | "deposit_taken" | "payment_given";
type InventoryUnit = {
  id: string;
  tower?: string;
  flatNumber?: string;
  viewCategory?: string;
  type?: string;
  status?: string;
  customerName?: string;
};

function paymentFromStage(stage: InventoryStage) {
  if (stage === "payment_given") {
    return { deposit: "Taken", instalment: "Started" };
  }
  if (stage === "deposit_taken") {
    return { deposit: "Taken", instalment: "Pending" };
  }
  return { deposit: "Pending", instalment: "Not started" };
}

function errorMessageFromJson(json: unknown): string {
  if (!json || typeof json !== "object" || !("error" in json)) {
    return "Could not create prospect.";
  }
  const err = (json as { error?: unknown }).error;
  if (!err || typeof err !== "object") return "Could not create prospect.";
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

export function RegisterProspectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("walk_in");
  const [budgetInput, setBudgetInput] = useState("");
  const [preferredUnit, setPreferredUnit] = useState("");
  const [preferredView, setPreferredView] = useState("");
  const [urgency, setUrgency] = useState<UrgencyValue>("medium");
  const [saving, setSaving] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [inventoryUnits, setInventoryUnits] = useState<InventoryUnit[]>([]);
  const [inventoryFilter, setInventoryFilter] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<InventoryUnit | null>(null);
  const [inventoryStage, setInventoryStage] = useState<InventoryStage>("interested");

  function guardForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    void handleSave();
  }

  async function handleSave() {
    console.log("SAVE CLICKED");
    console.log("Saving...");

    setSuccessMsg(null);
    setErrorMsg(null);
    setRedirecting(false);

    if (!name.trim()) {
      setErrorMsg("Failed to save prospect: Name is required.");
      return;
    }

    const budgetTrim = budgetInput.trim();
    const parsedBudget = budgetTrim ? parseBudgetInput(budgetTrim) : null;
    if (budgetTrim && (!parsedBudget || (parsedBudget.budgetMin == null && parsedBudget.budgetMax == null))) {
      setErrorMsg("Failed to save prospect: Please enter budget like 3 crore or 10-12 crore.");
      return;
    }

    const urgencyPayload: UrgencyValue = URGENCY_OPTIONS.some((o) => o.value === urgency)
      ? urgency
      : "medium";

    const formData: Record<string, unknown> = {
      name: name.trim(),
      source,
      urgency: urgencyPayload,
    };

    const phoneTrim = phone.trim();
    if (phoneTrim) formData.phone = phoneTrim;

    const emailTrim = email.trim();
    if (emailTrim) formData.email = emailTrim;

    if (parsedBudget?.budgetMin != null) formData.budgetMin = Number(parsedBudget.budgetMin);
    if (parsedBudget?.budgetMax != null) formData.budgetMax = Number(parsedBudget.budgetMax);

    if (preferredUnit) formData.preferredUnit = preferredUnit;
    if (preferredView) formData.preferredView = preferredView;
    if (selectedUnit?.flatNumber) {
      const payment = paymentFromStage(inventoryStage);
      const stageLabel =
        inventoryStage === "interested"
          ? "Interested"
          : inventoryStage === "deposit_taken"
            ? "Deposit taken"
            : "Payment given";
      const inventoryLine = [
        `Inventory tracking:`,
        `Flat ${selectedUnit.flatNumber}${selectedUnit.tower ? ` (Tower ${selectedUnit.tower})` : ""}`,
        `${selectedUnit.type ? `Type: ${selectedUnit.type}` : ""}`,
        `${selectedUnit.viewCategory ? `View: ${selectedUnit.viewCategory}` : ""}`,
        `Client stage: ${stageLabel}`,
        `Deposit: ${payment.deposit}`,
        `Instalment: ${payment.instalment}`,
      ]
        .filter(Boolean)
        .join(" · ");
      formData.notes = inventoryLine;
    }

    const url = leadsPostUrl();
    console.log("Submitting lead", formData, "→", url);
    setSaving(true);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      console.log("POST status", res.status);

      const data: unknown = await res.json().catch(() => null);
      console.log("Saved:", data);

      if (!res.ok) {
        setErrorMsg(`Failed to save prospect: ${errorMessageFromJson(data)}`);
        return;
      }

      const parsed = data as CreateLeadResponse;
      const id = parsed?.data?.id;
      if (typeof id !== "string" || id.length === 0) {
        setErrorMsg("Failed to save prospect: Missing id in response.");
        return;
      }

      setSuccessMsg("You’ll be taken to the pipeline in a moment.");
      setRedirecting(true);
      setTimeout(() => {
        router.push("/pipeline");
      }, 1400);
    } catch (err) {
      console.error("Save failed:", err);
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

  const fieldDisabled = saving || redirecting;
  const fieldClass =
    "mt-2 w-full rounded-lg border border-light-grey bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-60 disabled:cursor-not-allowed";
  const inventoryFiltered = inventoryUnits.filter((u: any) => {
    const q = inventoryFilter.trim().toLowerCase();
    if (!q) return true;
    return [u.flatNumber, u.tower, u.viewCategory, u.type].some((v) =>
      (v ?? "").toLowerCase().includes(q),
    );
  });

  function openInventoryPicker() {
    try {
      const raw = localStorage.getItem("arkadians_inventory_units");
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const list = Array.isArray(parsed) ? (parsed as InventoryUnit[]) : [];
      const available = list.filter(
        (u) =>
          (u.status ?? "").toLowerCase() === "available" &&
          !(u.customerName ?? "").trim(),
      );
      setInventoryUnits(available);
    } catch {
      setInventoryUnits([]);
    }
    setInventoryFilter("");
    setInventoryModalOpen(true);
  }

  const statusBanner =
    saving ? (
      <div
        className="mb-6 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-navy"
        role="status"
        aria-live="polite"
      >
        Saving…
      </div>
    ) : successMsg ? (
      <div
        className="mb-6 rounded-lg border border-success/50 bg-success/10 px-4 py-3 text-sm text-navy shadow-sm"
        role="status"
        aria-live="polite"
      >
        <div className="font-semibold text-navy">Prospect saved</div>
        <p className="mt-1 text-medium-grey leading-snug">{successMsg}</p>
      </div>
    ) : errorMsg ? (
      <div className="mb-6 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-navy whitespace-pre-line">
        {errorMsg}
      </div>
    ) : null;

  return (
    <div className="w-full max-w-none">
      <form onSubmit={guardForm} className="space-y-0" noValidate>
        {statusBanner}

        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <label className="sm:col-span-2 block">
                <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">
                  Full name <span className="text-gold">*</span>
                </span>
                <input
                  className={fieldClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  name="prospectName"
                  disabled={fieldDisabled}
                />
              </label>

              <label className="block">
                <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">Phone</span>
                <input
                  className={fieldClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  name="prospectPhone"
                  disabled={fieldDisabled}
                />
              </label>

              <label className="block">
                <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">Email</span>
                <input
                  className={fieldClass}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  name="prospectEmail"
                  disabled={fieldDisabled}
                />
              </label>

              <label className="block">
                <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">Source</span>
                <select
                  className={fieldClass}
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  name="prospectSource"
                  disabled={fieldDisabled}
                >
                  {SOURCES.map((s: any) => (
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
                  name="prospectUrgency"
                  disabled={fieldDisabled}
                >
                  {URGENCY_OPTIONS.map((u: any) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">
                  Budget
                </span>
                <input
                  className={fieldClass}
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="e.g. 3 crore, 10-12 crore, 80-150 crore"
                  name="prospectBudget"
                  disabled={fieldDisabled}
                />
                <span className="mt-1 block text-[11px] text-medium-grey/80">
                  Saved as:{" "}
                  {(() => {
                    const t = budgetInput.trim();
                    if (!t) return "Not set";
                    const p = parseBudgetInput(t);
                    if (p.budgetMin == null && p.budgetMax == null) return "—";
                    return formatBudget(p.budgetMin, p.budgetMax);
                  })()}
                </span>
              </label>

              <label className="block">
                <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">Unit preference</span>
                <select
                  className={fieldClass}
                  value={preferredUnit}
                  onChange={(e) => setPreferredUnit(e.target.value)}
                  name="prospectUnit"
                  disabled={fieldDisabled}
                >
                  {UNITS.map((u: any) => (
                    <option key={u.value === "" ? "__empty" : u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs tracking-[0.2em] uppercase text-medium-grey">View preference</span>
                <select
                  className={fieldClass}
                  value={preferredView}
                  onChange={(e) => setPreferredView(e.target.value)}
                  name="prospectView"
                  disabled={fieldDisabled}
                >
                  {VIEWS.map((v: any) => (
                    <option key={v.value === "" ? "__empty" : v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="sm:col-span-2 rounded-lg border border-light-grey bg-cream/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Inventory attachment</div>
                    <p className="mt-1 text-sm text-medium-grey">
                      Keep this client linked to a flat and update client stage cleanly in this form.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openInventoryPicker}
                    className="rounded-lg border border-navy/20 bg-navy px-3 py-2 text-[11px] font-semibold tracking-[0.15em] uppercase text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow"
                  >
                    Select Flat
                  </button>
                </div>
                {selectedUnit ? (
                  <div className="mt-3 rounded-lg border border-light-grey bg-white p-3">
                    <div className="text-sm font-semibold text-navy">
                      {selectedUnit.flatNumber ?? "Flat"} {selectedUnit.tower ? `· Tower ${selectedUnit.tower}` : ""}
                    </div>
                    <div className="mt-1 text-xs text-medium-grey">
                      {[selectedUnit.type, selectedUnit.viewCategory].filter(Boolean).join(" · ") || "Details not set"}
                    </div>
                    <div className="mt-3">
                      <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Client stage</div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          ["interested", "Interested"],
                          ["deposit_taken", "Deposit Taken"],
                          ["payment_given", "Payment Given"],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setInventoryStage(value as InventoryStage)}
                            className={[
                              "rounded-lg border px-3 py-2 text-xs font-semibold tracking-[0.08em] uppercase transition-colors",
                              inventoryStage === value
                                ? "border-gold bg-cream text-navy"
                                : "border-light-grey bg-white text-medium-grey hover:border-gold/40",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg border border-light-grey bg-cream/20 p-3">
                      <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Payment schedule</div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md border border-light-grey bg-white px-3 py-2 text-navy">
                          Deposit: <span className="font-semibold">{paymentFromStage(inventoryStage).deposit}</span>
                        </div>
                        <div className="rounded-md border border-light-grey bg-white px-3 py-2 text-navy">
                          Instalment: <span className="font-semibold">{paymentFromStage(inventoryStage).instalment}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-medium-grey">No flat selected yet.</p>
                )}
                <Link href="/inventory" className="mt-3 inline-flex text-sm font-medium text-navy hover:text-gold transition-colors">
                  Open full inventory page →
                </Link>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || redirecting}
                className="rounded-lg px-6 py-3 text-sm font-semibold text-white bg-[linear-gradient(135deg,#C9A84C,#A6862E)] shadow-gold hover:shadow-[0_0_28px_rgba(201,168,76,0.22)] transition-shadow disabled:opacity-50"
              >
                {redirecting ? "Redirecting…" : saving ? "Saving…" : "Save prospect"}
              </button>
            </div>
          </div>

        </div>
      </form>

      {inventoryModalOpen ? (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-xl border border-light-grey bg-white shadow-card">
            <div className="flex items-center justify-between gap-3 border-b border-light-grey px-5 py-4">
              <div>
                <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Inventory picker</div>
                <div className="mt-1 text-lg font-(--font-display) text-navy">Select available flat</div>
              </div>
              <button
                type="button"
                onClick={() => setInventoryModalOpen(false)}
                className="rounded-lg border border-light-grey bg-white px-3 py-2 text-xs font-semibold tracking-[0.15em] uppercase text-medium-grey hover:bg-cream/40 hover:text-navy transition-colors"
              >
                Close
              </button>
            </div>
            <div className="p-5">
              <input
                value={inventoryFilter}
                onChange={(e) => setInventoryFilter(e.target.value)}
                placeholder="Search flat / tower / view / type"
                className="w-full rounded-lg border border-light-grey bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
              <div className="mt-4 max-h-[52vh] overflow-auto rounded-lg border border-light-grey">
                {inventoryFiltered.length === 0 ? (
                  <div className="p-4 text-sm text-medium-grey">No available flats found.</div>
                ) : (
                  <ul className="divide-y divide-light-grey">
                    {inventoryFiltered.slice(0, 200).map((u: any) => (
                      <li key={u.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-navy">
                            {u.flatNumber ?? "Flat"} {u.tower ? `· Tower ${u.tower}` : ""}
                          </div>
                          <div className="mt-1 text-xs text-medium-grey">
                            {[u.type, u.viewCategory].filter(Boolean).join(" · ") || "Details not set"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUnit(u);
                            setInventoryModalOpen(false);
                          }}
                          className="shrink-0 rounded-lg border border-navy/20 bg-navy px-3 py-2 text-[11px] font-semibold tracking-[0.15em] uppercase text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow"
                        >
                          Select
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-3 text-xs text-medium-grey">
                Need full controls?{" "}
                <Link href="/inventory" className="font-semibold text-navy hover:text-gold transition-colors">
                  Open inventory page
                </Link>
                .
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <Link
          href="/leads"
          className="text-sm font-medium text-medium-grey hover:text-navy transition-colors"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}

