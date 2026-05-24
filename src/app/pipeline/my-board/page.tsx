import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import type { PipelineLead } from "@/components/pipeline/types";
import { mapApiLeadToPipelineLead, type ApiLeadListItem } from "@/lib/map-lead-to-pipeline";

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

async function fetchBoardLeads(ownerId: string): Promise<PipelineLead[]> {
  const baseUrl = await getBaseUrl();
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const res = await fetch(`${baseUrl}/api/leads?limit=100&page=1&ownerId=${encodeURIComponent(ownerId)}`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  });
  if (!res.ok) return [];
  const json: unknown = await res.json();
  const data =
    json && typeof json === "object" && "data" in json ? (json as { data?: unknown }).data : undefined;
  if (!Array.isArray(data)) return [];
  return data.map((row) => mapApiLeadToPipelineLead(row as ApiLeadListItem));
}

export default async function MyBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ ownerId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect(`/login?from=${encodeURIComponent("/pipeline/my-board")}`);

  const role = (session.role ?? "").toLowerCase();
  if (role === "ceo") {
    redirect("/pipeline");
  }

  const isAdmin = role === "admin";
  const sp = await searchParams;
  const requestedOwnerId = sp.ownerId?.trim();

  const ownerId = isAdmin && requestedOwnerId ? requestedOwnerId : session.userId;

  const [initialLeads, users] = await Promise.all([
    fetchBoardLeads(ownerId),
    isAdmin
      ? prisma.user.findMany({
          where: { status: "active", role: { in: ["manager", "sales_rep"] } },
          orderBy: [{ role: "asc" }, { name: "asc" }],
          select: { id: true, name: true, role: true },
        })
      : Promise.resolve([]),
  ]);

  const boardKey =
    initialLeads.length === 0
      ? `empty_${ownerId}`
      : `${ownerId}_${initialLeads.map((l: any) => l.id).sort().join("|")}`;

  const ownerName =
    (isAdmin ? users.find((u: any) => u.id === ownerId)?.name : session.name) ?? "My";

  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">My Board</div>
            <h1 className="mt-2 font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">
              {ownerName} Pipeline
            </h1>
            <p className="mt-2 text-medium-grey max-w-2xl">
              Your assigned prospects across the pipeline.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={isAdmin ? `/?ownerId=${encodeURIComponent(ownerId)}` : "/"}
              className="rounded-lg border border-light-grey bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors"
            >
              View dashboard
            </Link>
            <Link
              href="/pipeline"
              className="rounded-lg border border-light-grey bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors"
            >
              Overall pipeline
            </Link>
            <Link
              href="/leads/new"
              className="rounded px-5 py-3 text-xs font-semibold tracking-[0.2em] uppercase text-white bg-[linear-gradient(135deg,#0A1628,#1a2c4e)] hover:shadow-[0_4px_15px_rgba(10,22,40,0.30)] transition-shadow inline-block text-center"
            >
              Register Prospect
            </Link>
          </div>
        </div>

        {isAdmin ? (
          <div className="mt-6 rounded-xl border border-light-grey bg-white shadow-card p-5">
            <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">View board for</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {users.map((u: any) => (
                <Link
                  key={u.id}
                  href={`/pipeline/my-board?ownerId=${encodeURIComponent(u.id)}`}
                  className={[
                    "rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                    u.id === ownerId
                      ? "border-gold bg-cream/60 text-navy"
                      : "border-light-grey bg-white text-medium-grey hover:bg-cream/40 hover:text-navy",
                  ].join(" ")}
                >
                  {u.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8">
          <KanbanBoard
            key={boardKey}
            initialLeads={initialLeads}
            leadsUrl={`/api/leads?limit=100&page=1&ownerId=${encodeURIComponent(ownerId)}`}
            sessionUserId={session.userId}
            sessionRole={session.role ?? null}
          />
        </div>
      </div>
    </div>
  );
}


