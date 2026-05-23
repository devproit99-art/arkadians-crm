/**
 * Best-effort parsing of Vapi Web SDK `message` events (Daily `app-message` JSON payloads).
 * Shapes vary by Vapi version; we handle common `conversation-update` style snapshots.
 */

export type BrowserTranscriptLine = {
  role: "assistant" | "prospect";
  text: string;
};

const PROMPT_SNIPPETS = [
  "# Appointment Scheduling Agent Prompt",
  "Identity & Purpose",
  "You are Layla",
  "Goal:",
  "Rules:",
  "Opening:",
  "Known CRM details:",
] as const;

function looksLikePromptText(text: string): boolean {
  const t = text.toLowerCase();
  return PROMPT_SNIPPETS.some((s) => t.includes(s.toLowerCase()));
}

/**
 * Removes assistant prompt/config blocks and leading non-conversation noise.
 * Conservative: better to drop prompt text than leak it into CRM.
 */
export function cleanBrowserTranscriptLines(lines: BrowserTranscriptLine[]): BrowserTranscriptLine[] {
  const withoutPrompt = lines.filter((l) => {
    if (l.role !== "assistant") return true;
    return !looksLikePromptText(l.text);
  });

  // Drop leading assistant-only "setup" until the first prospect turn (or first short assistant greeting).
  let startIdx = 0;
  for (let i = 0; i < withoutPrompt.length; i++) {
    const l = withoutPrompt[i];
    if (l.role === "prospect") {
      startIdx = Math.max(0, i - 1);
      break;
    }
    if (l.role === "assistant" && l.text.length <= 240 && !looksLikePromptText(l.text)) {
      startIdx = i;
      break;
    }
    startIdx = i + 1;
  }

  const trimmed = withoutPrompt.slice(startIdx);

  // Collapse exact duplicates.
  const out: BrowserTranscriptLine[] = [];
  for (const l of trimmed) {
    const prev = out[out.length - 1];
    if (prev && prev.role === l.role && prev.text === l.text) continue;
    out.push(l);
  }
  return out;
}

function mapRole(raw: unknown): "assistant" | "prospect" | null {
  if (typeof raw !== "string") return null;
  const r = raw.toLowerCase();
  if (r === "assistant" || r === "bot" || r === "system") return "assistant";
  if (r === "user" || r === "customer" || r === "caller") return "prospect";
  return null;
}

function textFromPart(part: Record<string, unknown>): string {
  const t =
    (typeof part.message === "string" && part.message) ||
    (typeof part.content === "string" && part.content) ||
    (typeof part.transcript === "string" && part.transcript) ||
    (typeof part.text === "string" && part.text) ||
    "";
  return t.trim();
}

function linesFromConversationArray(arr: unknown[]): BrowserTranscriptLine[] {
  const out: BrowserTranscriptLine[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const role = mapRole(row.role);
    const text = textFromPart(row);
    if (!role || !text) continue;
    out.push({ role, text });
  }
  return out;
}

/**
 * Returns a full transcript snapshot to apply (replace), or null if this message is not a transcript snapshot.
 */
export function extractBrowserTranscriptSnapshot(msg: unknown): BrowserTranscriptLine[] | null {
  if (!msg || typeof msg !== "object") return null;
  const m = msg as Record<string, unknown>;
  const type = typeof m.type === "string" ? m.type : "";

  if (type === "conversation-update" || type === "conversation-update-complete") {
    const conv = m.conversation ?? m.messages;
    if (Array.isArray(conv) && conv.length > 0) {
      return linesFromConversationArray(conv);
    }
  }

  if (Array.isArray(m.messages) && m.messages.length > 0) {
    return linesFromConversationArray(m.messages as unknown[]);
  }

  return null;
}

/**
 * Merge a single Vapi client message into the running transcript (snapshot wins; final transcript lines append).
 */
export function mergeBrowserTranscriptFromVapiMessage(
  prev: BrowserTranscriptLine[],
  msg: unknown,
): BrowserTranscriptLine[] {
  const snap = extractBrowserTranscriptSnapshot(msg);
  if (snap && snap.length > 0) {
    return snap;
  }

  if (!msg || typeof msg !== "object") return prev;
  const m = msg as Record<string, unknown>;
  const t = typeof m.type === "string" ? m.type : "";
  const isTranscriptType = t === "transcript" || t.startsWith("transcript");
  if (isTranscriptType && m.transcriptType === "final") {
    const role =
      m.role === "assistant" ? "assistant" : m.role === "user" ? "prospect" : null;
    const text = typeof m.transcript === "string" ? m.transcript.trim() : "";
    if (!role || !text) return prev;
    const last = prev[prev.length - 1];
    if (last && last.role === role && last.text === text) return prev;
    return [...prev, { role, text }];
  }

  return prev;
}

export function serializeBrowserTranscript(lines: BrowserTranscriptLine[]): string {
  return JSON.stringify({ version: 1, lines });
}

export function parseStoredBrowserTranscript(raw: string | null | undefined): BrowserTranscriptLine[] | null {
  if (!raw?.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as { version?: unknown; lines?: unknown };
    if (obj.version === 1 && Array.isArray(obj.lines)) {
      return obj.lines
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const r = row as { role?: unknown; text?: unknown };
          const role = r.role === "assistant" || r.role === "prospect" ? r.role : null;
          const text = typeof r.text === "string" ? r.text.trim() : "";
          if (!role || !text) return null;
          return { role, text };
        })
        .filter(Boolean) as BrowserTranscriptLine[];
    }
  } catch {
    return null;
  }
  return null;
}
