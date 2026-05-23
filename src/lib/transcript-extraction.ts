import { parseBudgetInput } from "@/lib/budget";
import { parseStoredBrowserTranscript, type BrowserTranscriptLine } from "@/lib/vapi/parse-web-transcript-message";

export type LeadLike = {
  id?: string;
  name?: string | null;
  budgetMin?: bigint | number | null;
  budgetMax?: bigint | number | null;
  preferredUnit?: string | null;
  preferredView?: string | null;
  urgency?: string | null;
};

export type ExtractedLeadDetails = {
  name?: string;
  propertyInterest?: string;
  preferredUnit?: string;
  budgetMin?: bigint | number | null;
  budgetMax?: bigint | number | null;
  budgetText?: string;
  buyingIntent?: "buying_soon" | "looking" | "unknown";
  callbackTimeText?: string;
  callbackAt?: Date | null;
  whatsappConfirmed?: boolean | null;
  summary: string;
};

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function lower(s: string): string {
  return s.toLowerCase();
}

function looksYes(text: string): boolean {
  const t = lower(text);
  return (
    /\b(jee|ji|haan|han|yes|yep|ok|theek|ٹھیک|جی|ہاں)\b/.test(t) ||
    t === "jee" ||
    t === "ji"
  );
}

function looksNo(text: string): boolean {
  const t = lower(text);
  return /\b(nahi|nahin|no|na)\b/.test(t) || t.includes("نہیں");
}

function romanNumberToDigit(word: string): number | null {
  const w = lower(word).replace(/[^\p{L}]/gu, "");
  const map: Record<string, number> = {
    // common roman-urdu
    aik: 1,
    ek: 1,
    do: 2,
    teen: 3,
    tin: 3,
    char: 4,
    chaar: 4,
    paanch: 5,
    panch: 5,
    che: 6,
    chay: 6,
    saat: 7,
    sat: 7,
    aath: 8,
    ath: 8,
    nau: 9,
    dus: 10,
    das: 10,
    gyarah: 11,
    giyarah: 11,
    barah: 12,
    bara: 12,
    // Urdu words (best-effort; sometimes arrive as Unicode letters)
    "ایک": 1,
    "دو": 2,
    "تین": 3,
    "چار": 4,
    "پانچ": 5,
    "چھ": 6,
    "سات": 7,
    "آٹھ": 8,
    "نو": 9,
    "دس": 10,
    "گیارہ": 11,
    "بارہ": 12,
  };
  return map[w] ?? null;
}

function urduDigitsToAscii(input: string): string {
  const map: Record<string, string> = {
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
  };
  return input.replace(/[۰-۹]/g, (d) => map[d] ?? d);
}

function detectPreferredUnitFromText(text: string): string | null {
  const t = lower(text);
  if (t.includes("penthouse") || t.includes("پینٹ") || t.includes("پینٹ ہاؤس") || t.includes("پینٹ ہاؤس")) {
    return "penthouse";
  }
  // 3 bed
  if (/\b3\s*(bed|bedroom)\b/.test(t) || t.includes("three bedroom") || t.includes("3 bedroom") || t.includes("تین بیڈ") || t.includes("3 بیڈ")) {
    return "three_bed";
  }
  if (/\b2\s*(bed|bedroom)\b/.test(t) || t.includes("two bedroom") || t.includes("2 bedroom") || t.includes("دو بیڈ") || t.includes("2 بیڈ")) {
    return "two_bed";
  }
  if (/\b1\s*(bed|bedroom)\b/.test(t) || t.includes("one bedroom") || t.includes("1 bedroom") || t.includes("ایک بیڈ") || t.includes("1 بیڈ")) {
    return "one_bed";
  }
  if (t.includes("duplex") || /\b4\s*(bed|bedroom)\b/.test(t) || t.includes("four bedroom") || t.includes("4 bedroom") || t.includes("چار بیڈ")) {
    return "four_bed_duplex";
  }
  return null;
}

function parseBudgetFromText(text: string): { budgetMin: number | null; budgetMax: number | null; budgetText: string | null } {
  const raw = urduDigitsToAscii(text);
  const t = lower(raw);

  // Handle "10 se 12 crore", "10-12 crore"
  const croreLike = /(crore|crores|cror|karor|cr|کروڑ)/i;
  const range = t.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to|se)\s*(\d+(?:\.\d+)?)\s*(crore|crores|cror|karor|cr|کروڑ)/i);
  if (range?.[1] && range?.[2]) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b >= a) {
      return {
        budgetMin: Math.round(a * 10_000_000),
        budgetMax: Math.round(b * 10_000_000),
        budgetText: `PKR ${a} to ${b} crore`,
      };
    }
  }

  // Roman-Urdu words: "das se barah crore", "paanch crore"
  const wordRange = t.match(/\b([a-z\u0600-\u06ff]+)\s*(?:-|–|to|se)\s*([a-z\u0600-\u06ff]+)\s*(crore|cr|کروڑ)\b/i);
  if (wordRange?.[1] && wordRange?.[2] && croreLike.test(wordRange[3] ?? "")) {
    const a = romanNumberToDigit(wordRange[1]);
    const b = romanNumberToDigit(wordRange[2]);
    if (a != null && b != null && b >= a) {
      return {
        budgetMin: a * 10_000_000,
        budgetMax: b * 10_000_000,
        budgetText: `PKR ${a} to ${b} crore`,
      };
    }
  }

  const wordSingle = t.match(/\b([a-z\u0600-\u06ff]+)\s*(crore|cr|کروڑ)\b/i);
  if (wordSingle?.[1] && croreLike.test(wordSingle[2] ?? "")) {
    const a = romanNumberToDigit(wordSingle[1]);
    if (a != null) {
      return {
        budgetMin: a * 10_000_000,
        budgetMax: a * 10_000_000,
        budgetText: `PKR ${a} crore`,
      };
    }
  }

  // Fallback to the shared budget parser (handles "10-12 crore", "1.5 crore", "50 lakh")
  const parsed = parseBudgetInput(raw);
  if (parsed.budgetMin != null || parsed.budgetMax != null) {
    const min = parsed.budgetMin != null ? Number(parsed.budgetMin) : null;
    const max = parsed.budgetMax != null ? Number(parsed.budgetMax) : null;
    const unitText = parsed.budgetText ? `PKR ${parsed.budgetText.replace("–", " to ")}` : null;
    return { budgetMin: min, budgetMax: max, budgetText: unitText };
  }

  return { budgetMin: null, budgetMax: null, budgetText: null };
}

function detectBuyingIntent(text: string): "buying_soon" | "looking" | "unknown" {
  const t = lower(text);
  const buyingSoon = [
    "jaldi lena",
    "jaldi khareed",
    "purchase soon",
    "buying soon",
    "جلدی لینا",
    "جلدی خرید",
  ];
  const looking = [
    "sirf dekh",
    "abhi dekh",
    "initial stage",
    "browse",
    "explore",
    "صرف دیکھ",
  ];
  if (buyingSoon.some((k) => t.includes(k))) return "buying_soon";
  if (looking.some((k) => t.includes(k))) return "looking";
  return "unknown";
}

function extractCallbackTimeText(lines: BrowserTranscriptLine[]): string | null {
  const questionRe = /(call\s+kis\s+waqt|call\s+kis\s+time|callback|رابطہ|کب\s+کال|کال\s+کب)/i;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.role !== "assistant") continue;
    if (!questionRe.test(l.text)) continue;

    // take the next prospect utterance as the callback time text
    for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
      if (lines[j].role === "prospect") {
        const ans = norm(lines[j].text);
        if (ans) return ans;
      }
    }
  }
  return null;
}

function getTimeZoneParts(timeZone: string, date: Date) {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

function timeZoneOffsetMinutes(timeZone: string, date: Date): number {
  const p = getTimeZoneParts(timeZone, date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (asUtc - date.getTime()) / 60000;
}

function zonedDateTimeToUtcDate(timeZone: string, y: number, m: number, d: number, hh: number, mm: number): Date {
  const utcGuess = Date.UTC(y, m - 1, d, hh, mm, 0);
  const guessDate = new Date(utcGuess);
  const offsetMin = timeZoneOffsetMinutes(timeZone, guessDate);
  return new Date(utcGuess - offsetMin * 60000);
}

function addDaysYmd(y: number, m: number, d: number, days: number): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function parseHourFromText(text: string): { hour: number | null; minute: number; hasAmPm: boolean; isPm: boolean | null } {
  const t = lower(urduDigitsToAscii(text));

  // 5:30 / 17:10
  const hm = t.match(/\b(\d{1,2})\s*:\s*(\d{2})\b/);
  if (hm) {
    const h = Number(hm[1]);
    const m = Number(hm[2]);
    if (Number.isFinite(h) && Number.isFinite(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return { hour: h, minute: m, hasAmPm: false, isPm: null };
    }
  }

  // "5 pm" / "5pm"
  const ampm = t.match(/\b(\d{1,2})\s*(am|pm)\b/);
  if (ampm) {
    const h = Number(ampm[1]);
    const isPm = ampm[2] === "pm";
    if (Number.isFinite(h) && h >= 1 && h <= 12) {
      return { hour: h, minute: 0, hasAmPm: true, isPm };
    }
  }

  // "5 baje" / "at 5" / "5"
  const hOnly = t.match(/\b(\d{1,2})\b/);
  if (hOnly) {
    const h = Number(hOnly[1]);
    if (Number.isFinite(h) && h >= 0 && h <= 23) {
      return { hour: h, minute: 0, hasAmPm: false, isPm: null };
    }
  }

  // roman/urdu number word: "paanch" / "پانچ"
  const word = t.match(/\b([a-z\u0600-\u06ff]+)\b/);
  if (word?.[1]) {
    const h = romanNumberToDigit(word[1]);
    if (h != null && h >= 1 && h <= 12) {
      return { hour: h, minute: 0, hasAmPm: false, isPm: null };
    }
  }

  return { hour: null, minute: 0, hasAmPm: false, isPm: null };
}

export function parseCallbackDateTime(
  text: string,
  now = new Date(),
  timeZone = "Asia/Karachi",
): { callbackAt: Date | null; callbackTimeText: string } {
  const raw = norm(text);
  const t = lower(urduDigitsToAscii(raw));

  const dayToken =
    /\b(today|aaj|آج)\b/i.test(t) ? "today" : /\b(tomorrow|kal|کل)\b/i.test(t) ? "tomorrow" : null;

  const hasEvening = /\b(shaam|evening|raat|night)\b/i.test(t) || t.includes("شام") || t.includes("رات");
  const hasMorning = /\b(subah|morning)\b/i.test(t) || t.includes("صبح");
  const hasAfternoon = /\b(dopahar|afternoon)\b/i.test(t) || t.includes("دوپہر");

  const { hour, minute, hasAmPm, isPm } = parseHourFromText(t);
  if (hour == null) return { callbackAt: null, callbackTimeText: raw };

  // If no day specified, keep text but don't invent a date.
  if (!dayToken) return { callbackAt: null, callbackTimeText: raw };

  // Determine hour-of-day (24h) conservatively.
  let hh24: number | null = null;
  if (hour >= 13) {
    hh24 = hour;
  } else if (hasAmPm) {
    if (hour === 12) hh24 = isPm ? 12 : 0;
    else hh24 = isPm ? hour + 12 : hour;
  } else if (hasEvening || hasAfternoon) {
    if (hour === 12) hh24 = 12;
    else hh24 = hour + 12;
  } else if (hasMorning) {
    if (hour === 12) hh24 = 0;
    else hh24 = hour;
  } else {
    // day is known but AM/PM is not; don't guess.
    return { callbackAt: null, callbackTimeText: raw };
  }

  const nowParts = getTimeZoneParts(timeZone, now);
  const base = { y: nowParts.year, m: nowParts.month, d: nowParts.day };
  const targetYmd = dayToken === "tomorrow" ? addDaysYmd(base.y, base.m, base.d, 1) : base;
  const callbackAt = zonedDateTimeToUtcDate(timeZone, targetYmd.y, targetYmd.m, targetYmd.d, hh24, minute);
  return { callbackAt, callbackTimeText: raw };
}

export function formatCallbackAt(date: Date, timeZone = "Asia/Karachi"): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function extractWhatsappConfirmed(lines: BrowserTranscriptLine[]): boolean | null {
  const q = /(whatsapp|what'?s\s*app|wa|واٹس\s*ایپ)/i;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.role !== "assistant") continue;
    if (!q.test(l.text)) continue;

    for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
      const p = lines[j];
      if (p.role !== "prospect") continue;
      if (looksYes(p.text)) return true;
      if (looksNo(p.text)) return false;
    }
  }
  return null;
}

function extractConfirmedName(lines: BrowserTranscriptLine[], existingLead?: LeadLike): string | null {
  // Pattern like: "Aap ka naam Arif Khan hai, correct?" + "Jee"
  const re = /(aap\s+ka\s+naam|آپ\s+کا\s+نام|naam)\s+([^?.!,]{2,60})\s+(hai|ہے).*(correct|theek|sahi|صحیح)?/i;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.role !== "assistant") continue;
    const m = l.text.match(re);
    if (!m?.[2]) continue;
    const candidate = norm(m[2]).replace(/[.,!?]+$/g, "");
    if (!candidate) continue;

    // Look for a yes/no response
    const next = lines.slice(i + 1, i + 4).find((x) => x.role === "prospect");
    if (!next) continue;
    if (looksYes(next.text)) {
      // If we already have a good lead name, prefer it (confirmation).
      const existing = norm(existingLead?.name ?? "");
      if (existing && existing.toLowerCase().includes(candidate.toLowerCase())) return existing;
      return candidate;
    }
  }
  return null;
}

function buildSummary(parts: {
  name?: string | null;
  property?: string | null;
  budget?: string | null;
  intent?: "buying_soon" | "looking" | "unknown";
  callback?: string | null;
  callbackAt?: Date | null;
  wa?: boolean | null;
}): string {
  const name = parts.name?.trim() || "Prospect";
  const bits: string[] = [];

  if (parts.property) bits.push(`confirmed interest in ${parts.property}`);
  if (parts.budget) bits.push(`Budget: ${parts.budget}`);
  if (parts.intent && parts.intent !== "unknown") bits.push(`Intent: ${parts.intent === "buying_soon" ? "buying soon" : "looking"}`);
  if (parts.callback?.trim()) {
    bits.push(`Callback confirmed: ${parts.callback.trim()}`);
    if (parts.callbackAt) bits.push(`Due: ${formatCallbackAt(parts.callbackAt)}`);
  } else {
    bits.push("Callback: not captured");
  }

  const wa = parts.wa == null ? null : parts.wa ? "yes" : "no";
  if (wa) bits.push(`WhatsApp confirmation: ${wa}`);

  return `${name} ${bits.length ? bits.join(". ") : "completed a browser AI test."}.`;
}

function propertyInterestLabel(unitKey: string | null): string | null {
  if (!unitKey) return null;
  if (unitKey === "penthouse") return "penthouse";
  if (unitKey === "three_bed") return "3 bedroom";
  if (unitKey === "two_bed") return "2 bedroom";
  if (unitKey === "one_bed") return "1 bedroom";
  if (unitKey === "four_bed_duplex") return "4 bedroom duplex";
  return unitKey.replaceAll("_", " ");
}

export function extractLeadDetailsFromTranscript(
  transcript: string,
  existingLead?: LeadLike,
): ExtractedLeadDetails {
  const parsedLines = parseStoredBrowserTranscript(transcript);
  const lines: BrowserTranscriptLine[] = parsedLines
    ? parsedLines
    : transcript
        .split("\n")
        .map((row) => row.trim())
        .filter(Boolean)
        .map((row) => {
          const m = row.match(/^(assistant|prospect|user|caller)\s*:\s*(.*)$/i);
          const role = m?.[1]?.toLowerCase();
          const text = norm(m?.[2] ?? row);
          return { role: role === "assistant" ? "assistant" : "prospect", text } as BrowserTranscriptLine;
        });

  const fullText = lines.map((l) => l.text).join(" ");

  const confirmedName = extractConfirmedName(lines, existingLead);
  const unitDetected = detectPreferredUnitFromText(fullText);

  const existingUnit = existingLead?.preferredUnit ? normalizeKey(existingLead.preferredUnit) : "";
  const chosenUnit =
    existingUnit && !unitDetected
      ? existingUnit
      : existingUnit && unitDetected && existingUnit === normalizeKey(unitDetected)
        ? existingUnit
        : unitDetected ?? (existingUnit || null);

  const budgetParsed = parseBudgetFromText(fullText);
  const callbackTimeText = extractCallbackTimeText(lines) ?? undefined;
  const callbackParsed = callbackTimeText ? parseCallbackDateTime(callbackTimeText) : null;
  const whatsappConfirmed = extractWhatsappConfirmed(lines);
  const buyingIntent = detectBuyingIntent(fullText);

  const propertyInterest = propertyInterestLabel(chosenUnit) ?? undefined;

  const summary = buildSummary({
    name: confirmedName ?? existingLead?.name ?? null,
    property: propertyInterest ?? null,
    budget: budgetParsed.budgetText,
    intent: buyingIntent,
    callback: callbackTimeText ?? null,
    callbackAt: callbackParsed?.callbackAt ?? null,
    wa: whatsappConfirmed,
  });

  const out: ExtractedLeadDetails = {
    summary,
    buyingIntent,
    whatsappConfirmed,
    callbackAt: callbackParsed?.callbackAt ?? null,
  };

  if (confirmedName) out.name = confirmedName;
  if (chosenUnit) {
    out.preferredUnit = chosenUnit;
    out.propertyInterest = propertyInterest ?? undefined;
  }
  if (budgetParsed.budgetMin != null || budgetParsed.budgetMax != null) {
    out.budgetMin = budgetParsed.budgetMin;
    out.budgetMax = budgetParsed.budgetMax;
    out.budgetText = budgetParsed.budgetText ?? undefined;
  }
  if (callbackTimeText) out.callbackTimeText = callbackTimeText;

  return out;
}

function normalizeKey(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, "_");
}

