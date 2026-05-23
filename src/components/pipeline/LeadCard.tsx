import Link from "next/link";
import { UserRound } from "lucide-react";
import { PIPELINE_STAGES, scoreBadgeClasses } from "./constants";
import type { PipelineLead } from "./types";
import { formatBudget } from "@/lib/budget";
import { useEffect, useMemo, useState } from "react";

type Advisor = { id: string; name: string; role: string; email?: string };

function isAdminRole(role: string | null) {
  return (role ?? "").toLowerCase() === "admin";
}

export function LeadCard({
  lead,
  sessionUserId,
  sessionRole,
}: {
  lead: PipelineLead;
  sessionUserId: string | null;
  sessionRole: string | null;
}) {
  const budgetExtra =
    lead.budgetMin != null || lead.budgetMax != null
      ? formatBudget(
          lead.budgetMin != null ? BigInt(lead.budgetMin) : null,
          lead.budgetMax != null ? BigInt(lead.budgetMax) : null,
        )
      : null;
  const contact = [lead.phone, lead.email].filter(Boolean).join(" · ");
  const stageLabel =
    PIPELINE_STAGES.find((s) => s.key === lead.stage)?.label ??
    lead.stage.replaceAll("_", " ");

  // Pipeline cards are client components; session is not passed here yet, so we only show labels.
  // Assignment controls are available on lead detail for now.
  const ownerText = lead.ownerLabel ?? "Unassigned";
  const isAdmin = isAdminRole(sessionRole);
  const canClaim = !isAdmin && !lead.ownerId && Boolean(sessionUserId);

  const [showAssign, setShowAssign] = useState(false);
  const [advisors, setAdvisors] = useState<Advisor[] | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(lead.ownerId ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setSelectedOwnerId(lead.ownerId ?? "");
  }, [lead.ownerId]);

  useEffect(() => {
    if (!isAdmin || !showAssign) return;
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
  }, [isAdmin, showAssign]);

  const advisorOptions = useMemo(() => advisors ?? [], [advisors]);

  async function saveOwner(nextOwnerId: string | null) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
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
      setMsg("Updated.");
      window.location.reload();
    } catch {
      setMsg("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="block flex-1 min-w-0 p-5 hover:bg-cream/25 transition-colors">
      <article>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/leads/${lead.id}`} className="font-medium text-navy truncate hover:text-gold transition-colors">
              {lead.name}
            </Link>
            <div className="mt-1 text-sm text-medium-grey">{lead.budgetLabel}</div>
            {budgetExtra ? (
              <div className="mt-0.5 text-xs text-medium-grey/90">{budgetExtra}</div>
            ) : null}
          </div>
          <div
            className={[
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
              scoreBadgeClasses(lead.score),
            ].join(" ")}
          >
            {lead.score}
          </div>
        </div>

        <div className="mt-2 text-sm text-medium-grey">
          <span className="font-medium text-navy/80">Source:</span> {lead.source}
        </div>

        <div className="mt-1 text-xs font-medium text-navy/70">Stage: {stageLabel}</div>

        {contact ? (
          <div className="mt-2 text-xs text-medium-grey wrap-break-word">{contact}</div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm text-medium-grey">
          {lead.unitLabel ? <span>{lead.unitLabel}</span> : null}
          {lead.unitLabel && lead.viewLabel ? (
            <span className="text-medium-grey/40">•</span>
          ) : null}
          {lead.viewLabel ? <span>{lead.viewLabel} view</span> : null}
        </div>

        {lead.inventoryFlatNumber || lead.inventoryFlatType ? (
          <div className="mt-2 text-xs text-medium-grey">
            <span className="font-semibold text-navy/80">Flat:</span>{" "}
            {lead.inventoryFlatNumber ?? "—"}
            {lead.inventoryFlatType ? ` · ${lead.inventoryFlatType}` : ""}
          </div>
        ) : null}
        {lead.inventoryStage ? (
          <div className="mt-1 text-xs text-medium-grey">
            <span className="font-semibold text-navy/80">Inventory:</span> {lead.inventoryStage}
            {lead.depositStatus ? ` · Deposit ${lead.depositStatus}` : ""}
            {lead.instalmentStatus ? ` · Instalment ${lead.instalmentStatus}` : ""}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between text-xs text-medium-grey">
          <div>{lead.daysInStage} days in stage</div>
          <div className="flex items-center gap-1.5">
            <UserRound className="w-4 h-4 text-medium-grey/70" />
            <span className="truncate max-w-[120px]">{ownerText}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setShowAssign((v) => !v)}
              className="rounded-lg border border-light-grey bg-white px-3 py-1.5 text-[11px] font-semibold text-medium-grey hover:bg-cream/40 hover:text-navy transition-colors"
            >
              {showAssign ? "Close" : lead.ownerId ? "Reassign" : "Assign"}
            </button>
          ) : canClaim ? (
            <button
              type="button"
              onClick={() => void saveOwner(sessionUserId!)}
              disabled={saving}
              className="rounded-lg border border-navy/20 bg-navy px-3 py-1.5 text-[11px] font-semibold text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow disabled:opacity-50"
            >
              {saving ? "Claiming…" : "Claim lead"}
            </button>
          ) : (
            <span className="text-[11px] text-medium-grey/80"> </span>
          )}

          <Link
            href={`/leads/${lead.id}`}
            className="rounded-lg border border-light-grey bg-white px-3 py-1.5 text-[11px] font-semibold text-navy hover:border-gold hover:bg-cream/40 transition-colors"
          >
            Open
          </Link>
        </div>

        {isAdmin && showAssign ? (
          <div className="mt-3 rounded-lg border border-light-grey bg-cream/20 p-3">
            <div className="flex items-center gap-2">
              <select
                value={selectedOwnerId}
                onChange={(e) => setSelectedOwnerId(e.target.value)}
                disabled={saving}
                className="h-9 flex-1 rounded-lg border border-light-grey bg-white px-3 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-60"
              >
                <option value="">Unassigned</option>
                {advisorOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void saveOwner(selectedOwnerId ? selectedOwnerId : null)}
                disabled={saving}
                className="h-9 rounded-lg border border-navy/20 bg-navy px-3 text-xs font-semibold text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            {msg ? <div className="mt-2 text-[11px] text-medium-grey">{msg}</div> : null}
          </div>
        ) : null}
      </article>
    </div>
  );
}
