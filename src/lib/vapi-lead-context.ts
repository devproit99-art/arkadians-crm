import { formatBudgetInput, parseBudgetInput } from "@/lib/budget";
import { DEFAULT_TZ, formatDateOnly, formatDateTime12, formatTime12 } from "@/lib/datetime";

type LeadLike = {
  id: string;
  name?: string | null;
  budgetMin?: bigint | number | null;
  budgetMax?: bigint | number | null;
  preferredUnit?: string | null;
  preferredView?: string | null;
  urgency?: string | null;
};

export type VapiLeadContext = {
  leadId: string;
  name: string;
  propertyInterest: string;
  budgetText: string;
  buyingIntent: string;
  preferredView: string;
  currentDate: string;
  currentTime: string;
  currentDateTime: string;
  timezone: string;
};

function toBigIntOrNull(v: bigint | number | null | undefined): bigint | null {
  if (v == null) return null;
  if (typeof v === "bigint") return v;
  if (typeof v === "number" && Number.isFinite(v)) return BigInt(Math.trunc(v));
  return null;
}

function normalizeKey(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function unitToPropertyInterest(raw: string | null | undefined): string {
  const k = normalizeKey(raw);
  if (!k) return "";
  if (k.includes("penthouse")) return "penthouse";
  if (k.includes("one_bed") || k.includes("1_bed")) return "1 bedroom flat";
  if (k.includes("two_bed") || k.includes("2_bed")) return "2 bedroom flat";
  if (k.includes("three_bed") || k.includes("3_bed")) return "3 bedroom flat";
  if (k.includes("four_bed") || k.includes("4_bed") || k.includes("duplex")) return "4 bedroom duplex";
  return raw?.replaceAll("_", " ").trim() ?? "";
}

function viewToPreferredView(raw: string | null | undefined): string {
  const k = normalizeKey(raw);
  if (!k) return "";
  if (k.includes("sea")) return "sea view";
  if (k.includes("city")) return "city view";
  if (k.includes("golf")) return "golf view";
  if (k.includes("dual")) return "sea and golf view";
  // tolerate alternate keys
  if (k.includes("sea_view")) return "sea view";
  if (k.includes("city_view")) return "city view";
  return raw?.replaceAll("_", " ").trim() ?? "";
}

function urgencyToBuyingIntent(raw: string | null | undefined): string {
  const k = normalizeKey(raw);
  if (!k) return "";
  if (k === "high" || k === "immediate") return "jaldi lena";
  if (k === "medium") return "warm enquiry";
  if (k === "low") return "abhi dekh rahe hain";
  return "";
}

function budgetToBudgetText(min: bigint | null, max: bigint | null): string {
  if (!min && !max) return "";

  const minInput = min ? formatBudgetInput(min, min) : "";
  const maxInput = max ? formatBudgetInput(max, max) : "";

  // Prefer “PKR X to Y crore” wording when both present.
  if (min && max) {
    const minParsed = minInput ? parseBudgetInput(minInput) : null;
    const maxParsed = maxInput ? parseBudgetInput(maxInput) : null;
    const minText = minParsed?.budgetText || minInput;
    const maxText = maxParsed?.budgetText || maxInput;
    const unit = minText.includes("crore") || maxText.includes("crore") ? "crore" : "lakh";
    const left = minText.replace(/\s*(crore|lakh)\b/i, "").trim();
    const right = maxText.replace(/\s*(crore|lakh)\b/i, "").trim();
    if (left && right) return `PKR ${left} to ${right} ${unit}`;
  }

  if (min) {
    const parsed = minInput ? parseBudgetInput(minInput) : null;
    const text = parsed?.budgetText || minInput;
    return text ? `around PKR ${text}` : "";
  }

  const parsed = maxInput ? parseBudgetInput(maxInput) : null;
  const text = parsed?.budgetText || maxInput;
  return text ? `up to PKR ${text}` : "";
}

export function buildVapiLeadContext(
  lead: LeadLike,
  options?: { now?: Date; timeZone?: string },
): VapiLeadContext {
  const now = options?.now ?? new Date();
  const timeZone = options?.timeZone ?? DEFAULT_TZ;
  const min = toBigIntOrNull(lead.budgetMin);
  const max = toBigIntOrNull(lead.budgetMax);

  return {
    leadId: lead.id,
    name: (lead.name ?? "").trim(),
    propertyInterest: unitToPropertyInterest(lead.preferredUnit),
    budgetText: budgetToBudgetText(min, max),
    buyingIntent: urgencyToBuyingIntent(lead.urgency),
    preferredView: viewToPreferredView(lead.preferredView),
    currentDate: formatDateOnly(now, timeZone),
    currentTime: formatTime12(now, timeZone),
    currentDateTime: formatDateTime12(now, timeZone),
    timezone: timeZone,
  };
}

