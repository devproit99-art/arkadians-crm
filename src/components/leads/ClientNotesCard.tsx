"use client";

import { useMemo, useState } from "react";
import { formatDateTime } from "@/lib/datetime";

type TimelineEntry = {
  stamp: string | null;
  who: string | null;
  body: string;
};

function buildAppendLine(noteText: string, userName: string) {
  const stamp = formatDateTime(new Date());
  const who = userName.trim() || "Advisor";
  return `[${stamp}] ${who}: ${noteText.trim()}`;
}

function parseTimeline(notes: string): TimelineEntry[] {
  const lines = notes
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) return [];

  const headerRe = /^\[([^\]]+)\]\s+([^:]+):\s*(.*)$/;
  const entries: TimelineEntry[] = [];
  let current: TimelineEntry | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(headerRe);
    if (m) {
      if (current) entries.push(current);
      current = {
        stamp: m[1]?.trim() || null,
        who: m[2]?.trim() || null,
        body: m[3]?.trim() || "",
      };
      continue;
    }

    if (!current) {
      current = { stamp: null, who: null, body: line };
    } else {
      current.body = current.body ? `${current.body}\n${line}` : line;
    }
  }

  if (current) entries.push(current);
  return entries.filter((e) => e.body.trim().length > 0);
}

export function ClientNotesCard({
  leadId,
  existingNotes,
  sessionUserName,
}: {
  leadId: string;
  existingNotes: string | null | undefined;
  sessionUserName: string | null | undefined;
}) {
  const timeline = useMemo(() => parseTimeline(existingNotes ?? ""), [existingNotes]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function appendNote() {
    const t = draft.trim();
    if (!t) return;
    setSaving(true);
    setError(null);
    setOk(null);

    const nextLine = buildAppendLine(t, sessionUserName ?? "Advisor");
    const nextNotes = [existingNotes?.trim(), nextLine].filter(Boolean).join("\n");

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ notes: nextNotes }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          json && typeof json === "object" && "error" in json
            ? (json as { error?: { message?: string } }).error?.message
            : null;
        setError(msg ?? "Could not save note.");
        return;
      }
      setDraft("");
      setOk("Note saved.");
      // simplest refresh: reload page so server-rendered notes stay source of truth
      window.location.reload();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-light-grey bg-white shadow-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-(--font-display) text-lg text-navy">Client Notes</h2>
          <p className="mt-1 text-xs text-medium-grey">
            Append-only notes for this prospect (timeline style).
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-light-grey bg-cream/20 p-4">
        {timeline.length === 0 ? (
          <p className="text-sm text-medium-grey">No notes yet. Add the first update below.</p>
        ) : (
          <ul className="space-y-3">
            {timeline
              .slice()
              .reverse()
              .slice(0, 30)
              .map((entry, idx) => (
                <li key={`${idx}-${entry.stamp ?? "no-stamp"}-${entry.body.slice(0, 24)}`} className="rounded-lg border border-light-grey bg-white p-3">
                  <div className="text-[11px] tracking-[0.12em] uppercase text-medium-grey">
                    {entry.stamp ?? "Date/time not captured"} · {entry.who ?? "Unknown note taker"}
                  </div>
                  <div className="mt-2 text-sm text-navy leading-relaxed whitespace-pre-wrap wrap-break-word">
                    {entry.body}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Add note</div>
        <textarea
          className="mt-2 w-full min-h-[96px] rounded-lg border border-light-grey bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-60"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. Client prefers callback tomorrow at 5 PM…"
          disabled={saving}
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void appendNote()}
            disabled={saving || !draft.trim()}
            className="rounded-lg border border-navy/20 bg-navy px-4 py-2 text-xs font-semibold tracking-[0.15em] uppercase text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow disabled:opacity-50"
          >
            {saving ? "Saving…" : "Append Note"}
          </button>
          {ok ? <span className="text-xs text-medium-grey">{ok}</span> : null}
          {error ? <span className="text-xs text-error">{error}</span> : null}
        </div>
      </div>
    </section>
  );
}

