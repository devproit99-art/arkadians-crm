import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function roleIsAdmin(role: string | null | undefined) {
  return (role ?? "").toLowerCase() === "admin";
}

function roleCanSignal(role: string | null | undefined) {
  const r = (role ?? "").toLowerCase();
  return r === "admin" || r === "manager" || r === "sales_rep";
}

function stripInventoryLines(notes: string) {
  const lines = notes.split(/\r?\n/);
  const kept: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const isInventoryLine =
      /^flat\s+/i.test(line) ||
      /^tower\s+/i.test(line) ||
      /^type:\s*/i.test(line) ||
      /^view:\s*/i.test(line) ||
      /^client stage:\s*/i.test(line) ||
      /^deposit:\s*/i.test(line) ||
      /^instal+ment:\s*/i.test(line) ||
      /^installment:\s*/i.test(line) ||
      /^assigned flat\s+/i.test(line) ||
      /^interest\/viewing logged for flat\s+/i.test(line);
    if (!isInventoryLine) kept.push(raw);
  }
  return kept.join("\n").trim();
}

function buildInventoryBlock(args: {
  status: "interested" | "viewing" | "deposit_secured" | "payment_secured" | "sold_assigned";
  flatNumber: string;
  tower: string;
  flatType: string;
  viewCategory: string;
}) {
  const stage =
    args.status === "sold_assigned"
      ? "Sold / Assigned"
      : args.status === "payment_secured"
        ? "Payment secured"
        : args.status === "deposit_secured"
          ? "Deposit secured"
          : args.status === "viewing"
            ? "Viewing"
            : "Interested";
  const deposit =
    args.status === "deposit_secured" || args.status === "payment_secured" || args.status === "sold_assigned"
      ? "Deposit secured"
      : "Pending";
  const instalment = args.status === "payment_secured" || args.status === "sold_assigned" ? "Instalment secured" : "Not started";

  const bits = [
    `Flat ${args.flatNumber}`,
    args.tower ? `Tower ${args.tower}` : null,
    args.flatType ? `Type: ${args.flatType}` : null,
    args.viewCategory ? `View: ${args.viewCategory}` : null,
    `Client stage: ${stage}`,
    `Deposit: ${deposit}`,
    `Instalment: ${instalment}`,
  ].filter(Boolean);

  return bits.join("\n");
}

const bodySchema = z.object({
  leadId: z.string().uuid(),
  unitId: z.string().uuid(),
  status: z.enum([
    "available",
    "interested",
    "viewing",
    "deposit_secured",
    "payment_secured",
    "sold_assigned",
  ]),
  customerName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: { code: "DB_NOT_CONFIGURED", message: "Database is not configured." } },
      { status: 503 },
    );
  }

  const session = await getSession();
  if (!session || !roleCanSignal(session.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Sign in required." } },
      { status: 403 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid inventory assignment payload." } },
      { status: 400 },
    );
  }

  const { leadId, unitId, status, customerName, notes } = parsed.data;

  try {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, deletedAt: null },
      select: { id: true, name: true, ownerId: true, notes: true },
    });
    if (!lead) {
      return NextResponse.json(
        { error: { code: "LEAD_NOT_FOUND", message: "Lead not found." } },
        { status: 404 },
      );
    }

    const sessionRole = (session.role ?? "").toLowerCase();
    const isAdmin = sessionRole === "admin";
    const isManager = sessionRole === "manager";
    const isSalesRep = sessionRole === "sales_rep";
    const isSales = isManager || isSalesRep;
    if (isSales) {
      // Sales can only signal "interested"/"viewing" (or clear to available),
      // and sales reps only on their own or unassigned leads; managers can assist any lead.
      if (!["available", "interested", "viewing"].includes(status)) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Only admin can set deposit/payment/sold statuses." } },
          { status: 403 },
        );
      }
      if (isSalesRep && lead.ownerId && lead.ownerId !== session.userId) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "You can only update inventory for leads assigned to you or unassigned leads.",
            },
          },
          { status: 403 },
        );
      }
    }

    const unit = await prisma.inventoryUnit.findFirst({
      where: { id: unitId },
      select: { id: true, flatNumber: true, tower: true, type: true, viewCategory: true, status: true },
    });
    if (!unit) {
      return NextResponse.json(
        { error: { code: "UNIT_NOT_FOUND", message: "Inventory unit not found." } },
        { status: 404 },
      );
    }

    if (isSales) {
      // Hard-lock statuses cannot be selected/changed by sales team.
      if (["deposit_secured", "payment_secured", "sold_assigned"].includes(unit.status)) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "This flat is locked (deposit/payment/sold) and cannot be changed." } },
          { status: 403 },
        );
      }
    }

    const effectiveCustomerName = (customerName ?? "").trim() || lead.name;

    const base = stripInventoryLines(lead.notes ?? "");
    const nextNotes =
      status === "available"
        ? base
        : [
            base,
            buildInventoryBlock({
              status: status as "interested" | "viewing" | "deposit_secured" | "payment_secured" | "sold_assigned",
              flatNumber: unit.flatNumber,
              tower: unit.tower,
              flatType: unit.type,
              viewCategory: unit.viewCategory,
            }),
          ]
            .filter((x: any) => x && x.trim().length > 0)
            .join("\n\n")
            .trim();

    // Enforce single flat per lead for now: unassign any other units linked to this lead.
    await prisma.$transaction([
      prisma.inventoryUnit.updateMany({
        where: { leadId, NOT: { id: unitId } },
        data: { leadId: null, status: "available", customerName: null, statusAt: new Date() },
      }),
      prisma.inventoryUnit.update({
        where: { id: unitId },
        data: {
          leadId: status === "available" ? null : leadId,
          status,
          customerName: status === "available" ? null : effectiveCustomerName,
          // Preserve existing notes when the client omits the field; allow explicit null to clear.
          ...(notes !== undefined ? { notes } : {}),
          statusAt: new Date(),
        },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: { notes: nextNotes },
      }),
    ]);

    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    console.error("POST /api/inventory/assign", e);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Could not update inventory assignment." } },
      { status: 500 },
    );
  }
}


