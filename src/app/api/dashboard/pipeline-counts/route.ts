import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoLeads } from "@/lib/demo-data";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

type Counts = {
  new: number;
  contacted: number;
  viewing_booked: number;
  negotiating: number;
  closed_won: number;
  closed_lost: number;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get("ownerId")?.trim() || null;

    if (!hasDatabase()) {
      const counts: Counts = {
        new: 0,
        contacted: 0,
        viewing_booked: 0,
        negotiating: 0,
        closed_won: 0,
        closed_lost: 0,
      };
      for (const l of demoLeads) counts[l.status] += 1;
      return NextResponse.json({ data: counts });
    }

    const grouped = await prisma.lead.groupBy({
      by: ["status"],
      where: { deletedAt: null, ownerId: ownerId ?? undefined },
      _count: { _all: true },
    });

    const counts: Counts = {
      new: 0,
      contacted: 0,
      viewing_booked: 0,
      negotiating: 0,
      closed_won: 0,
      closed_lost: 0,
    };

    for (const g of grouped) {
      counts[g.status] = g._count._all;
    }

    return NextResponse.json({ data: counts });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "PIPELINE_COUNTS_FAILED",
          message: "Unable to load pipeline counts.",
        },
      },
      { status: 500 },
    );
  }
}

