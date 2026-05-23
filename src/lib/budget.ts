const CRORE_PKR = BigInt(10_000_000);
const LAKH_PKR = BigInt(100_000);

type ParsedBudget = {
  budgetMin: bigint | null;
  budgetMax: bigint | null;
  budgetText: string;
};

function normalizeRawInput(input: string): string {
  return input
    .trim()
    .replace(/[,]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function parseNumber(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function formatCroreNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  // keep at most 1 decimal for friendly display
  return n.toFixed(1).replace(/\.0$/, "");
}

export function formatBudgetInput(budgetMin?: bigint | null, budgetMax?: bigint | null): string {
  const min = budgetMin ?? null;
  const max = budgetMax ?? null;
  if (!min && !max) return "";

  if (min && max) {
    const a = formatFromPkr(min);
    const b = formatFromPkr(max);
    if (a.unit === "crore" && b.unit === "crore") {
      const minCr = formatCroreNumber(a.value);
      const maxCr = formatCroreNumber(b.value);
      if (minCr === maxCr) return `${minCr} crore`;
      return `${minCr}-${maxCr} crore`;
    }
    const minL = formatCroreNumber(a.unit === "lakh" ? a.value : (Number(min) / Number(LAKH_PKR)));
    const maxL = formatCroreNumber(b.unit === "lakh" ? b.value : (Number(max) / Number(LAKH_PKR)));
    if (minL === maxL) return `${minL} lakh`;
    return `${minL}-${maxL} lakh`;
  }

  const only = max ?? min!;
  const f = formatFromPkr(only);
  return `${formatCroreNumber(f.value)} ${f.unit}`;
}

function formatFromPkr(pkr: bigint): { unit: "crore" | "lakh"; value: number } {
  // Prefer "crore" unless it's < 1 crore but >= 1 lakh.
  if (pkr >= CRORE_PKR) {
    const v = Number(pkr) / Number(CRORE_PKR);
    return { unit: "crore", value: v };
  }
  if (pkr >= LAKH_PKR) {
    const v = Number(pkr) / Number(LAKH_PKR);
    return { unit: "lakh", value: v };
  }
  // fall back to lakh for small values too
  const v = Number(pkr) / Number(LAKH_PKR);
  return { unit: "lakh", value: v };
}

/**
 * Parse user-friendly Pakistani real estate budget input.
 *
 * Examples:
 * - "3 crore" → 30,000,000
 * - "10-12 crore" → 100,000,000–120,000,000
 * - "50 lakh" → 5,000,000
 * - "1.5 crore" → 15,000,000
 */
export function parseBudgetInput(input: string): ParsedBudget {
  const raw = input ?? "";
  const normalized = normalizeRawInput(raw);
  if (!normalized) return { budgetMin: null, budgetMax: null, budgetText: "" };

  // Strip currency prefixes
  const s = normalized.replace(/^pkr\s+/i, "").replace(/^rs\.?\s+/i, "").trim();

  const unit =
    s.includes("lakh") || s.includes("lac") || s.includes("lacs") || s.includes("lakhs")
      ? "lakh"
      : s.includes("crore") || /\bcr\b/.test(s) || s.includes("crores") || s.includes("cror") || s.includes("karor")
        ? "crore"
        : null;

  if (!unit) {
    return { budgetMin: null, budgetMax: null, budgetText: "" };
  }

  const unitMultiplier = unit === "crore" ? CRORE_PKR : LAKH_PKR;

  // allow "3crore" / "3 cr" etc.
  const cleaned = s
    .replace(/crores?/g, "crore")
    .replace(/\bcr\b/g, "crore")
    .replace(/lacs?/g, "lakh")
    .replace(/lakhs?/g, "lakh")
    .replace(/([0-9])\s*(crore|lakh)/g, "$1 $2")
    .trim();

  const rangeMatch = cleaned.match(
    /^(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(crore|lakh)\b/,
  );
  if (rangeMatch) {
    const a = parseNumber(rangeMatch[1]);
    const b = parseNumber(rangeMatch[2]);
    if (a == null || b == null) return { budgetMin: null, budgetMax: null, budgetText: "" };
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    const budgetMin = BigInt(Math.round(min * Number(unitMultiplier)));
    const budgetMax = BigInt(Math.round(max * Number(unitMultiplier)));
    const budgetText = `${formatCroreNumber(min)}–${formatCroreNumber(max)} ${unit}`;
    return { budgetMin, budgetMax, budgetText };
  }

  const singleMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(crore|lakh)\b/);
  if (singleMatch) {
    const a = parseNumber(singleMatch[1]);
    if (a == null) return { budgetMin: null, budgetMax: null, budgetText: "" };
    const v = BigInt(Math.round(a * Number(unitMultiplier)));
    const budgetText = `${formatCroreNumber(a)} ${unit}`;
    return { budgetMin: v, budgetMax: v, budgetText };
  }

  return { budgetMin: null, budgetMax: null, budgetText: "" };
}

export function formatBudget(budgetMin?: bigint | null, budgetMax?: bigint | null): string {
  const min = budgetMin ?? null;
  const max = budgetMax ?? null;
  if (!min && !max) return "Not set";

  if (min && max) {
    const a = formatFromPkr(min);
    const b = formatFromPkr(max);
    // If both can be expressed as crore, do so.
    if (a.unit === "crore" && b.unit === "crore") {
      const minCr = formatCroreNumber(a.value);
      const maxCr = formatCroreNumber(b.value);
      if (minCr === maxCr) return `PKR ${minCr} crore`;
      return `PKR ${minCr}–${maxCr} crore`;
    }
    // fallback: show rupee range in lakh
    const minL = formatCroreNumber(a.unit === "lakh" ? a.value : (Number(min) / Number(LAKH_PKR)));
    const maxL = formatCroreNumber(b.unit === "lakh" ? b.value : (Number(max) / Number(LAKH_PKR)));
    if (minL === maxL) return `PKR ${minL} lakh`;
    return `PKR ${minL}–${maxL} lakh`;
  }

  const only = max ?? min!;
  const f = formatFromPkr(only);
  const v = formatCroreNumber(f.value);
  return `PKR ${v} ${f.unit}`;
}

