"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/pipeline";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Try to play audio once on load (may be blocked until user gesture by browsers).
    setSoundEnabled(true);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !soundEnabled;
    v.volume = 0.6;
    v.loop = !soundEnabled;
    if (soundEnabled) {
      void v.play().catch(() => {
        // Autoplay with sound is typically blocked until user gesture.
      });
    }
  }, [soundEnabled]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    function handleEnded() {
      // If the user enabled sound, let audio play once, then revert to looped muted playback.
      if (!soundEnabled) return;
      const vv = videoRef.current;
      if (!vv) return;
      setSoundEnabled(false);
      vv.currentTime = 0;
      vv.muted = true;
      vv.loop = true;
      void vv.play().catch(() => null);
    }

    v.addEventListener("ended", handleEnded);
    return () => v.removeEventListener("ended", handleEnded);
  }, [soundEnabled]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          json && typeof json === "object" && "error" in json
            ? (json as { error?: { message?: string } }).error?.message
            : null;
        setError(msg ?? "Could not sign in.");
        return;
      }
      router.push(from.startsWith("/") ? from : "/pipeline");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-5 py-16 bg-cream">
      <div className="w-full max-w-lg aspect-9/16 rounded-3xl border border-gold/20 bg-navy shadow-card overflow-hidden">
        <div className="relative h-full">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden object-[50%_0%]"
            autoPlay
            muted
            playsInline
            preload="auto"
            poster="/arkadians-logo.png"
            aria-hidden="true"
          >
            <source src="/login.mp4" type="video/mp4" />
          </video>

          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(10,22,40,0.10),rgba(10,22,40,0.80))]"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-60 bg-[linear-gradient(0deg,rgba(10,22,40,0.90),rgba(10,22,40,0.35),transparent)]"
            aria-hidden="true"
          />

          <div className="relative z-10 h-full flex flex-col">
            <div className="absolute top-4 left-4 z-20">
              <img
                src="/arkadians-clearlogo-alpha.png"
                alt="The Arkadians"
                className="h-32 w-auto opacity-95 drop-shadow-[0_12px_34px_rgba(10,22,40,0.50)]"
              />
            </div>

            <div className="flex-1 flex items-end justify-center px-6 pb-5 sm:pb-6">
              <div className="w-full max-w-xs sm:max-w-sm rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl px-5 py-4 shadow-[0_18px_60px_rgba(10,22,40,0.45)]">
                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5">
                  {error ? (
                    <div className="rounded-lg border border-warning/40 bg-warning/15 px-4 py-3 text-sm text-white">
                      {error}
                    </div>
                  ) : null}

                  <label className="block">
                    <span className="text-[11px] tracking-[0.28em] uppercase text-white/70">Email</span>
                    <input
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-gold/40"
                      placeholder="ahmad@arkadians.local"
                    />
                  </label>

                  <div className="block">
                    <span className="text-[11px] tracking-[0.28em] uppercase text-white/70">Password</span>
                    <div className="relative mt-2">
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-white/10 pl-4 pr-12 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/75 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        aria-controls="login-password"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative mt-1.5 w-full overflow-hidden rounded-xl py-2.5 text-sm font-semibold text-white bg-white/10 border border-white/20 backdrop-blur-md shadow-[0_14px_38px_rgba(10,22,40,0.28)] hover:bg-white/15 transition-colors disabled:opacity-50"
                  >
                    <span
                      className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 bg-[linear-gradient(135deg,rgba(212,175,55,0.18),rgba(255,255,255,0.06))] transition-opacity"
                      aria-hidden="true"
                    />
                    <span className="relative tracking-[0.18em] uppercase">
                      {loading ? "Signing in…" : "Sign in"}
                    </span>
                  </button>
                </form>
              </div>
            </div>

            <div className="px-8 pb-7 sm:pb-9">
              <div className="text-center text-[11px] text-white/70 leading-relaxed space-y-2">
                <p>
                  Demo:{" "}
                  <span className="font-medium text-white">ahmad@arkadians.local</span>,{" "}
                  <span className="font-medium text-white">sara@arkadians.local</span>,{" "}
                  <span className="font-medium text-white">bilal@arkadians.local</span>,{" "}
                  <span className="font-medium text-white">nadia@arkadians.local</span>,{" "}
                  <span className="font-medium text-white">ceo@arkadians.local</span>,{" "}
                  <span className="font-medium text-white">admin@arkadians.local</span>
                </p>
                <p>
                  Team / CEO password: <span className="font-mono text-white">Welcome1!</span>
                  {" · "}
                  Admin only: <span className="font-mono text-white">ArkadiansDemo2026!</span>
                </p>
                <p className="text-white/55">
                  CEO: executive dashboard, pipeline, prospects, activities, and construction — no admin tools,
                  calls, calendar, or buyer tools. Run{" "}
                  <span className="font-mono text-white/80">npm run db:seed</span> if ceo@ is missing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
