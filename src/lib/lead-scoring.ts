export type LeadScoreTemperature = "Hot" | "Warm" | "Cold";

export type LeadScoreResult = {
  score: number; // 0..100
  temperature: LeadScoreTemperature;
  reasons: string[];
  recommendedNextAction: string;
};

export type LeadScoringLeadLike = {
  status: string;
  budgetMin?: bigint | number | null;
  budgetMax?: bigint | number | null;
  urgency?: string | null;
  notes?: string | null;
  source?: string | null;
  preferredUnit?: string | null;
  preferredView?: string | null;
  lastCallAt?: Date | string | number | null;
  updatedAt?: Date | string | number | null;
};

export type LeadScoringSignals = {
  latestActivity?: {
    type: string;
    status: string;
    title: string;
    dueAt?: Date | string | number | null;
  } | null;
  nextActivity?: {
    type: string;
    status: string;
    title: string;
    dueAt?: Date | string | number | null;
  } | null;
  latestCallSummary?: string | null;
  latestCallTranscript?: string | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toText(...bits: Array<string | null | undefined>) {
  return bits.filter(Boolean).join("\n").toLowerCase();
}

function hasAny(text: string, keywords: string[]) {
  for (const k of keywords) if (text.includes(k)) return true;
  return false;
}

function countHits(text: string, keywords: string[]) {
  let n = 0;
  for (const k of keywords) if (text.includes(k)) n++;
  return n;
}

function bigIntFromMaybe(v: bigint | number | null | undefined) {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return v;
  if (!Number.isFinite(v)) return null;
  // budgets stored in PKR; safe-ish conversion for demo
  return BigInt(Math.trunc(v));
}

function daysSince(d: Date | string | number | null | undefined) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const diffMs = Date.now() - dt.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

function temperatureFor(score: number): LeadScoreTemperature {
  if (score >= 75) return "Hot";
  if (score >= 45) return "Warm";
  return "Cold";
}

function stagePoints(statusRaw: string) {
  const s = (statusRaw ?? "").toLowerCase();
  if (s.includes("closed_won") || s.includes("won")) return 50;
  if (s.includes("reserved") || s.includes("deposit")) return 40;
  if (s.includes("payment") || s.includes("plan")) return 35;
  if (s.includes("negotiat") || s.includes("shortlist")) return 25;
  if (s.includes("viewing") || s.includes("meeting")) return 20;
  if (s.includes("contacted") || s.includes("qualified")) return 12;
  if (s.includes("new")) return 6;
  if (s.includes("cold") || s.includes("lost")) return -15;
  return 8;
}

function budgetPoints(min: bigint | null, max: bigint | null) {
  const v = max ?? min;
  if (!v) return 0;
  const crore = BigInt(10_000_000); // PKR 1 crore
  if (v >= BigInt(50) * crore) return 30;
  if (v >= BigInt(20) * crore) return 24;
  if (v >= BigInt(10) * crore) return 18;
  if (v >= BigInt(5) * crore) return 12;
  if (v >= BigInt(2) * crore) return 8;
  return 4;
}

export function scoreLead(
  lead: LeadScoringLeadLike,
  signals: LeadScoringSignals = {},
): LeadScoreResult {
  const reasons: string[] = [];
  let score = 0;

  const min = bigIntFromMaybe(lead.budgetMin ?? null);
  const max = bigIntFromMaybe(lead.budgetMax ?? null);

  // Budget/value signal
  const bPts = budgetPoints(min, max);
  if (bPts > 0) reasons.push(bPts >= 18 ? "Strong budget signal" : "Budget provided");
  score += bPts;

  // Pipeline stage/status
  const sPts = stagePoints(lead.status);
  if (sPts >= 20) reasons.push("Advanced in pipeline");
  if (sPts < 0) reasons.push("Stage indicates low intent");
  score += sPts;

  const combinedText = toText(
    lead.notes ?? null,
    signals.latestActivity?.title ?? null,
    signals.latestCallSummary ?? null,
    typeof signals.latestCallTranscript === "string" ? signals.latestCallTranscript : null,
  );

  const strongKeywords = [
    "urgent",
    "ready",
    "serious",
    "investor",
    "family",
    "shortlisted",
    "payment plan",
    "installment",
    "deposit",
    "book",
    "booking",
    "interested",
    "confirm",
    "final",
    "visit",
    "viewing",
    "meeting",
  ];
  const weakKeywords = [
    "not interested",
    "no answer",
    "later",
    "low budget",
    "cold",
    "wrong number",
    "invalid",
    "do not call",
    "not now",
    "busy",
  ];

  const strongHits = countHits(combinedText, strongKeywords);
  const weakHits = countHits(combinedText, weakKeywords);
  if (strongHits > 0) reasons.push("Positive intent signals in notes/calls");
  if (weakHits > 0) reasons.push("Negative intent signals in notes/calls");
  score += clamp(strongHits * 4, 0, 18);
  score -= clamp(weakHits * 7, 0, 28);

  // Booking / callback / viewing signals from activities
  const latestActType = (signals.latestActivity?.type ?? "").toLowerCase();
  const latestActTitle = (signals.latestActivity?.title ?? "").toLowerCase();
  const nextActType = (signals.nextActivity?.type ?? "").toLowerCase();
  const nextActTitle = (signals.nextActivity?.title ?? "").toLowerCase();
  const isCallbackBooked =
    hasAny(nextActType, ["follow"]) ||
    nextActTitle.includes("callback") ||
    latestActTitle.includes("callback confirmed");
  const isViewingBooked = nextActTitle.includes("viewing") || nextActType.includes("view");
  const isMeetingBooked = nextActTitle.includes("meeting") || nextActType.includes("meeting");

  if (isCallbackBooked) {
    score += 10;
    reasons.push("Callback booked");
  }
  if (isViewingBooked) {
    score += 14;
    reasons.push("Viewing booked");
  }
  if (isMeetingBooked) {
    score += 10;
    reasons.push("Meeting booked");
  }

  const latestCompleted =
    (signals.latestActivity?.status ?? "").toLowerCase() === "completed" ||
    latestActTitle.includes("completed") ||
    latestActTitle.includes("done");
  if (latestCompleted && (latestActTitle.includes("viewing") || latestActType.includes("view"))) {
    score += 18;
    reasons.push("Viewing completed");
  } else if (latestCompleted && (latestActTitle.includes("meeting") || latestActType.includes("meeting"))) {
    score += 14;
    reasons.push("Meeting completed");
  }

  // Payment/deposit keywords
  if (hasAny(combinedText, ["deposit", "token", "advance", "paid", "payment plan", "installment"])) {
    score += 14;
    reasons.push("Payment/deposit signals");
  }

  // Recency
  const sinceUpdate = daysSince(lead.updatedAt ?? null);
  if (sinceUpdate !== null) {
    if (sinceUpdate <= 2) {
      score += 6;
      reasons.push("Recent engagement");
    } else if (sinceUpdate >= 14) {
      score -= 6;
      reasons.push("Stale / needs reactivation");
    }
  }

  const sinceCall = daysSince(lead.lastCallAt ?? null);
  if (sinceCall !== null && sinceCall <= 7) {
    score += 4;
  }

  score = clamp(Math.round(score), 0, 100);
  const temperature = temperatureFor(score);

  // Keep reasons short and non-repetitive (top 4)
  const uniq = Array.from(new Set(reasons)).slice(0, 4);

  const recommendedNextAction =
    temperature === "Hot"
      ? isViewingBooked
        ? "Confirm viewing details and prepare pricing/payment options."
        : isCallbackBooked
          ? "Call at the confirmed time and move to viewing booking."
          : "Call now and book a viewing or meeting."
      : temperature === "Warm"
        ? "Send WhatsApp confirmation and propose a specific callback time."
        : "Send a reactivation message and qualify budget + timeline.";

  return { score, temperature, reasons: uniq, recommendedNextAction };
}

