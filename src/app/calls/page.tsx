import type { DemoCall } from "@/lib/demo-data";
import { CallTable } from "@/components/calls/CallTable";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { redirectCeoFromAdvisorRoute } from "@/lib/redirect-ceo-from-advisor-routes";

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

async function getCalls(baseUrl: string) {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const res = await fetch(`${baseUrl}/api/calls`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  });
  if (!res.ok) return [] as DemoCall[];
  const json: unknown = await res.json();
  if (!json || typeof json !== "object") return [] as DemoCall[];
  const data = "data" in json ? (json as { data?: unknown }).data : undefined;
  return Array.isArray(data) ? (data as DemoCall[]) : ([] as DemoCall[]);
}

export default async function CallsPage() {
  const session = await getSession();
  if (!session) redirect(`/login?from=${encodeURIComponent("/calls")}`);
  redirectCeoFromAdvisorRoute(session.role);

  const baseUrl = await getBaseUrl();
  const calls = await getCalls(baseUrl);

  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <div className="flex items-end justify-between gap-6">
          <div>
          <h1 className="font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">
            Calls
          </h1>
          <p className="mt-2 text-medium-grey max-w-2xl">
            Review call activity and transcripts captured by your concierge.
          </p>
          </div>
          <button
            type="button"
            className="rounded px-5 py-3 text-xs font-semibold tracking-[0.2em] uppercase text-white bg-[linear-gradient(135deg,#0A1628,#1a2c4e)] hover:shadow-[0_4px_15px_rgba(10,22,40,0.30)] transition-shadow"
          >
            Log Call
          </button>
        </div>

        <div className="mt-8">
          <CallTable calls={calls} />
        </div>
      </div>
    </div>
  );
}

