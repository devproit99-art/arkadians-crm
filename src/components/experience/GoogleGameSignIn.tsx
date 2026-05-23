"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            el: HTMLElement,
            opts: { theme?: string; size?: string; text?: string; width?: number; shape?: string },
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function GoogleGameSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_GAME_CLIENT_ID?.trim() ?? "";

  useEffect(() => {
    if (!clientId || !containerRef.current) return;

    let cancelled = false;
    const el = containerRef.current;

    function handleCredential(resp: { credential?: string }) {
      if (!resp.credential) {
        setError("No credential returned.");
        return;
      }
      void (async () => {
        setError(null);
        const res = await fetch("/api/auth/google-game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ credential: resp.credential }),
        });
        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            json && typeof json === "object" && "error" in json
              ? (json as { error?: { message?: string } }).error?.message
              : null;
          setError(msg ?? "Sign-in failed.");
          return;
        }
        onSignedIn();
      })();
    }

    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    ) as HTMLScriptElement | null;
    const script: HTMLScriptElement = existing ?? document.createElement("script");
    if (!existing) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    function init() {
      if (cancelled || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
      });
      el.innerHTML = "";
      window.google.accounts.id.renderButton(el, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        width: 320,
        shape: "pill",
      });
    }

    if (window.google?.accounts?.id) {
      init();
    } else {
      script.addEventListener("load", init);
    }

    return () => {
      cancelled = true;
      script.removeEventListener("load", init);
    };
  }, [clientId, onSignedIn]);

  if (!clientId) {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-navy">
        Google sign-in is not configured. Add <span className="font-mono">NEXT_PUBLIC_GOOGLE_GAME_CLIENT_ID</span> to
        your environment.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="flex justify-center" />
      {error ? <div className="text-center text-sm text-error">{error}</div> : null}
    </div>
  );
}
