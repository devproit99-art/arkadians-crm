import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import type { PipelineLead } from "@/components/pipeline/types";
import {
  mapApiLeadToPipelineLead,
  type ApiLeadListItem,
} from "@/lib/map-lead-to-pipeline";
import { getSession } from "@/lib/auth";

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

/** Same /api/leads source as Prospects; mapped for the board. */
async function getInitialPipelineLeads(): Promise<PipelineLead[]> {
  try {
    const baseUrl = await getBaseUrl();
    const h = await headers();
    const cookie = h.get("cookie") ?? "";
    const res = await fetch(`${baseUrl}/api/leads?limit=100&page=1`, {
      cache: "no-store",
      headers: cookie ? { cookie } : undefined,
    });
    if (!res.ok) return [];
    const json: unknown = await res.json();
    const data =
      json && typeof json === "object" && "data" in json
        ? (json as { data?: unknown }).data
        : undefined;
    if (!Array.isArray(data)) return [];
    return data.map((row) => mapApiLeadToPipelineLead(row as ApiLeadListItem));
  } catch {
    return [];
  }
}

export default async function PipelinePage() {
  const session = await getSession();
  const role = (session?.role ?? "").toLowerCase();
  const isAdmin = role === "admin";
  const isCeo = role === "ceo";
  // Sales users default to their own board for focus.
  if (session && !isAdmin && !isCeo) {
    redirect("/pipeline/my-board");
  }
  const initialLeads = await getInitialPipelineLeads();
  const boardKey =
    initialLeads.length === 0
      ? "empty"
      : initialLeads
          .map((l: any) => l.id)
          .sort()
          .join("|");

  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">
              Sales Pipeline
            </h1>
            <p className="mt-2 text-medium-grey max-w-2xl">
              Manage active prospects and track high-value negotiations across
              the registry.
            </p>
          </div>
          <Link
            href="/leads/new"
            className="rounded px-5 py-3 text-xs font-semibold tracking-[0.2em] uppercase text-white bg-[linear-gradient(135deg,#0A1628,#1a2c4e)] hover:shadow-[0_4px_15px_rgba(10,22,40,0.30)] transition-shadow inline-block text-center"
          >
            Register Prospect
          </Link>
        </div>

        <div className="mt-8">
          <KanbanBoard
            key={boardKey}
            initialLeads={initialLeads}
            leadsUrl="/api/leads?limit=100&page=1"
            sessionUserId={session?.userId ?? null}
            sessionRole={session?.role ?? null}
          />
        </div>
      </div>
    </div>
  );
}

