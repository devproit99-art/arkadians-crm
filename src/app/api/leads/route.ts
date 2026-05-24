import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { demoLeads, type DemoLead } from "@/lib/demo-data";
import { formatBudget } from "@/lib/budget";
import { formatDateTime } from "@/lib/datetime";
import { scoreLead } from "@/lib/lead-scoring";
import { parseInventoryTracking } from "@/lib/inventory-tracking";

/** Allow longer cold starts when connecting to remote Postgres from serverless (e.g. Vercel). */
export const maxDuration = 30;

const createLeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  source: z.enum([
    "website_voice",
    "website_form",
    "website_game",
    "phone",
    "referral",
    "broker",
    "walk_in",
    "social_media",
  ]),
  budgetMin: z.number().int().nonnegative().optional(),
  budgetMax: z.number().int().nonnegative().optional(),
  preferredUnit: z
    .enum(["two_bed", "three_bed", "three_bed_large", "four_bed_duplex", "penthouse"])
    .optional(),
  preferredView: z.enum(["sea", "golf", "city", "dual"]).optional(),
  urgency: z.enum(["low", "medium", "high", "immediate"]).optional(),
  notes: z.string().optional(),
});

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function filterAndPaginateDemoLeads(
  status: LeadStatus | undefined,
  search: string | undefined,
  scoreMin: string | null,
  scoreMax: string | null,
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;
  const filtered = demoLeads.filter((l: any) => {
    if (status && l.status !== status) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
    const min = scoreMin ? Number(scoreMin) : undefined;
    const max = scoreMax ? Number(scoreMax) : undefined;
    if (min != null && l.score < min) return false;
    if (max != null && l.score > max) return false;
    return true;
  });

  return {
    data: filtered.slice(skip, skip + limit),
    meta: { total: filtered.length, page, limit },
  };
}

function databaseUnreachableMessage() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return "Cannot reach the database. DATABASE_URL is missing.";
  }

  try {
    const parsed = new URL(dbUrl);
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") {
      return "Cannot reach the database. DATABASE_URL points to localhost, so this only works if Postgres is running on the same machine. For VPS deploys, use your remote Postgres host and run `npx prisma migrate deploy`.";
    }
  } catch {
    // Keep fallback message for malformed URLs.
  }

  return "Cannot reach the database. Check DATABASE_URL, SSL settings, and that Postgres is reachable from this server.";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const statusParam = searchParams.get("status");
    const status: LeadStatus | undefined =
      statusParam && (Object.values(LeadStatus) as string[]).includes(statusParam)
        ? (statusParam as LeadStatus)
        : undefined;
    const search = searchParams.get("search") || undefined;
    const scoreMin = searchParams.get("scoreMin");
    const scoreMax = searchParams.get("scoreMax");
    const ownerIdParam = searchParams.get("ownerId");
    const ownerId = ownerIdParam && ownerIdParam.trim() ? ownerIdParam.trim() : undefined;

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const skip = (page - 1) * limit;

    if (!hasDatabase()) {
      const { data, meta } = filterAndPaginateDemoLeads(
        status,
        search,
        scoreMin,
        scoreMax,
        page,
        limit,
      );
      return NextResponse.json({
        data: data satisfies DemoLead[],
        meta,
      });
    }

    const where: Prisma.LeadWhereInput = {
      deletedAt: null,
    };

    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (scoreMin || scoreMax) {
      where.score = {
        gte: scoreMin ? Number(scoreMin) : undefined,
        lte: scoreMax ? Number(scoreMax) : undefined,
      };
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: [{ score: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          source: true,
          status: true,
          score: true,
          budgetMin: true,
          budgetMax: true,
          preferredUnit: true,
          preferredView: true,
          urgency: true,
          language: true,
          lastCallAt: true,
          ownerId: true,
          owner: { select: { name: true } },
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    if (total === 0) {
      const { data, meta } = filterAndPaginateDemoLeads(
        status,
        search,
        scoreMin,
        scoreMax,
        page,
        limit,
      );
      return NextResponse.json({
        data: data satisfies DemoLead[],
        meta,
      });
    }

    return NextResponse.json({
      data: leads.map((l: any) => {
        const inventory = parseInventoryTracking(l.notes);
        return {
          id: l.id,
          name: l.name,
          phone: l.phone ?? undefined,
          email: l.email ?? undefined,
          source: l.source,
          status: l.status,
          score: scoreLead({
            status: l.status,
            budgetMin: l.budgetMin,
            budgetMax: l.budgetMax,
            urgency: l.urgency,
            notes: null,
            source: l.source,
            preferredUnit: l.preferredUnit,
            preferredView: l.preferredView,
            lastCallAt: l.lastCallAt,
            updatedAt: l.updatedAt,
          }).score,
          budgetMin: l.budgetMin != null ? Number(l.budgetMin) : undefined,
          budgetMax: l.budgetMax != null ? Number(l.budgetMax) : undefined,
          budgetLabel: formatBudget(l.budgetMin, l.budgetMax),
          preferredUnit: l.preferredUnit ?? undefined,
          preferredView: l.preferredView ?? undefined,
          urgency: l.urgency,
          language: l.language,
          ownerId: l.ownerId ?? undefined,
          ownerLabel: l.owner?.name ?? undefined,
          notes: l.notes ?? undefined,
          inventoryFlatNumber: inventory.flatNumber ?? undefined,
          inventoryFlatType: inventory.flatType ?? undefined,
          inventoryStage: inventory.clientStage,
          depositStatus: inventory.depositStatus,
          instalmentStatus: inventory.instalmentStatus,
          updatedLabel: "Recently",
          updatedAtLabel: formatDateTime(l.updatedAt),
          createdAtLabel: formatDateTime(l.createdAt),
          lastCallAtLabel: l.lastCallAt ? formatDateTime(l.lastCallAt) : undefined,
        };
      }),
      meta: { total, page, limit },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "LEADS_LIST_FAILED", message: "Unable to load leads." } },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!hasDatabase()) {
      return NextResponse.json(
        {
          error: {
            code: "DATABASE_NOT_CONFIGURED",
            message: "DATABASE_URL is not configured for write operations.",
          },
        },
        { status: 501 },
      );
    }

    const json = await req.json();
    const parsed = createLeadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input.",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const body = parsed.data;

    const lead = await prisma.lead.create({
      data: {
        name: body.name,
        phone: body.phone ?? null,
        email: body.email ?? null,
        source: body.source,
        status: "new",
        budgetMin: body.budgetMin != null ? BigInt(body.budgetMin) : null,
        budgetMax: body.budgetMax != null ? BigInt(body.budgetMax) : null,
        preferredUnit: body.preferredUnit ?? null,
        preferredView: body.preferredView ?? null,
        urgency: body.urgency ?? "medium",
        language: "en",
        notes: body.notes ?? null,
      },
    });

    // Outbound Vapi calls are manual (prospect page) or explicit jobs; see startOutboundCallForLead.

    return NextResponse.json({ data: { id: lead.id } }, { status: 201 });
  } catch (e) {
    console.error("POST /api/leads", e);

    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2021") {
        return NextResponse.json(
          {
            error: {
              code: "TABLE_MISSING",
              message:
                "Database tables are missing. Run: npx prisma migrate deploy (or prisma db push) with your DATABASE_URL.",
            },
          },
          { status: 503 },
        );
      }
    }

    if (e instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        {
          error: {
            code: "DB_UNREACHABLE",
            message: databaseUnreachableMessage(),
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: { code: "LEAD_CREATE_FAILED", message: "Unable to create lead." } },
      { status: 500 },
    );
  }
}


