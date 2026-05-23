"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

const UNLOCK_KEY = "arkadians_buyer_game_unlocked";

type GamePlayClientProps = {
  /** Navbar “Exit” target */
  backHref?: string;
  /** Where to send users if the questionnaire or Google step is missing */
  questionnaireHomeHref?: string;
  /** Public experience: require Google game-session cookie when client ID is configured */
  requireGameSession?: boolean;
};

function GamePlayInner({
  backHref = "/game",
  questionnaireHomeHref = "/game",
  requireGameSession = false,
}: GamePlayClientProps) {
  const searchParams = useSearchParams();
  const preview = searchParams.get("preview") === "1";
  /** Upstream [arkadians-game](https://github.com/cerebriustech-AutomateX/arkadians-game) ships a single `game.html` build. */
  const src = useMemo(() => "/arkadians-game/game.html", []);

  const [quizUnlocked, setQuizUnlocked] = useState(false);
  const [gameGate, setGameGate] = useState<"loading" | "ok" | "blocked">("loading");

  useEffect(() => {
    if (preview) {
      setGameGate("ok");
      return;
    }
    if (!requireGameSession) {
      setGameGate("ok");
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/auth/game-session", { credentials: "same-origin" });
        const json: unknown = await res.json().catch(() => null);
        const signedIn =
          json && typeof json === "object" && "data" in json
            ? Boolean((json as { data?: { signedIn?: boolean } }).data?.signedIn)
            : false;
        if (!alive) return;
        setGameGate(signedIn ? "ok" : "blocked");
      } catch {
        if (!alive) return;
        setGameGate("blocked");
      }
    })();
    return () => {
      alive = false;
    };
  }, [preview, requireGameSession]);

  useEffect(() => {
    if (preview) {
      setQuizUnlocked(true);
      return;
    }
    try {
      setQuizUnlocked(sessionStorage.getItem(UNLOCK_KEY) === "1");
    } catch {
      setQuizUnlocked(false);
    }
  }, [preview]);

  if (!preview && requireGameSession && gameGate === "loading") {
    return (
      <div className="min-h-[40vh] flex items-center justify-center bg-cream text-sm text-medium-grey">
        Checking access…
      </div>
    );
  }

  if (!preview && requireGameSession && gameGate === "blocked") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-5 py-16 bg-cream">
        <div className="max-w-md rounded-xl border border-light-grey bg-white shadow-card p-8 text-center">
          <h1 className="font-(--font-display) text-xl text-navy">Sign in required</h1>
          <p className="mt-3 text-sm text-medium-grey leading-relaxed">
            Sign in with Google on the experience page first, then complete the questionnaire. After that you can open
            the 3D world.
          </p>
          <Link
            href={questionnaireHomeHref}
            className="mt-6 inline-flex rounded-lg border border-navy/20 bg-navy px-5 py-2.5 text-xs font-semibold tracking-[0.15em] uppercase text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow"
          >
            Back to experience
          </Link>
        </div>
      </div>
    );
  }

  if (!quizUnlocked && !preview) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-5 py-16 bg-cream">
        <div className="max-w-md rounded-xl border border-light-grey bg-white shadow-card p-8 text-center">
          <h1 className="font-(--font-display) text-xl text-navy">3D experience locked</h1>
          <p className="mt-3 text-sm text-medium-grey leading-relaxed">
            Complete the buyer questionnaire first. After you finish all steps, you can open the 3D world.
          </p>
          <Link
            href={questionnaireHomeHref}
            className="mt-6 inline-flex rounded-lg border border-navy/20 bg-navy px-5 py-2.5 text-xs font-semibold tracking-[0.15em] uppercase text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow"
          >
            Back to questionnaire
          </Link>
          <p className="mt-4 text-[11px] text-medium-grey">
            Staff preview: add <span className="font-mono">?preview=1</span> to this URL.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-navy">
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-navy/90 px-4 py-3 backdrop-blur-sm">
        <Link
          href={backHref}
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold tracking-[0.15em] uppercase text-white hover:bg-white/15 transition-colors"
        >
          Exit game
        </Link>
        <div className="text-[11px] tracking-[0.2em] uppercase text-white/60 truncate">Arkadians 3D</div>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold tracking-[0.15em] uppercase text-white hover:bg-white/15 transition-colors shrink-0"
        >
          Open tab
        </a>
      </div>
      <iframe title="Arkadians 3D experience" src={src} className="absolute inset-0 h-full w-full border-0 pt-[52px]" />
    </div>
  );
}

export function GamePlayClient(props: GamePlayClientProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center bg-cream text-sm text-medium-grey">
          Loading…
        </div>
      }
    >
      <GamePlayInner {...props} />
    </Suspense>
  );
}
