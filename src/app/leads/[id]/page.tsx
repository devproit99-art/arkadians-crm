import Link from "next/link";
import { OutboundAiCallButton } from "@/components/leads/OutboundAiCallButton";
import { VapiBrowserTestButton } from "@/components/leads/VapiBrowserTestButton";
import { ProspectIntelligenceCard } from "@/components/leads/ProspectIntelligenceCard";
import { ClientNotesCard } from "@/components/leads/ClientNotesCard";
import { AssignedAdvisorControl } from "@/components/leads/AssignedAdvisorControl";
import type { DemoLead } from "@/lib/demo-data";
import { getLatestBrowserTestForLead, getLeadCallLogs } from "@/lib/get-lead-call-logs";
import { cleanBrowserTranscriptLines, parseStoredBrowserTranscript } from "@/lib/vapi/parse-web-transcript-message";
import { buildVapiLeadContext } from "@/lib/vapi-lead-context";
import { getRecentActivitiesForLead } from "@/lib/get-lead-activities";
import { getLeadDetailById } from "@/lib/get-lead-detail";
import { scoreProspect } from "@/lib/prospect-scoring";
import { getSession } from "@/lib/auth";
import { deriveClientProgress } from "@/lib/client-progress";
import { scoreLead } from "@/lib/lead-scoring";
import { AISalesAssistantPanel } from "@/components/leads/AISalesAssistantPanel";
import { prisma } from "@/lib/prisma";
import { parseInventoryTracking } from "@/lib/inventory-tracking";
import { InventoryAssignModal } from "@/components/leads/InventoryAssignModal";

const LEAD_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function scoreClass(score: number) {
  if (score >= 90) return "bg-success ring-2 ring-gold text-white";
  if (score >= 70) return "bg-gold text-navy";
  if (score >= 40) return "bg-warning text-white";
  return "bg-light-grey text-navy";
}

function unitLabel(u: string | undefined) {
  if (!u) return "—";
  return u.includes("_") ? u.replaceAll("_", " ") : u;
}

function inventoryScope(role: string | null | undefined) {
  const r = (role ?? "").toLowerCase();
  return r === "admin" ? "admin" : "user";
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, lead, activities, callLogs, latestBrowserTest] = await Promise.all([
    getSession(),
    getLeadDetailById(id),
    getRecentActivitiesForLead(id, 12),
    getLeadCallLogs(id),
    getLatestBrowserTestForLead(id),
  ]);

  if (!lead) {
    return (
      <div className="px-5 sm:px-8 py-8">
        <div className="w-full max-w-none">
          <Link
            href="/pipeline"
            className="text-sm font-medium text-medium-grey hover:text-navy transition-colors"
          >
            ← Back to pipeline
          </Link>
          <div className="mt-6 rounded-xl border border-light-grey bg-white shadow-card p-6">
            <div className="font-(--font-display) text-lg text-navy">Prospect not found</div>
            <p className="mt-2 text-medium-grey text-sm">
              This lead does not exist or was removed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LeadDetailContent
      sessionUserName={session?.name ?? null}
      sessionUserId={session?.userId ?? null}
      sessionRole={session?.role ?? null}
      lead={lead}
      activities={activities}
      callLogs={callLogs}
      latestBrowserTest={latestBrowserTest}
    />
  );
}

async function LeadDetailContent({
  sessionUserName,
  sessionUserId,
  sessionRole,
  lead,
  activities,
  callLogs,
  latestBrowserTest,
}: {
  sessionUserName: string | null;
  sessionUserId: string | null;
  sessionRole: string | null;
  lead: DemoLead;
  activities: Awaited<ReturnType<typeof getRecentActivitiesForLead>>;
  callLogs: Awaited<ReturnType<typeof getLeadCallLogs>>;
  latestBrowserTest: Awaited<ReturnType<typeof getLatestBrowserTestForLead>>;
}) {
  const created =
    lead.createdAtLabel ?? lead.updatedLabel ?? "—";
  const updated = lead.updatedAtLabel ?? lead.updatedLabel ?? "—";
  const isDbLead = LEAD_UUID_RE.test(lead.id);
  const hasPhone = Boolean(lead.phone?.trim());
  const canOutboundAi = isDbLead && hasPhone;
  const vapiCtx = buildVapiLeadContext({
    id: lead.id,
    name: lead.name,
    budgetMin: lead.budgetMin ?? null,
    budgetMax: lead.budgetMax ?? null,
    preferredUnit: lead.preferredUnit ?? null,
    preferredView: lead.preferredView ?? null,
    urgency: lead.urgency ?? null,
  });
  const ctxBits = [vapiCtx.propertyInterest, vapiCtx.budgetText].filter(Boolean);

  const latestActivity = activities[0] ?? null;
  const nextBooking =
    isDbLead && Boolean(process.env.DATABASE_URL)
      ? await prisma.activity.findFirst({
          where: {
            leadId: lead.id,
            status: { in: ["pending", "in_progress"] },
            dueAt: { not: null, gte: new Date() },
          },
          orderBy: [{ dueAt: "asc" }],
          select: { title: true, type: true, dueAt: true },
        })
      : null;
  const intelligence = scoreProspect(
    {
      name: lead.name,
      status: lead.status,
      budgetMin: lead.budgetMin ?? null,
      budgetMax: lead.budgetMax ?? null,
      urgency: lead.urgency ?? null,
      preferredUnit: lead.preferredUnit ?? null,
      preferredView: lead.preferredView ?? null,
      notes: lead.notes ?? null,
    },
    latestBrowserTest,
    latestActivity,
  );

  const progress = deriveClientProgress({
    status: lead.status,
    notes: lead.notes ?? null,
    latestActivityTitle: latestActivity?.title ?? null,
    latestCallSummary: latestBrowserTest?.summary ?? null,
    latestCallTranscript: latestBrowserTest?.transcript ?? null,
  });

  const aiScore = scoreLead(
    {
      status: lead.status,
      budgetMin: lead.budgetMin ?? null,
      budgetMax: lead.budgetMax ?? null,
      urgency: lead.urgency ?? null,
      notes: lead.notes ?? null,
      source: lead.source,
      preferredUnit: lead.preferredUnit ?? null,
      preferredView: lead.preferredView ?? null,
      lastCallAt: null,
      updatedAt: null,
    },
    {
      latestActivity: latestActivity
        ? {
            type: latestActivity.type,
            status: latestActivity.status,
            title: latestActivity.title,
            dueAt: null,
          }
        : null,
      nextActivity: nextBooking
        ? { type: nextBooking.type, status: "pending", title: nextBooking.title, dueAt: nextBooking.dueAt }
        : null,
      latestCallSummary: latestBrowserTest?.summary ?? null,
      latestCallTranscript: latestBrowserTest?.transcript ?? null,
    },
  );

  const callbackTextFromSummary =
    latestBrowserTest?.summary?.match(/Callback confirmed:\s*([^.]*)/i)?.[1]?.trim() ?? "";
  const callbackText = latestActivity?.dueLabel
    ? `at ${latestActivity.dueLabel}`
    : callbackTextFromSummary
      ? callbackTextFromSummary
      : "";
  const inventoryTracking = parseInventoryTracking(lead.notes ?? undefined);
  const outboundDisabledReason = !isDbLead
    ? "AI outbound calls are only available for prospects saved in the database."
    : !hasPhone
      ? "Add a phone number to this prospect to place a call."
      : undefined;

  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <Link
          href="/pipeline"
          className="inline-flex items-center gap-2 text-sm font-medium text-medium-grey hover:text-navy transition-colors"
        >
          <span aria-hidden>←</span> Back to pipeline
        </Link>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div>
            <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Prospect</div>
            <h1 className="mt-2 font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">
              {lead.name}
            </h1>
            <div className="mt-3 text-sm text-medium-grey space-y-1">
              <div>{lead.phone ?? "Phone not set"}</div>
              <div>{lead.email ?? "Email not set"}</div>
            </div>
          </div>
          <div className="flex flex-col gap-4 shrink-0 w-full sm:w-auto sm:items-end">
            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <OutboundAiCallButton
                leadId={lead.id}
                disabled={!canOutboundAi}
                disabledReason={outboundDisabledReason}
              />
              <VapiBrowserTestButton
                lead={lead}
                persistCallLog={isDbLead}
                vapiPublicKey={
                  process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim() ||
                  process.env.VAPI_PUBLIC_KEY?.trim() ||
                  null
                }
                vapiAssistantId={
                  process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID?.trim() ||
                  process.env.VAPI_ASSISTANT_ID?.trim() ||
                  null
                }
              />
              {ctxBits.length > 0 ? (
                <span className="text-[11px] text-medium-grey">
                  Using CRM context: {ctxBits.join(", ")}
                </span>
              ) : null}
              <Link
                href={`/leads/${lead.id}/edit`}
                className="rounded-lg border border-light-grey bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors"
              >
                Edit Prospect
              </Link>
              <span
                className={[
                  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold",
                  scoreClass(aiScore.score),
                ].join(" ")}
              >
                Score {aiScore.score}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          <div className="space-y-8 min-w-0">
            <AISalesAssistantPanel
              lead={{
                id: lead.id,
                name: lead.name,
                status: lead.status,
                budgetMin: lead.budgetMin ?? null,
                budgetMax: lead.budgetMax ?? null,
                preferredUnit: (lead.preferredUnit as any) ?? null,
                preferredView: (lead.preferredView as any) ?? null,
                urgency: (lead.urgency as any) ?? null,
              }}
              advisorName={sessionUserName ?? lead.ownerLabel ?? "Advisor"}
              canUseAssistant={
                (sessionRole ?? "").toLowerCase() === "admin" ||
                (Boolean(sessionUserId) && Boolean(lead.ownerId) && lead.ownerId === sessionUserId)
              }
              score={aiScore}
              progress={{
                stage: progress.stage,
                paymentStatus: progress.paymentStatus,
                nextAction: progress.nextAction,
                latestSignal: progress.latestSignal,
              }}
              nextActivity={
                nextBooking?.dueAt
                  ? { title: nextBooking.title, type: nextBooking.type, dueAt: nextBooking.dueAt.toISOString() }
                  : null
              }
            />

            <ProspectIntelligenceCard
              score={intelligence.score}
              label={intelligence.label}
              reasons={intelligence.reasons}
              recommendedAction={intelligence.recommendedAction}
              leadName={lead.name}
              propertyInterest={vapiCtx.propertyInterest}
              budgetText={vapiCtx.budgetText || lead.budgetLabel}
              callbackText={callbackText}
            />

            <ClientNotesCard
              leadId={lead.id}
              existingNotes={lead.notes ?? null}
              sessionUserName={sessionUserName}
            />

            <section id="profile" className="rounded-xl border border-light-grey bg-white shadow-card p-6">
              <h2 className="font-(--font-display) text-lg text-navy">Profile</h2>
              <div className="mt-4">
                <AssignedAdvisorControl
                  leadId={lead.id}
                  currentOwnerId={lead.ownerId ?? null}
                  currentOwnerLabel={lead.ownerLabel ?? null}
                  sessionUserId={sessionUserId}
                  sessionRole={sessionRole}
                />
              </div>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ["Status", lead.status.replaceAll("_", " ")],
                  ["Source", lead.source.replaceAll("_", " ")],
                  ["Budget", lead.budgetLabel],
                  ["Urgency", lead.urgency?.replaceAll("_", " ") ?? "medium"],
                  ["Preferred unit", unitLabel(lead.preferredUnit)],
                  ["Preferred view", lead.preferredView ? `${unitLabel(lead.preferredView)} view` : "—"],
                  ["Interested flat", inventoryTracking.flatNumber ?? "—"],
                  ["Inventory tower", inventoryTracking.tower ?? "—"],
                  ["Flat type", inventoryTracking.flatType ?? "—"],
                  ["Inventory view", inventoryTracking.viewCategory ?? "—"],
                  ["Inventory stage", inventoryTracking.clientStage],
                  ["Deposit status", inventoryTracking.depositStatus],
                  ["Instalment status", inventoryTracking.instalmentStatus],
                  ["Language", lead.language ?? "en"],
                  ["Created", created],
                  ["Last updated", updated],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-light-grey bg-cream/30 p-4">
                    <div className="text-xs tracking-widest uppercase text-medium-grey">{k}</div>
                    <div className="mt-2 text-sm font-medium text-navy">{v}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-light-grey bg-white shadow-card overflow-hidden">
              <div className="p-6">
                <h2 className="font-(--font-display) text-lg text-navy">Available inventory</h2>
                <p className="mt-2 text-sm text-medium-grey max-w-2xl">
                  Browse inventory here. Select a flat from the table and assign a status for this lead.
                </p>
              </div>
              <div className="px-6 pb-6">
                <InventoryAssignModal
                  leadId={lead.id}
                  sessionRole={sessionRole}
                />
              </div>
              <iframe
                title="Arkadians Inventory (Available)"
                src={`/inventory/index.html?scope=${encodeURIComponent(inventoryScope(sessionRole))}&select=1&leadId=${encodeURIComponent(lead.id)}&v=3`}
                className="w-full min-h-[70vh]"
              />
            </section>

            <section className="rounded-xl border border-light-grey bg-white shadow-card p-6">
              <h2 className="font-(--font-display) text-lg text-navy">Call history</h2>
              {callLogs.length === 0 ? (
                <p className="mt-4 text-sm text-medium-grey leading-relaxed">
                  No logged calls yet. Outbound AI calls will appear here after you start them.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {callLogs.map((c: any) => (
                    <li
                      key={c.id}
                      className="rounded-lg border border-light-grey bg-cream/20 px-4 py-3 text-sm"
                    >
                      <div className="text-xs text-medium-grey">{c.atLabel}</div>
                      <div className="mt-1 font-medium text-navy">
                        {c.direction.replaceAll("_", " ")} · {c.status}
                      </div>
                      {(c.summary || c.outcome) && (
                        <div className="mt-1 text-xs text-medium-grey leading-relaxed">
                          {c.summary ?? c.outcome}
                        </div>
                      )}
                      {c.vapiCallId ? (
                        <div className="mt-1 text-[11px] font-mono text-medium-grey/80 break-all">
                          Vapi {c.vapiCallId}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {isDbLead && latestBrowserTest ? (
            <section className="rounded-xl border border-light-grey bg-white shadow-card p-6 h-fit">
              <h2 className="font-(--font-display) text-lg text-navy">Latest AI browser test</h2>
              <div className="mt-2 text-xs text-medium-grey space-y-0.5">
                <div>{latestBrowserTest.startedAtLabel}</div>
                {latestBrowserTest.endedAtLabel ? <div>Ended {latestBrowserTest.endedAtLabel}</div> : null}
                <div className="font-medium text-navy">
                  {latestBrowserTest.status.replaceAll("_", " ")}
                  {latestBrowserTest.durationSeconds != null
                    ? ` · ${latestBrowserTest.durationSeconds}s`
                    : ""}
                </div>
              </div>
              {latestBrowserTest.summary ? (
                <p className="mt-3 text-xs text-medium-grey leading-relaxed">{latestBrowserTest.summary}</p>
              ) : null}
              <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-light-grey bg-cream/20 p-3 text-xs text-navy leading-relaxed space-y-2">
                {(() => {
                  const parsed = parseStoredBrowserTranscript(latestBrowserTest.transcript);
                  const lines = parsed ? cleanBrowserTranscriptLines(parsed) : null;
                  if (lines && lines.length > 0) {
                    return lines.map((line, i) => (
                      <p key={`${line.role}-${i}`}>
                        <span className="font-semibold text-medium-grey">
                          {line.role === "assistant" ? "Assistant:" : "Prospect:"}
                        </span>{" "}
                        {line.text}
                      </p>
                    ));
                  }
                  if (latestBrowserTest.transcript?.trim()) {
                    return (
                      <p className="text-medium-grey whitespace-pre-wrap wrap-break-word">
                        {latestBrowserTest.transcript.slice(0, 8000)}
                        {latestBrowserTest.transcript.length > 8000 ? "…" : ""}
                      </p>
                    );
                  }
                  return (
                    <p className="text-medium-grey">
                      No transcript lines were stored yet. Run another browser test or check that the assistant
                      emits client messages.
                    </p>
                  );
                })()}
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border border-light-grey bg-white shadow-card p-6 h-fit">
            <h2 className="font-(--font-display) text-lg text-navy">Client Progress</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                ["Stage", progress.stage],
                ["Payment status", progress.paymentStatus],
                ["Interested flat", inventoryTracking.flatNumber ?? "—"],
                ["Inventory tower", inventoryTracking.tower ?? "—"],
                ["Flat type", inventoryTracking.flatType ?? "—"],
                ["Inventory view", inventoryTracking.viewCategory ?? "—"],
                ["Inventory stage", inventoryTracking.clientStage],
                ["Assigned advisor", lead.ownerLabel ?? "Unassigned"],
                ["Estimated value", lead.budgetLabel],
                ["Deposit status", inventoryTracking.depositStatus],
                ["Instalment status", inventoryTracking.instalmentStatus],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-light-grey bg-cream/20 px-4 py-3">
                  <div className="text-xs tracking-widest uppercase text-medium-grey">{k}</div>
                  <div className="mt-1 text-sm font-semibold text-navy">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-light-grey bg-cream/20 px-4 py-3">
              <div className="text-xs tracking-widest uppercase text-medium-grey">Next step</div>
              <div className="mt-1 text-sm text-navy">{progress.nextAction}</div>
            </div>
            <div className="mt-3 text-xs text-medium-grey leading-relaxed">
              <span className="font-semibold text-navy">Latest note:</span>{" "}
              {progress.latestSignal ?? "—"}
            </div>
          </section>

          <section className="rounded-xl border border-light-grey bg-white shadow-card p-6 h-fit">
            <h2 className="font-(--font-display) text-lg text-navy">Activity & follow-up</h2>
            {activities.length === 0 ? (
              <div className="mt-5 text-sm text-medium-grey leading-relaxed">
                <p>No activities logged for this lead yet.</p>
                <p className="mt-3 text-xs text-medium-grey/90">
                  Deeper activity tracking and task assignments are coming next.
                </p>
              </div>
            ) : (
              <ul className="mt-5 border-l border-gold pl-4 space-y-4">
                {activities.map((a: any) => (
                  <li key={a.id} className="relative">
                    <div className="absolute left-[-21px] top-1.5 w-2 h-2 rounded-full bg-gold shadow-gold" />
                    <div className="text-xs uppercase tracking-wider text-medium-grey">
                      {a.type} · {a.status}
                    </div>
                    <div className="mt-1 text-sm font-medium text-navy">{a.title}</div>
                    <div className="mt-1 text-xs text-medium-grey">Logged {a.createdLabel}</div>
                    {a.dueLabel ? (
                      <div className="mt-0.5 text-xs text-medium-grey">Due {a.dueLabel}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
