"use client";

import { useCallback, useEffect, useState } from "react";
import { ResidenceSelector } from "@/components/game/ResidenceSelector";
import { BuyerShareUrls } from "@/components/experience/BuyerShareUrls";
import { GoogleGameSignIn } from "@/components/experience/GoogleGameSignIn";

type GameSessionResponse = {
  data: {
    signedIn: boolean;
    authMode: "guest" | "google";
    email: string | null;
    name: string | null;
  };
};

export function ExperienceClient() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [authMode, setAuthMode] = useState<"guest" | "google">("guest");
  const [name, setName] = useState<string | null>(null);
  const googleRequired = Boolean(process.env.NEXT_PUBLIC_GOOGLE_GAME_CLIENT_ID?.trim());

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/game-session", { credentials: "same-origin" });
      const json = (await res.json().catch(() => null)) as GameSessionResponse | null;
      const d = json?.data;
      if (!d) {
        setSignedIn(false);
        setAuthMode("google");
        return;
      }
      setAuthMode(d.authMode);
      setSignedIn(Boolean(d.signedIn));
      setName(d.name);
    } catch {
      setSignedIn(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  async function signOutGame() {
    await fetch("/api/auth/google-game/logout", { method: "POST", credentials: "same-origin" });
    await refreshSession();
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-light-grey bg-white shadow-card p-10 text-center text-sm text-medium-grey">
        Loading…
      </div>
    );
  }

  const showGoogleGate = googleRequired && authMode === "google" && !signedIn;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-light-grey bg-white shadow-card p-6 sm:p-8">
        <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Shareable link</div>
        <h2 className="mt-2 font-(--font-display) text-2xl text-navy tracking-tight">Welcome to Arkadians</h2>
        <p className="mt-2 text-sm text-medium-grey leading-relaxed max-w-2xl">
          Send this page to your buyer. When Google sign-in is enabled, they sign in once, complete the short
          questionnaire, then open the 3D experience. Without Google configured, they can go straight to the form
          (demo / internal use).
        </p>
        <div className="mt-5">
          <BuyerShareUrls />
        </div>
        {googleRequired && signedIn ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-light-grey bg-cream/30 px-4 py-3 text-sm text-navy">
            <span>
              Signed in as <span className="font-semibold">{name ?? "Google user"}</span>
            </span>
            <button
              type="button"
              onClick={() => void signOutGame()}
              className="rounded-lg border border-light-grey bg-white px-3 py-1.5 text-xs font-semibold tracking-[0.15em] uppercase text-medium-grey hover:border-gold hover:text-navy transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>

      {showGoogleGate ? (
        <div className="rounded-xl border border-gold/25 bg-white shadow-card p-6 sm:p-8">
          <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Step 1</div>
          <h3 className="mt-2 font-(--font-display) text-xl text-navy">Sign in with Google</h3>
          <p className="mt-2 text-sm text-medium-grey">
            Use the Google account you use for Arkadians updates. After sign-in, the preference form appears below.
          </p>
          <div className="mt-6 flex justify-center">
            <GoogleGameSignIn onSignedIn={() => void refreshSession()} />
          </div>
        </div>
      ) : null}

      {!showGoogleGate ? (
        <div>
          {googleRequired ? (
            <div className="mb-4 text-xs tracking-[0.2em] uppercase text-medium-grey">Step 2 · Your preferences</div>
          ) : null}
          <ResidenceSelector playBasePath="/experience/play" />
        </div>
      ) : null}
    </div>
  );
}
