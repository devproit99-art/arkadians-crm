"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const INVENTORY_SAVE_FLASH_KEY = "arkadians_inventory_saved_flash";

function roleIsAdmin(role: string | null | undefined) {
  return (role ?? "").toLowerCase() === "admin";
}

function roleCanSignal(role: string | null | undefined) {
  const r = (role ?? "").toLowerCase();
  return r === "admin" || r === "manager" || r === "sales_rep";
}

type InventoryStatus =
  | "interested"
  | "viewing"
  | "deposit_secured"
  | "payment_secured"
  | "sold_assigned"
  | "available";

type InventorySelectPayload = {
  id: string;
  tower: string;
  flatNumber: string;
  type: string;
  viewCategory: string;
  notes?: string | null;
  customerName?: string | null;
};

type InventorySelectMessage =
  | {
      type: "arkadians_inventory_select";
      unit?: InventorySelectPayload;
    }
  | {
      type: "arkadians_inventory_assign";
      unit?: InventorySelectPayload;
      status?: InventoryStatus;
    };

export function InventoryAssignModal({
  leadId,
  sessionRole,
}: {
  leadId: string;
  sessionRole: string | null;
}) {
  const isAdmin = roleIsAdmin(sessionRole);
  const canSignal = roleCanSignal(sessionRole);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    const flash = sessionStorage.getItem(INVENTORY_SAVE_FLASH_KEY);
    if (flash) {
      setSuccessMsg(flash);
      sessionStorage.removeItem(INVENTORY_SAVE_FLASH_KEY);
    }
  }, []);

  const [unitId, setUnitId] = useState<string | null>(null);
  const [flatNumber, setFlatNumber] = useState("");
  const [tower, setTower] = useState("");
  const [flatType, setFlatType] = useState("");
  const [viewCategory, setViewCategory] = useState("");
  const [status, setStatus] = useState<InventoryStatus>("interested");
  const [unitNotes, setUnitNotes] = useState("");

  const unitIdRef = useRef<string | null>(null);
  const statusRef = useRef<InventoryStatus>("interested");
  const flatNumberRef = useRef("");
  const unitNotesRef = useRef("");
  const saveInnerRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    unitIdRef.current = unitId;
    statusRef.current = status;
    flatNumberRef.current = flatNumber;
    unitNotesRef.current = unitNotes;
  }, [unitId, status, flatNumber, unitNotes]);

  useEffect(() => {
    function applySelection(
      unit: InventorySelectPayload,
      nextStatus: InventoryStatus | null,
      autoSave: boolean,
    ) {
      setSuccessMsg(null);
      setUnitId(unit.id);
      setFlatNumber(unit.flatNumber);
      setTower(unit.tower);
      setFlatType(unit.type);
      setViewCategory(unit.viewCategory);
      setUnitNotes(unit.notes?.trim() ? String(unit.notes) : "");
      if (nextStatus) {
        setStatus(nextStatus);
      }

      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

      if (autoSave) {
        setTimeout(() => {
          void saveInnerRef.current();
        }, 0);
      }
    }

    function onMessage(e: MessageEvent) {
      const data = e.data as InventorySelectMessage | null;
      if (!data || typeof data !== "object") return;
      if (!canSignal) return;
      if (!data.unit) return;

      if (data.type === "arkadians_inventory_select") {
        applySelection(data.unit, null, false);
        return;
      }

      if (data.type === "arkadians_inventory_assign") {
        const nextStatus = (data.status ?? "interested") as InventoryStatus;
        applySelection(data.unit, nextStatus, true);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [canSignal]);

  const canSubmit = useMemo(() => {
    if (status === "available") return true;
    return flatNumber.trim().length > 0;
  }, [status, flatNumber]);

  const save = useCallback(async () => {
    const uid = unitIdRef.current;
    const st = statusRef.current;
    if (st !== "available" && !flatNumberRef.current.trim()) return;

    setSaving(true);
    setMsg(null);
    setSuccessMsg(null);
    try {
      if (!uid) {
        setMsg("Select a flat from the list first.");
        return;
      }

      const notePayload = unitNotesRef.current.trim() || null;

      const res = await fetch("/api/inventory/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          leadId,
          unitId: uid,
          status: st,
          customerName: null,
          notes: notePayload,
        }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          json && typeof json === "object" && "error" in json
            ? (json as { error?: { message?: string } }).error?.message
            : null;
        setMsg(message ?? "Could not update inventory assignment.");
        return;
      }

      const okLabel =
        st === "available"
          ? "Removed flat from this lead. Inventory row updated."
          : st === "viewing"
            ? "Saved as Viewing. Profile and inventory list updated."
            : "Saved as Interested. Profile and inventory list updated.";
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(INVENTORY_SAVE_FLASH_KEY, okLabel);
      }
      window.location.reload();
    } catch {
      setMsg("Network error.");
    } finally {
      setSaving(false);
    }
  }, [leadId]);

  useEffect(() => {
    saveInnerRef.current = save;
  }, [save]);

  if (!canSignal) return null;

  const hasSelection = Boolean(unitId) && Boolean(flatNumber.trim());

  return (
    <div ref={rootRef} className="rounded-xl border border-light-grey bg-white shadow-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Inventory assignment</div>
          <div className="mt-2 font-(--font-display) text-lg text-navy">Select a flat from the list</div>
          <p className="mt-2 text-sm text-medium-grey max-w-2xl">
            Select a flat below, set status and optional notes, then use <span className="font-semibold">Save</span> once — updates this lead and the flat row in the list.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setUnitId(null);
            setFlatNumber("");
            setTower("");
            setFlatType("");
            setViewCategory("");
            setStatus("interested");
            setUnitNotes("");
            setMsg(null);
            setSuccessMsg(null);
          }}
          className="h-10 rounded-lg border border-light-grey bg-white px-4 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors disabled:opacity-50"
          disabled={saving || !hasSelection}
        >
          Clear selection
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-light-grey bg-cream/25 p-4">
          <div className="text-xs tracking-widest uppercase text-medium-grey">Selected flat</div>
          <div className="mt-2 text-sm font-semibold text-navy">
            {hasSelection ? flatNumber : "None selected"}
          </div>
          <div className="mt-1 text-xs text-medium-grey">
            {tower ? `Tower ${tower}` : ""}
            {flatType ? `${tower ? " · " : ""}${flatType}` : ""}
            {viewCategory ? `${tower || flatType ? " · " : ""}${viewCategory}` : ""}
          </div>
        </div>

        <label className="block">
          <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Status</div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as InventoryStatus)}
            disabled={saving || !hasSelection}
            className="mt-2 h-11 w-full rounded-lg border border-light-grey bg-white px-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-60"
          >
            <option value="interested">Interested</option>
            <option value="viewing">Viewing</option>
            {isAdmin ? (
              <>
                <option value="deposit_secured">Deposit secured</option>
                <option value="payment_secured">Payment / instalment secured</option>
                <option value="sold_assigned">Sold / assigned</option>
              </>
            ) : null}
            <option value="available">Remove from lead (back to available)</option>
          </select>
        </label>
      </div>

      <label className="mt-5 block">
        <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Notes for this flat (inventory list)</div>
        <textarea
          value={unitNotes}
          onChange={(e) => setUnitNotes(e.target.value)}
          disabled={saving || !hasSelection}
          rows={4}
          placeholder="Visible on the stock row for your team (e.g. callback agreed, viewing time…)"
          className="mt-2 w-full rounded-lg border border-light-grey bg-white px-3 py-2 text-sm text-navy placeholder:text-medium-grey/80 focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-60 resize-y min-h-[96px]"
        />
      </label>

      {successMsg ? (
        <div className="mt-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{successMsg}</div>
      ) : null}
      {msg ? <div className="mt-4 text-sm text-warning">{msg}</div> : null}

      <div className="mt-5 flex items-center justify-end">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !hasSelection}
          className="h-11 rounded-lg border border-navy/20 bg-navy px-5 text-xs font-semibold tracking-[0.2em] uppercase text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

