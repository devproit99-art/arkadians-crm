import type { LatestBrowserTestRow } from "@/lib/get-lead-call-logs";
import type { LeadActivityRow } from "@/lib/get-lead-activities";
import { deriveClientProgress } from "@/lib/client-progress";

type LeadLike = {
  name?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  urgency?: string | null;
  preferredUnit?: string | null;
  preferredView?: string | null;
  status?: string | null;
  notes?: string | null;
};

export type ProspectScoreResult = {
  score: number;
  label: "Closing / Client" | "Hot" | "Warm" | "Cold";
  reasons: string[];
  recommendedAction: string;
};

function includesAny(hay: string, needles: string[]): boolean {
  const t = hay.toLowerCase();
  return needles.some((n) => t.includes(n));
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function scoreProspect(
  lead: LeadLike,
  latestCallLog?: Pick<LatestBrowserTestRow, "summary" | "transcript"> | null,
  latestActivity?: Pick<LeadActivityRow, "dueLabel" | "title" | "status"> | null,
): ProspectScoreResult {
  const reasons: string[] = [];
  let score = 0;

  const summary = latestCallLog?.summary ?? "";
  const transcript = latestCallLog?.transcript ?? "";
  const notes = lead.notes ?? "";
  const combinedText = `${summary}\n${transcript}\n${notes}`.toLowerCase();

  const progress = deriveClientProgress({
    status: lead.status ?? null,
    notes: lead.notes ?? null,
    latestActivityTitle: latestActivity?.title ?? null,
    latestCallSummary: summary,
    latestCallTranscript: transcript,
  });

  const hasBudget = lead.budgetMin != null || lead.budgetMax != null || combinedText.includes("budget:");
  if (hasBudget) {
    score += 20;
    reasons.push("Budget captured");
  }

  const intentSoon =
    (lead.urgency ?? "").toLowerCase() === "high" ||
    (lead.urgency ?? "").toLowerCase() === "immediate" ||
    includesAny(combinedText, ["buying soon", "jaldi lena", "jaldi purchase", "jaldi khareed"]);
  if (intentSoon) {
    score += 20;
    reasons.push("High buying intent");
  }

  const hasProperty = Boolean(lead.preferredUnit?.trim()) || includesAny(combinedText, ["penthouse", "bedroom", "3 bedroom", "2 bedroom"]);
  if (hasProperty) {
    score += 15;
    reasons.push("Property interest captured");
  }

  const hasCallback =
    Boolean(latestActivity?.dueLabel) ||
    includesAny(combinedText, ["callback confirmed", "ai callback confirmed", "callback:", "call kis waqt"]);
  if (hasCallback) {
    score += 15;
    reasons.push("Callback time confirmed");
  }

  const whatsappYes = includesAny(combinedText, ["whatsapp confirmation: yes", "whatsapp: yes", "whatsapp: true"]);
  if (whatsappYes) {
    score += 10;
    reasons.push("WhatsApp confirmation received");
  }

  const minBudget = typeof lead.budgetMin === "number" ? lead.budgetMin : null;
  if (minBudget != null && minBudget >= 50_000_000) {
    score += 10;
    reasons.push("Budget meets premium threshold");
  }

  const hasView = Boolean(lead.preferredView?.trim()) || includesAny(combinedText, ["sea view", "city view", "golf view"]);
  if (hasView) {
    score += 5;
    reasons.push("View preference captured");
  }

  // Sales progress points (demo-derived)
  if (progress.flags.viewingBooked || (lead.status ?? "").toLowerCase() === "viewing_booked") {
    score += 20;
    reasons.push("Viewing booked");
  }
  if (progress.flags.apartmentViewed) {
    score += 25;
    reasons.push("Apartment viewed / client visited");
  }
  if (progress.flags.reserved) {
    score += 25;
    reasons.push("Reserved / booking pending");
  }
  if (progress.flags.depositPaid) {
    score += 30;
    reasons.push("Deposit paid");
  }
  if (progress.flags.paymentPlanActive) {
    score += 35;
    reasons.push("Payment plan active");
  }
  if (progress.flags.closedWon || (lead.status ?? "").toLowerCase() === "closed_won") {
    score += 50;
    reasons.push("Closed won");
  }

  // Light progress boost for active stages.
  if (includesAny((lead.status ?? "").toLowerCase(), ["contacted", "viewing_booked", "negotiating", "closed_won"])) {
    score += 5;
  }

  score = clamp(score, 0, 100);

  const label: ProspectScoreResult["label"] =
    score >= 85 ? "Closing / Client" : score >= 75 ? "Hot" : score >= 45 ? "Warm" : "Cold";

  const recommendedAction = progress.flags.apartmentViewed && !progress.flags.depositPaid && !progress.flags.paymentPlanActive
    ? "Follow up for booking deposit."
    : progress.flags.reserved && !progress.flags.depositPaid
      ? "Collect deposit / confirm booking."
      : progress.flags.depositPaid && !progress.flags.paymentPlanActive
        ? "Move to payment plan tracking."
        : progress.flags.paymentPlanActive
          ? "Monitor payment schedule."
          : label === "Hot"
            ? "Senior consultant should call at confirmed callback time."
            : label === "Warm"
              ? "Send WhatsApp confirmation and follow up."
              : "Nurture with project information.";

  // Keep reasons short (demo-friendly)
  const uniqueReasons = Array.from(new Set(reasons)).slice(0, 5);

  return { score, label, reasons: uniqueReasons, recommendedAction };
}

