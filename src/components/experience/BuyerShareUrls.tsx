"use client";

import { useEffect, useState } from "react";

function copyText(text: string, setMsg: (s: string | null) => void) {
  void (async () => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copied");
      setTimeout(() => setMsg(null), 1500);
    } catch {
      setMsg("Copy failed");
      setTimeout(() => setMsg(null), 2000);
    }
  })();
}

export function BuyerShareUrls({ variant = "card" }: { variant?: "card" | "inline" }) {
  const [origin, setOrigin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  const journeyUrl = origin ? `${origin}/experience` : "";
  const playUrl = origin ? `${origin}/experience/play` : "";

  const wrap =
    variant === "card"
      ? "rounded-xl border border-gold/25 bg-cream/40 p-4 sm:p-5"
      : "rounded-lg border border-light-grey bg-cream/30 p-4";

  if (!journeyUrl) {
    return null;
  }

  return (
    <div className={wrap}>
      <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">URLs to send buyers</div>
      <ul className="mt-3 space-y-3 text-sm">
        <li>
          <div className="font-semibold text-navy">1 · Start here (questionnaire)</div>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <code className="flex-1 wrap-break-word rounded border border-light-grey bg-white px-3 py-2 text-xs text-navy">
              {journeyUrl}
            </code>
            <button
              type="button"
              onClick={() => copyText(journeyUrl, setMsg)}
              className="shrink-0 rounded-lg border border-navy/20 bg-navy px-3 py-2 text-[11px] font-semibold tracking-[0.15em] uppercase text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow"
            >
              Copy
            </button>
          </div>
        </li>
        <li>
          <div className="font-semibold text-navy">2 · Play the 3D game (after they finish the form)</div>
          <p className="mt-0.5 text-xs text-medium-grey">
            They reach this from the last step, or you can share it after they have completed the questionnaire on this
            device (same browser).
          </p>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <code className="flex-1 wrap-break-word rounded border border-light-grey bg-white px-3 py-2 text-xs text-navy">
              {playUrl}
            </code>
            <button
              type="button"
              onClick={() => copyText(playUrl, setMsg)}
              className="shrink-0 rounded-lg border border-light-grey bg-white px-3 py-2 text-[11px] font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold transition-colors"
            >
              Copy
            </button>
          </div>
        </li>
      </ul>
      {msg ? <div className="mt-2 text-xs text-medium-grey">{msg}</div> : null}
    </div>
  );
}
