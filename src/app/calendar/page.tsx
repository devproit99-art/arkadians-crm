import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirectCeoFromAdvisorRoute } from "@/lib/redirect-ceo-from-advisor-routes";
import { formatDateOnly, formatDateTime } from "@/lib/datetime";
import { MonthlyCalendarGrid } from "@/components/calendar/MonthlyCalendarGrid";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

type Row = {
  id: string;
  dueAt: Date;
  type: string;
  title: string;
  status: string;
  priority: string;
  leadId: string;
  leadName: string;
  userId: string | null;
  userName: string | null;
};

function groupByDate(rows: Row[]) {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const key = formatDateOnly(r.dueAt);
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseMonthParam(month: string | undefined) {
  const m = (month ?? "").trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null;
  return { year: y, monthIndex: mo - 1 };
}

function defaultMonthIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function monthRange(monthIso: string) {
  const parsed = parseMonthParam(monthIso);
  const base = parsed ? new Date(parsed.year, parsed.monthIndex, 1) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
  const endExclusive = new Date(base.getFullYear(), base.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, endExclusive, base };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; month?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect(`/login?from=${encodeURIComponent("/calendar")}`);
  redirectCeoFromAdvisorRoute(session.role);

  const isAdmin = (session.role ?? "").toLowerCase() === "admin";
  const sp = await searchParams;
  const selectedUserId = isAdmin ? sp.userId?.trim() || "" : session.userId;
  const monthIso = parseMonthParam(sp.month) ? (sp.month as string) : defaultMonthIso();
  const { start, endExclusive } = monthRange(monthIso);

  if (!hasDatabase()) {
    return (
      <div className="px-5 sm:px-8 py-8">
        <div className="w-full max-w-none">
          <div className="rounded-xl border border-light-grey bg-white shadow-card p-6">
            <div className="font-(--font-display) text-lg text-navy">Calendar</div>
            <p className="mt-2 text-sm text-medium-grey">Database is not configured.</p>
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const upcomingEnd = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

  const [users, rows] = await Promise.all([
    isAdmin
      ? prisma.user.findMany({
          where: { status: "active", role: { in: ["manager", "sales_rep"] } },
          orderBy: [{ role: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    prisma.activity.findMany({
      where: {
        status: { in: ["pending", "in_progress", "completed"] },
        dueAt: { gte: start, lt: endExclusive },
        ...(selectedUserId
          ? {
              OR: [
                { userId: selectedUserId },
                // Fallback: if older activities didn't set userId, attribute to lead owner.
                { userId: null, lead: { ownerId: selectedUserId } },
              ],
            }
          : {}),
      },
      orderBy: [{ dueAt: "asc" }],
      take: 800,
      select: {
        id: true,
        dueAt: true,
        type: true,
        title: true,
        status: true,
        priority: true,
        leadId: true,
        lead: { select: { name: true } },
        userId: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  const list: Row[] = rows
    .filter((r) => r.dueAt)
    .map((r) => ({
      id: r.id,
      dueAt: r.dueAt!,
      type: r.type,
      title: r.title,
      status: r.status,
      priority: r.priority,
      leadId: r.leadId,
      leadName: r.lead.name,
      userId: r.userId ?? null,
      userName: r.user?.name ?? null,
    }));

  const grouped = groupByDate(
    list.filter((r) => r.dueAt >= now && r.dueAt <= upcomingEnd && r.status !== "completed"),
  );

  const selectedName =
    isAdmin && selectedUserId
      ? users.find((u) => u.id === selectedUserId)?.name ?? "All staff"
      : session.name;

  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <h1 className="font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">Calendar</h1>
            <p className="mt-2 text-medium-grey max-w-2xl">
              Monthly view of callbacks, viewings, meetings, and client tasks.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/pipeline/my-board"
              className="rounded-lg border border-light-grey bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors"
            >
              Boards
            </Link>
            <Link
              href="/admin"
              className="rounded-lg border border-light-grey bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>

        {!isAdmin ? <div className="mt-6 text-xs text-medium-grey">Viewing: {selectedName}</div> : null}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <MonthlyCalendarGrid
              monthIso={monthIso}
              selectedUserId={selectedUserId}
              isAdmin={isAdmin}
              userOptions={users}
              events={list.map((r) => ({
                id: r.id,
                dueAt: r.dueAt.toISOString(),
                type: r.type,
                title: r.title,
                status: r.status,
                leadId: r.leadId,
                leadName: r.leadName,
                userName: r.userName,
              }))}
            />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-xl border border-light-grey bg-white shadow-card p-6 h-fit">
              <div className="font-(--font-display) text-lg text-navy">Upcoming</div>
              <p className="mt-2 text-sm text-medium-grey">
                Next 21 days{isAdmin ? (selectedUserId ? ` · ${selectedName}` : " · All staff") : ""}.
              </p>
              {grouped.length === 0 ? (
                <p className="mt-4 text-sm text-medium-grey">No upcoming bookings in the next 21 days.</p>
              ) : (
                <div className="mt-5 space-y-6">
                  {grouped.map(([date, rowsForDay]) => (
                    <div key={date}>
                      <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">{date}</div>
                      <ul className="mt-3 space-y-3">
                        {rowsForDay.map((r) => (
                          <li key={r.id} className="rounded-lg border border-light-grey bg-cream/20 px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-navy">{formatDateTime(r.dueAt)}</div>
                              <div className="text-xs text-medium-grey">
                                {r.type.replaceAll("_", " ")} · {r.status.replaceAll("_", " ")}
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-navy">{r.title}</div>
                            <div className="mt-1 text-xs text-medium-grey">
                              Client:{" "}
                              <Link
                                href={`/leads/${r.leadId}`}
                                className="font-semibold hover:text-gold transition-colors"
                              >
                                {r.leadName}
                              </Link>
                              {isAdmin && !selectedUserId && r.userName ? ` · Advisor: ${r.userName}` : ""}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-light-grey bg-white shadow-card p-6 h-fit">
              <div className="font-(--font-display) text-lg text-navy">AI booked callbacks</div>
              <p className="mt-2 text-sm text-medium-grey leading-relaxed">
                When the AI confirms a callback time, it creates a follow-up activity with a due date and assigns it to the
                lead owner.
              </p>
              <div className="mt-4 rounded-lg border border-light-grey bg-cream/20 p-4 text-xs text-medium-grey leading-relaxed">
                Tip: Run a browser AI test, confirm a callback time, and refresh this calendar to see the booking appear.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

