import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "summary";

    if (type === "sales") {
      const allLeads = await prisma.lead.findMany({
        where: { deletedAt: null },
        select: { status: true, budgetMax: true },
      });

      const statusCounts: Record<string, number> = {};
      let totalValue = 0;

      allLeads.forEach((lead) => {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
        if ((lead.status === "closed_won" || lead.status === "negotiating") && lead.budgetMax) {
          totalValue += Number(lead.budgetMax);
        }
      });

      return NextResponse.json({
        leadsByStatus: Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count,
        })),
        totalPipelineValue: totalValue,
      });
    }

    if (type === "team") {
      const users = await prisma.user.findMany({
        where: { role: { in: ["sales_rep", "manager"] } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          _count: { select: { leads: true, activities: true } },
          leads: {
            where: { status: "closed_won", deletedAt: null },
            select: { id: true },
          },
          calls: { select: { id: true } },
        },
      });

      return NextResponse.json({
        team: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          closedDeals: user.leads.length,
          totalLeads: user._count.leads,
          totalActivities: user._count.activities,
          totalCalls: user.calls.length,
        })),
      });
    }

    if (type === "export") {
      const leads = await prisma.lead.findMany({
        where: { deletedAt: null },
        include: {
          owner: { select: { name: true, email: true } },
          inventoryUnits: { select: { flatNumber: true, tower: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const today = new Date().toISOString().split("T")[0];
      const csvHeaders = "Name,Email,Phone,Status,Source,Score,Owner,Unit,Urgency,Created At\n";
      const csvRows = leads
        .map((lead) =>
          [
            JSON.stringify(lead.name),
            JSON.stringify(lead.email || ""),
            JSON.stringify(lead.phone || ""),
            lead.status,
            lead.source,
            lead.score,
            JSON.stringify(lead.owner?.name || "Unassigned"),
            JSON.stringify(lead.inventoryUnits[0]?.flatNumber || ""),
            lead.urgency,
            lead.createdAt.toISOString(),
          ].join(",")
        )
        .join("\n");

      const csv = csvHeaders + csvRows;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=leads-export-" + today + ".csv",
        },
      });
    }

    // Default summary
    const totalLeads = await prisma.lead.count({ where: { deletedAt: null } });
    const totalUsers = await prisma.user.count();
    const totalUnits = await prisma.inventoryUnit.count();
    const wonDeals = await prisma.lead.count({
      where: { status: "closed_won", deletedAt: null },
    });
    const recentActivity = await prisma.activity.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return NextResponse.json({
      summary: {
        totalLeads,
        totalUsers,
        totalUnits,
        wonDeals,
        conversionRate:
          totalLeads > 0
            ? ((wonDeals / totalLeads) * 100).toFixed(1) + "%"
            : "0%",
        recentActivity7Days: recentActivity,
      },
    });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}