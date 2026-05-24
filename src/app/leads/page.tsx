import Link from "next/link";
import type { DemoLead } from "@/lib/demo-data";
import { headers } from "next/headers";
import { formatDateTime } from "@/lib/datetime";

function scoreClass(score: number) {
  if (score >= 90) return "bg-success ring-2 ring-gold text-white";
  if (score >= 70) return "bg-gold text-navy";
  if (score >= 40) return "bg-warning text-white";
  return "bg-light-grey text-navy";
}

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

async function getLeads(baseUrl: string) {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const res = await fetch(`${baseUrl}/api/leads`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  });
  if (!res.ok) return [] as DemoLead[];
  const json: unknown = await res.json();
  if (!json || typeof json !== "object") return [] as DemoLead[];
  const data = "data" in json ? (json as { data?: unknown }).data : undefined;
  return Array.isArray(data) ? (data as DemoLead[]) : ([] as DemoLead[]);
}

export default async function LeadsPage() {
  const baseUrl = await getBaseUrl();
  const leads = await getLeads(baseUrl);

  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">
              Prospects
            </h1>
            <p className="mt-2 text-medium-grey max-w-2xl">
              Your pipeline registry — filter, review, and prioritise outreach.
            </p>
          </div>
          <Link
            href="/leads/new"
            className="rounded-lg px-5 py-3 text-sm font-semibold text-white bg-[linear-gradient(135deg,#C9A84C,#A6862E)] shadow-gold hover:shadow-[0_0_28px_rgba(201,168,76,0.22)] transition-shadow inline-block text-center"
          >
            Register Prospect
          </Link>
        </div>

        <div className="mt-8 rounded-xl border border-light-grey bg-white shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-light-grey bg-navy text-white">
            <div className="grid grid-cols-12 gap-4 text-xs tracking-widest uppercase">
              <div className="col-span-4">Prospect</div>
              <div className="col-span-2">Score</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Source</div>
              <div className="col-span-2">Updated</div>
            </div>
          </div>
          <div>
            {leads.map((lead, idx) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className={[
                  "block px-6 py-4 transition-colors",
                  idx % 2 === 0 ? "bg-white" : "bg-cream/30",
                  "hover:bg-cream/60 hover:border-l-[3px] hover:border-gold hover:pl-[21px]",
                ].join(" ")}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-4 min-w-0">
                    <div className="font-medium text-navy truncate">
                      {lead.name}
                    </div>
                    <div className="text-sm text-medium-grey">
                      {lead.budgetLabel}
                    </div>
                    {lead.inventoryFlatNumber || lead.inventoryFlatType ? (
                      <div className="mt-0.5 text-[11px] text-medium-grey/90">
                        Flat: {lead.inventoryFlatNumber ?? "—"}
                        {lead.inventoryFlatType ? ` · ${lead.inventoryFlatType}` : ""}
                      </div>
                    ) : null}
                    {lead.depositStatus || lead.instalmentStatus ? (
                      <div className="mt-0.5 text-[11px] text-medium-grey/90">
                        Deposit: {lead.depositStatus ?? "Pending"} · Instalment: {lead.instalmentStatus ?? "Not started"}
                      </div>
                    ) : null}
                    {lead.lastCallAtLabel ? (
                      <div className="mt-0.5 text-[11px] text-medium-grey/90">
                        Last AI call: {lead.lastCallAtLabel}
                      </div>
                    ) : null}
                  </div>
                  <div className="col-span-2">
                    <span
                      className={[
                        "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold",
                        scoreClass(lead.score),
                      ].join(" ")}
                    >
                      {lead.score}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm text-medium-grey">
                    {lead.status.replaceAll("_", " ")}
                  </div>
                  <div className="col-span-2 text-sm text-medium-grey">
                    {lead.source.replaceAll("_", " ")}
                  </div>
                  <div className="col-span-2 text-sm text-medium-grey">
                    {lead.updatedAtLabel ?? lead.createdAtLabel ?? lead.updatedLabel ?? "—"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


