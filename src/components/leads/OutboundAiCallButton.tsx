"use client";

import { useCallback, useState } from "react";

type Phase = "idle" | "loading" | "success" | "error";

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Request failed.";
  const err = (payload as { error?: unknown }).error;
  if (!err || typeof err !== "object") return "Request failed.";
  const o = err as { message?: unknown; details?: unknown };
  const details = typeof o.details === "string" ? o.details.trim() : "";
  const message = typeof o.message === "string" ? o.message.trim() : "";
  if (details) return details.length > 400 ? `${details.slice(0, 400)}…` : details;
  if (message) return message;
  return "Request failed.";
}

export function OutboundAiCallButton({
  leadId,
  disabled,
  disabledReason,
}: {
  leadId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorText, setErrorText] = useState<string | null>(null);

  const onClick = useCallback(async () => {
    if (disabled || phase === "loading" || phase === "success") return;
    setPhase("loading");
    setErrorText(null);
    try {
      const res = await fetch("/api/vapi/outbound-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorText(extractErrorMessage(body));
        setPhase("error");
        return;
      }
      setPhase("success");
      window.setTimeout(() => setPhase("idle"), 4000);
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : "Network error.");
      setPhase("error");
    }
  }, [disabled, leadId, phase]);

  const statusLine =
    phase === "loading" ? (
      <span className="text-sm text-medium-grey">Starting AI call...</span>
    ) : phase === "success" ? (
      <span className="text-sm text-success font-medium">AI call started</span>
    ) : phase === "error" && errorText ? (
      <span className="text-sm text-error">{errorText}</span>
    ) : null;

  return (
    <div className="flex flex-col gap-2 items-start sm:items-end">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || phase === "loading" || phase === "success"}
        title={disabled ? disabledReason : undefined}
        className={[
          "rounded-lg px-5 py-3 text-sm font-semibold text-navy shadow-gold transition-shadow",
          "bg-[linear-gradient(135deg,#E8D089,#C9A84C)] hover:shadow-[0_0_28px_rgba(201,168,76,0.35)]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
        ].join(" ")}
      >
        Call with AI Agent
      </button>
      {statusLine}
    </div>
  );
}
