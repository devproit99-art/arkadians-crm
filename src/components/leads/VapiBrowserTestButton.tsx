"use client";

import type { DemoLead } from "@/lib/demo-data";
import {
  mergeBrowserTranscriptFromVapiMessage,
  serializeBrowserTranscript,
  type BrowserTranscriptLine,
} from "@/lib/vapi/parse-web-transcript-message";
import { buildVapiLeadContext } from "@/lib/vapi-lead-context";
import Vapi from "@vapi-ai/web";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UiPhase = "idle" | "starting" | "connected" | "ending" | "ended" | "error";

function unitLabel(u: string | undefined) {
  if (!u) return "";
  return u.includes("_") ? u.replaceAll("_", " ") : u;
}

function buildVariableValues(
  lead: DemoLead,
  extras?: { callLogId?: string },
): Record<string, string> {
  const ctx = buildVapiLeadContext({
    id: lead.id,
    name: lead.name,
    budgetMin: lead.budgetMin != null ? lead.budgetMin : null,
    budgetMax: lead.budgetMax != null ? lead.budgetMax : null,
    preferredUnit: lead.preferredUnit ?? null,
    preferredView: lead.preferredView ?? null,
    urgency: lead.urgency ?? null,
  });

  const base: Record<string, string> = {
    leadId: ctx.leadId,
    name: ctx.name,
    propertyInterest: ctx.propertyInterest,
    budgetText: ctx.budgetText,
    buyingIntent: ctx.buyingIntent,
    preferredView: ctx.preferredView,
    currentDate: ctx.currentDate,
    currentTime: ctx.currentTime,
    currentDateTime: ctx.currentDateTime,
    timezone: ctx.timezone,
  };
  if (extras?.callLogId) {
    base.callLogId = extras.callLogId;
  }
  return base;
}

function formatSdkError(err: unknown): string {
  if (err == null) return "Unknown error.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error.";
  }
}

export function VapiBrowserTestButton({
  lead,
  /** When true, creates a CallLog on start and PATCHes transcript on end (DB leads only). */
  persistCallLog = false,
  /** From server env (e.g. VAPI_PUBLIC_KEY) — publishable key only, never VAPI_PRIVATE_KEY. */
  vapiPublicKey: vapiPublicKeyProp,
  /** From server env (e.g. VAPI_ASSISTANT_ID) — same assistant as outbound. */
  vapiAssistantId: vapiAssistantIdProp,
}: {
  lead: DemoLead;
  persistCallLog?: boolean;
  vapiPublicKey?: string | null;
  vapiAssistantId?: string | null;
}) {
  const router = useRouter();
  const publicKey = useMemo(() => {
    const fromProp = vapiPublicKeyProp?.trim();
    if (fromProp) return fromProp;
    return process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim() ?? "";
  }, [vapiPublicKeyProp]);

  const assistantId = useMemo(() => {
    const fromProp = vapiAssistantIdProp?.trim();
    if (fromProp) return fromProp;
    return process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID?.trim() ?? "";
  }, [vapiAssistantIdProp]);

  const configured = Boolean(publicKey && assistantId);

  const vapiRef = useRef<Vapi | null>(null);
  const transcriptRef = useRef<BrowserTranscriptLine[]>([]);
  const callLogIdRef = useRef<string | null>(null);
  const sessionStartMsRef = useRef<number | null>(null);
  const vapiCallIdRef = useRef<string | null>(null);
  const endPatchSentRef = useRef(false);

  const [phase, setPhase] = useState<UiPhase>("idle");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [transcriptLines, setTranscriptLines] = useState<BrowserTranscriptLine[]>([]);

  const teardown = useCallback(async () => {
    const v = vapiRef.current;
    vapiRef.current = null;
    if (!v) return;
    try {
      v.removeAllListeners();
    } catch {
      /* ignore */
    }
    try {
      await v.stop();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    return () => {
      void teardown();
    };
  }, [teardown]);

  const patchBrowserCallEnd = useCallback(
    async (status: "completed" | "failed" | "ended") => {
      const callLogId = callLogIdRef.current;
      if (!persistCallLog || !callLogId || endPatchSentRef.current) return;
      endPatchSentRef.current = true;

      const lines = transcriptRef.current;
      const transcriptJson = serializeBrowserTranscript(lines);
      const started = sessionStartMsRef.current;
      const durationSeconds =
        started != null ? Math.max(0, Math.round((Date.now() - started) / 1000)) : undefined;

      const mapStatus = status === "failed" ? "failed" : "ended";
      const summaryParts: string[] = ["AI browser test"];
      if (durationSeconds != null) summaryParts.push(`${durationSeconds}s`);
      const summary = summaryParts.join(" · ");

      try {
        const res = await fetch(`/api/call-logs/${callLogId}/browser-call/end`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            leadId: lead.id,
            status: mapStatus,
            transcript: transcriptJson,
            summary,
            vapiCallId: vapiCallIdRef.current,
            durationSeconds,
          }),
        });
        if (!res.ok) {
          let msg = `Could not save transcript (${res.status}).`;
          try {
            const j = (await res.json()) as { error?: { message?: string } };
            if (j?.error?.message) msg = j.error.message;
          } catch {
            /* ignore */
          }
          setPersistError(msg);
          return;
        }
        setPersistError(null);
        router.refresh();
      } catch (e) {
        setPersistError(formatSdkError(e) || "Network error while saving transcript.");
      }
    },
    [lead.id, persistCallLog, router],
  );

  const onStart = useCallback(async () => {
    if (!configured || phase === "starting" || phase === "connected" || phase === "ending") return;
    setErrorText(null);
    setPersistError(null);
    setStatusText("Starting browser test...");
    setPhase("starting");

    await teardown();

    transcriptRef.current = [];
    setTranscriptLines([]);
    callLogIdRef.current = null;
    sessionStartMsRef.current = null;
    vapiCallIdRef.current = null;
    endPatchSentRef.current = false;

    if (!publicKey || !assistantId) {
      setErrorText("Vapi browser test is not configured.");
      setPhase("error");
      setStatusText(null);
      return;
    }

    if (persistCallLog) {
      try {
        const res = await fetch(`/api/leads/${lead.id}/browser-call/start`, {
          method: "POST",
          credentials: "same-origin",
        });
        if (!res.ok) {
          let msg = "Could not create call log.";
          try {
            const j = (await res.json()) as { error?: { message?: string } };
            if (j?.error?.message) msg = j.error.message;
          } catch {
            /* ignore */
          }
          setErrorText(msg);
          setPhase("error");
          setStatusText(null);
          return;
        }
        const json = (await res.json()) as { data?: { callLogId?: string } };
        const callLogId = json?.data?.callLogId;
        if (!callLogId) {
          setErrorText("Server did not return a call log id.");
          setPhase("error");
          setStatusText(null);
          return;
        }
        callLogIdRef.current = callLogId;
        sessionStartMsRef.current = Date.now();
      } catch (e) {
        setErrorText(formatSdkError(e) || "Could not start browser call log.");
        setPhase("error");
        setStatusText(null);
        return;
      }
    } else {
      sessionStartMsRef.current = Date.now();
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    const onMessage = (msg: unknown) => {
      const next = mergeBrowserTranscriptFromVapiMessage(transcriptRef.current, msg);
      transcriptRef.current = next;
      setTranscriptLines(next);
    };

    const onCallStart = () => {
      setPhase("connected");
      setStatusText("Connected");
    };

    const onCallEnd = () => {
      void (async () => {
        await patchBrowserCallEnd("ended");
        await teardown();
        setPhase("ended");
        setStatusText("Ended");
      })();
    };

    const onError = (err: unknown) => {
      setErrorText(formatSdkError(err));
      setPhase("error");
      setStatusText(null);
      void (async () => {
        await patchBrowserCallEnd("failed");
        await teardown();
      })();
    };

    const onStartFailed = (ev: { error?: string }) => {
      setErrorText(ev?.error ?? "Call start failed.");
      setPhase("error");
      setStatusText(null);
      void (async () => {
        await patchBrowserCallEnd("failed");
        await teardown();
      })();
    };

    vapi.on("message", onMessage);
    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("error", onError);
    vapi.on("call-start-failed", onStartFailed);

    try {
      const overrides = {
        variableValues: buildVariableValues(lead, { callLogId: callLogIdRef.current ?? undefined }),
      };
      const webCall = await vapi.start(assistantId, overrides);
      if (webCall && typeof webCall === "object" && "id" in webCall && typeof (webCall as { id: unknown }).id === "string") {
        vapiCallIdRef.current = (webCall as { id: string }).id;
      }
      if (!webCall) {
        setErrorText("Browser test could not start (no call returned).");
        setPhase("error");
        setStatusText(null);
        await patchBrowserCallEnd("failed");
        await teardown();
      }
    } catch (e) {
      setErrorText(formatSdkError(e));
      setPhase("error");
      setStatusText(null);
      await patchBrowserCallEnd("failed");
      await teardown();
    }
  }, [assistantId, configured, lead, patchBrowserCallEnd, persistCallLog, phase, publicKey, teardown]);

  const onStop = useCallback(async () => {
    if (phase !== "connected" && phase !== "starting") return;
    setPhase("ending");
    setStatusText("Ending…");
    await patchBrowserCallEnd("ended");
    await teardown();
    setPhase("ended");
    setStatusText("Ended");
  }, [patchBrowserCallEnd, phase, teardown]);

  const disabledReason = !configured
    ? "Set VAPI_PUBLIC_KEY (publishable) and VAPI_ASSISTANT_ID, or NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID. Never use VAPI_PRIVATE_KEY in the browser."
    : undefined;

  const statusLine =
    phase === "error" && errorText ? (
      <span className="text-sm text-error">{errorText}</span>
    ) : statusText ? (
      <span className="text-sm text-medium-grey">{statusText}</span>
    ) : null;

  const showLiveTranscript = phase === "starting" || phase === "connected" || phase === "ending";

  return (
    <div className="flex flex-col gap-2 items-start sm:items-end w-full sm:max-w-md">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void onStart()}
          disabled={!configured || phase === "starting" || phase === "connected" || phase === "ending"}
          title={disabledReason}
          className={[
            "rounded-lg border border-light-grey bg-white px-5 py-3 text-sm font-semibold text-navy shadow-card transition-shadow",
            "hover:border-gold hover:bg-cream/40",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
          ].join(" ")}
        >
          Test AI Agent in Browser
        </button>
        {(phase === "connected" || phase === "starting" || phase === "ending") && (
          <button
            type="button"
            onClick={() => void onStop()}
            disabled={phase === "ending"}
            className="rounded-lg border border-navy/20 bg-navy px-5 py-3 text-sm font-semibold text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow disabled:opacity-50"
          >
            End browser test
          </button>
        )}
      </div>
      {statusLine}
      {persistError ? (
        <p className="text-xs text-error leading-relaxed" role="alert">
          {persistError} Your transcript below is still on this page — copy it if you need it.
        </p>
      ) : null}
      {showLiveTranscript ? (
        <div className="w-full rounded-lg border border-light-grey bg-cream/20 p-3 text-left max-h-48 overflow-y-auto">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-medium-grey">Live transcript</div>
          {transcriptLines.length === 0 ? (
            <p className="mt-2 text-xs text-medium-grey">Waiting for conversation…</p>
          ) : (
            <ul className="mt-2 space-y-2 text-xs text-navy leading-relaxed">
              {transcriptLines.map((line, i) => (
                <li key={`${line.role}-${i}-${line.text.slice(0, 24)}`}>
                  <span className="font-semibold text-medium-grey">
                    {line.role === "assistant" ? "Assistant:" : "Prospect:"}
                  </span>{" "}
                  {line.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
      {phase === "ended" || phase === "error" ? (
        transcriptLines.length > 0 ? (
          <div className="w-full rounded-lg border border-gold/40 bg-cream/30 p-3 text-left max-h-48 overflow-y-auto">
            <div className="text-[10px] font-semibold tracking-widest uppercase text-medium-grey">Session transcript</div>
            <ul className="mt-2 space-y-2 text-xs text-navy leading-relaxed">
              {transcriptLines.map((line, i) => (
                <li key={`end-${line.role}-${i}-${line.text.slice(0, 24)}`}>
                  <span className="font-semibold text-medium-grey">
                    {line.role === "assistant" ? "Assistant:" : "Prospect:"}
                  </span>{" "}
                  {line.text}
                </li>
              ))}
            </ul>
          </div>
        ) : null
      ) : null}
    </div>
  );
}
