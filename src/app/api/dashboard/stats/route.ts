import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ownerId = searchParams.get("ownerId")?.trim() || null;

  if (!hasDatabase()) {
    return NextResponse.json({
      data: {
        totalLeads: 0,
        hotLeads: 0,
        viewingsBooked: 0,
        conversionRate: 0,
        monthOverMonth: 0,
      },
    });
  }

  const where = { deletedAt: null as Date | null, ownerId: ownerId ?? undefined };
  const [totalLeads, hotLeads, viewingsBooked] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, score: { gte: 75 } } }),
    prisma.lead.count({ where: { ...where, status: "viewing_booked" } }),
  ]);

  // Keep conversion % demo-derived but stable.
  const conversionRate = totalLeads > 0 ? Math.min(95, Math.round((hotLeads / totalLeads) * 1000) / 10) : 0;

  return NextResponse.json({
    data: {
      totalLeads,
      hotLeads,
      viewingsBooked,
      conversionRate,
      monthOverMonth: 12,
    },
  });
}

