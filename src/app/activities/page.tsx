import type { DemoActivity } from "@/lib/demo-data";
import { ActivityTable } from "@/components/activities/ActivityTable";
import { headers } from "next/headers";

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

async function getActivities(baseUrl: string) {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const res = await fetch(`${baseUrl}/api/activities`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  });
  if (!res.ok) return [] as DemoActivity[];
  const json: unknown = await res.json();
  if (!json || typeof json !== "object") return [] as DemoActivity[];
  const data = "data" in json ? (json as { data?: unknown }).data : undefined;
  return Array.isArray(data) ? (data as DemoActivity[]) : ([] as DemoActivity[]);
}

export default async function ActivitiesPage() {
  const baseUrl = await getBaseUrl();
  const activities = await getActivities(baseUrl);

  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <div className="flex items-end justify-between gap-6">
          <div>
          <h1 className="font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">
            Activities
          </h1>
          <p className="mt-2 text-medium-grey max-w-2xl">
            Tasks, follow-ups, and private viewings — all in one timeline.
          </p>
          </div>
          <button
            type="button"
            className="rounded px-5 py-3 text-xs font-semibold tracking-[0.2em] uppercase text-white bg-[linear-gradient(135deg,#0A1628,#1a2c4e)] hover:shadow-[0_4px_15px_rgba(10,22,40,0.30)] transition-shadow"
          >
            Create Activity
          </button>
        </div>

        <div className="mt-8">
          <ActivityTable activities={activities} />
        </div>
      </div>
    </div>
  );
}


