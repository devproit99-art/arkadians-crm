"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  type DropResult,
} from "@hello-pangea/dnd";
import { PIPELINE_STAGES } from "./constants";
import type { PipelineLead, PipelineStage } from "./types";
import { KanbanColumn } from "./KanbanColumn";
import {
  mapApiLeadToPipelineLead,
  type ApiLeadListItem,
} from "@/lib/map-lead-to-pipeline";

function groupByStage(leads: PipelineLead[]) {
  const map: Record<PipelineStage, PipelineLead[]> = {
    new: [],
    contacted: [],
    viewing_booked: [],
    negotiating: [],
    closed_won: [],
    closed_lost: [],
  };

  for (const lead of leads) map[lead.stage].push(lead);
  return map;
}

/** Rebuild flat list from column groups after a drag (cross-column or reorder). */
function rebuildLeadsAfterDrag(leads: PipelineLead[], result: DropResult): PipelineLead[] | null {
  const { destination, source, draggableId } = result;
  if (!destination) return null;
  if (
    destination.droppableId === source.droppableId &&
    destination.index === source.index
  ) {
    return null;
  }

  const fromStage = source.droppableId as PipelineStage;
  const toStage = destination.droppableId as PipelineStage;

  const grouped = groupByStage(leads);
  const fromList = [...grouped[fromStage]];
  const fromIdx = fromList.findIndex((l) => l.id === draggableId);
  if (fromIdx < 0) return null;
  const [moved] = fromList.splice(fromIdx, 1);
  if (!moved) return null;

  if (fromStage === toStage) {
    fromList.splice(destination.index, 0, moved);
    grouped[fromStage] = fromList;
  } else {
    grouped[fromStage] = fromList;
    const toList = [...grouped[toStage]];
    toList.splice(destination.index, 0, { ...moved, stage: toStage });
    grouped[toStage] = toList;
  }

  return PIPELINE_STAGES.flatMap((s) => grouped[s.key]);
}

type KanbanBoardProps = {
  initialLeads: PipelineLead[];
  leadsUrl: string;
  sessionUserId: string | null;
  sessionRole: string | null;
};

export function KanbanBoard({ initialLeads, leadsUrl, sessionUserId, sessionRole }: KanbanBoardProps) {
  const [leads, setLeads] = useState<PipelineLead[]>(initialLeads);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** Client mount fetch finished (success, HTTP error path, timeout, or throw). */
  const [clientFetchDone, setClientFetchDone] = useState(false);

  const fetchLeadsFromApi = useCallback(
    async (
      signal: AbortSignal | undefined,
      options: { clearLeadsOnError: boolean },
    ) => {
      console.log("Fetching leads…");
      setFetchError(null);
      const res = await fetch(leadsUrl, {
        cache: "no-store",
        signal,
        credentials: "same-origin",
      });

      if (!res.ok) {
        setFetchError("Unable to load pipeline.");
        if (options.clearLeadsOnError) setLeads([]);
        return;
      }

      let json: unknown;
      try {
        json = await res.json();
      } catch {
        setFetchError("Invalid pipeline response (could not parse JSON).");
        if (options.clearLeadsOnError) setLeads([]);
        return;
      }

      const data =
        json && typeof json === "object" && "data" in json
          ? (json as { data?: unknown }).data
          : undefined;
      if (!Array.isArray(data)) {
        setFetchError("Invalid pipeline response.");
        if (options.clearLeadsOnError) setLeads([]);
        return;
      }
      const mapped = data.map((row) => mapApiLeadToPipelineLead(row as ApiLeadListItem));
      setLeads(mapped);
    },
    [],
  );

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();
    const timeoutMs = 28_000;
    const t = window.setTimeout(() => ac.abort(), timeoutMs);

    (async () => {
      try {
        await fetchLeadsFromApi(ac.signal, { clearLeadsOnError: true });
      } catch (e) {
        if (!alive) return;
        if (ac.signal.aborted) {
          setFetchError(
            "Loading the pipeline timed out. Check the connection or try Retry.",
          );
        } else {
          const msg = e instanceof Error ? e.message : "Unknown error";
          setFetchError(`Unable to load pipeline. (${msg})`);
        }
      } finally {
        window.clearTimeout(t);
        if (alive) setClientFetchDone(true);
      }
    })();

    return () => {
      alive = false;
      window.clearTimeout(t);
      ac.abort();
    };
  }, [fetchLeadsFromApi]);

  const grouped = useMemo(() => groupByStage(leads), [leads]);

  const showBootstrapSpinner =
    !clientFetchDone && leads.length === 0 && fetchError == null;

  async function onDragEnd(result: DropResult) {
    setSaveError(null);
    const previous = leads;
    const next = rebuildLeadsAfterDrag(leads, result);
    if (!next) return;

    const { destination, source, draggableId } = result;
    if (!destination) return;

    const fromStage = source.droppableId as PipelineStage;
    const toStage = destination.droppableId as PipelineStage;
    const stageChanged = fromStage !== toStage;

    setLeads(next);

    if (!stageChanged) return;

    const res = await fetch(`/api/leads/${draggableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ status: toStage }),
    });

    if (res.ok || res.status === 501) return;

    setSaveError("Could not save stage. Reverted.");
    setLeads(previous);
    try {
      await fetchLeadsFromApi(undefined, { clearLeadsOnError: false });
    } catch {
      /* ignore */
    }
  }

  async function handleRetry() {
    setFetchError(null);
    setClientFetchDone(false);
    const ac = new AbortController();
    const t = window.setTimeout(() => ac.abort(), 28_000);
    const clearOnError = leads.length === 0;
    try {
      await fetchLeadsFromApi(ac.signal, { clearLeadsOnError: clearOnError });
    } catch (e) {
      if (ac.signal.aborted) {
        setFetchError(
          "Loading the pipeline timed out. Check the connection or try again.",
        );
      } else {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setFetchError(`Unable to load pipeline. (${msg})`);
      }
    } finally {
      window.clearTimeout(t);
      setClientFetchDone(true);
    }
  }

  if (showBootstrapSpinner) {
    return (
      <div className="rounded-xl border border-light-grey bg-white shadow-card p-10 text-center text-medium-grey">
        Loading pipeline…
      </div>
    );
  }

  if (fetchError && leads.length === 0) {
    return (
      <div className="rounded-lg border border-light-grey bg-white p-8 text-center">
        <p className="text-medium-grey">{fetchError}</p>
        <button
          type="button"
          onClick={() => void handleRetry()}
          className="mt-4 rounded-lg px-5 py-2 text-sm font-semibold text-white bg-[linear-gradient(135deg,#0A1628,#1a2c4e)]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-light-grey bg-white shadow-card p-12 text-center">
        <p className="text-navy font-medium">No leads in the pipeline yet</p>
        <p className="mt-2 text-sm text-medium-grey max-w-md mx-auto">
          New prospects appear here after you register them. Use &quot;Register Prospect&quot; above to add
          one; they start in the <strong>New</strong> column.
        </p>
      </div>
    );
  }

  return (
    <div>
      {saveError ? (
        <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-navy">
          {saveError}
        </div>
      ) : null}

      {fetchError && leads.length > 0 ? (
        <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-navy flex flex-wrap items-center justify-between gap-3">
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={() => void handleRetry()}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-white bg-[linear-gradient(135deg,#0A1628,#1a2c4e)]"
          >
            Refresh data
          </button>
        </div>
      ) : null}

      <DragDropContext onDragEnd={(r) => void onDragEnd(r)}>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max">
            {PIPELINE_STAGES.map((stage) => (
              <KanbanColumn
                key={stage.key}
                stage={stage.key}
                title={stage.label}
                topBorderClass={stage.topBorderClass}
                leads={grouped[stage.key]}
                sessionUserId={sessionUserId}
                sessionRole={sessionRole}
              />
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
