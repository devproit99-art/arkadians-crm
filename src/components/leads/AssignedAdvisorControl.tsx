"use client";

import { useEffect, useMemo, useState } from "react";

type Advisor = { id: string; name: string; role: string; email?: string };

function roleIsAdmin(role: string | null | undefined) {
  return (role ?? "").toLowerCase() === "admin";
}

function labelFromUser(u: Advisor) {
  return `${u.name}${u.role ? ` (${u.role.replaceAll("_", " ")})` : ""}`;
}

export function AssignedAdvisorControl({
  leadId,
  currentOwnerId,
  currentOwnerLabel,
  sessionUserId,
  sessionRole,
}: {
  leadId: string;
  currentOwnerId: string | null | undefined;
  currentOwnerLabel: string | null | undefined;
  sessionUserId: string | null | undefined;
  sessionRole: string | null | undefined;
}) {
  const isAdmin = roleIsAdmin(sessionRole);
  const isUnassigned = !currentOwnerId;
  const canClaim = Boolean(sessionUserId) && !isAdmin && isUnassigned;

  const [advisors, setAdvisors] = useState<Advisor[] | null>(null);
  const [selected, setSelected] = useState(currentOwnerId ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setSelected(currentOwnerId ?? "");
  }, [currentOwnerId]);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    (async () => {
      const res = await fetch("/api/users", { credentials: "same-origin" }).catch(() => null);
      if (!alive) return;
      if (!res || !res.ok) {
        setAdvisors([]);
        return;
      }
      const json: unknown = await res.json().catch(() => null);
      const data =
        json && typeof json === "object" && "data" in json ? (json as { data?: unknown }).data : null;
      setAdvisors(Array.isArray(data) ? (data as Advisor[]) : []);
    })();
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  const advisorOptions = useMemo(() => advisors ?? [], [advisors]);

  async function saveOwner(nextOwnerId: string | null) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ownerId: nextOwnerId }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          json && typeof json === "object" && "error" in json
            ? (json as { error?: { message?: string } }).error?.message
            : null;
        setMsg(message ?? "Could not update assignment.");
        return;
      }
      setMsg("Assignment updated.");
      window.location.reload();
    } catch {
      setMsg("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-light-grey bg-cream/20 px-4 py-3">
      <div className="text-xs tracking-widest uppercase text-medium-grey">Assigned advisor</div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-navy">
          {currentOwnerLabel?.trim() ? currentOwnerLabel : "Unassigned"}
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={saving}
              className="h-9 rounded-lg border border-light-grey bg-white px-3 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-60"
            >
              <option value="">Unassigned</option>
              {advisorOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {labelFromUser(u)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void saveOwner(selected ? selected : null)}
              disabled={saving}
              className="h-9 rounded-lg border border-navy/20 bg-navy px-3 text-xs font-semibold text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        ) : canClaim ? (
          <button
            type="button"
            onClick={() => void saveOwner(sessionUserId!)}
            disabled={saving}
            className="h-9 rounded-lg border border-navy/20 bg-navy px-3 text-xs font-semibold text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow disabled:opacity-50"
          >
            {saving ? "Claiming…" : "Claim lead"}
          </button>
        ) : null}
      </div>
      {msg ? <div className="mt-2 text-xs text-medium-grey">{msg}</div> : null}
    </div>
  );
}

