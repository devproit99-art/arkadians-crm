import type { LeadStatus } from "@prisma/client";

export type ClientStage =
  | "New Enquiry"
  | "Contacted"
  | "Qualified"
  | "Callback Scheduled"
  | "Viewing Booked"
  | "Apartment Viewed"
  | "Negotiation"
  | "Reserved / Booking Pending"
  | "Deposit Paid"
  | "Payment Plan Active"
  | "Closed Won"
  | "Closed Lost";

export type PaymentStatus =
  | "Not paid"
  | "Deposit pending"
  | "Deposit paid"
  | "Payment plan active"
  | "Fully paid / Closed won"
  | "Closed";

export type ProgressFlags = {
  callbackScheduled: boolean;
  viewingBooked: boolean;
  apartmentViewed: boolean;
  reserved: boolean;
  depositPaid: boolean;
  paymentPlanActive: boolean;
  closedWon: boolean;
  closedLost: boolean;
};

function includesAny(text: string, needles: string[]) {
  const t = text.toLowerCase();
  return needles.some((n) => t.includes(n));
}

export function deriveClientProgress(input: {
  status?: LeadStatus | string | null;
  notes?: string | null;
  latestActivityTitle?: string | null;
  latestCallSummary?: string | null;
  latestCallTranscript?: string | null;
}) {
  const status = (input.status ?? "").toString().toLowerCase();
  const notes = input.notes ?? "";
  const act = input.latestActivityTitle ?? "";
  const summary = input.latestCallSummary ?? "";
  const transcript = input.latestCallTranscript ?? "";
  const text = `${notes}\n${act}\n${summary}\n${transcript}`.toLowerCase();

  const flags: ProgressFlags = {
    callbackScheduled: includesAny(text, ["callback", "call back", "follow up", "follow-up", "due "]),
    viewingBooked:
      status.includes("viewing_booked") ||
      includesAny(text, ["viewing booked", "site visit booked", "private viewing", "schedule viewing", "viewing:"]),
    apartmentViewed: includesAny(text, ["apartment viewed", "viewed", "visited", "site visit done", "visit done", "came to site"]),
    reserved: includesAny(text, ["reserved", "booking pending", "booking hold", "hold unit", "reserve"]),
    depositPaid: includesAny(text, ["deposit paid", "booking amount paid", "payment received", "received deposit", "paid booking"]),
    paymentPlanActive: includesAny(text, ["payment plan active", "payment plan", "instalment", "installment", "monthly payment"]),
    closedWon: status.includes("closed_won") || includesAny(text, ["closed won", "sold", "fully paid"]),
    closedLost: status.includes("closed_lost") || includesAny(text, ["closed lost", "lost"]),
  };

  // Stage precedence: most advanced wins.
  let stage: ClientStage = "New Enquiry";
  if (flags.closedLost) stage = "Closed Lost";
  else if (flags.closedWon) stage = "Closed Won";
  else if (flags.paymentPlanActive) stage = "Payment Plan Active";
  else if (flags.depositPaid) stage = "Deposit Paid";
  else if (flags.reserved) stage = "Reserved / Booking Pending";
  else if (flags.apartmentViewed) stage = "Apartment Viewed";
  else if (flags.viewingBooked) stage = "Viewing Booked";
  else if (flags.callbackScheduled) stage = "Callback Scheduled";
  else if (status.includes("negotiating")) stage = "Negotiation";
  else if (status.includes("contacted")) stage = "Contacted";

  // Payment status is demo-derived from stage/flags.
  let paymentStatus: PaymentStatus = "Not paid";
  if (flags.closedLost) paymentStatus = "Closed";
  else if (flags.closedWon) paymentStatus = "Fully paid / Closed won";
  else if (flags.paymentPlanActive) paymentStatus = "Payment plan active";
  else if (flags.depositPaid) paymentStatus = "Deposit paid";
  else if (flags.reserved) paymentStatus = "Deposit pending";

  const nextAction = flags.closedLost
    ? "Nurture or archive."
    : flags.closedWon
      ? "Handover and relationship management."
      : flags.apartmentViewed && !flags.depositPaid && !flags.paymentPlanActive
        ? "Follow up for booking deposit."
        : flags.reserved && !flags.depositPaid
          ? "Collect deposit / confirm booking."
          : flags.depositPaid && !flags.paymentPlanActive
            ? "Move to payment plan tracking."
            : flags.paymentPlanActive
              ? "Monitor payment schedule."
              : flags.viewingBooked
                ? "Prepare viewing and confirm attendance."
                : flags.callbackScheduled
                  ? "Call at confirmed callback time."
                  : "Qualify lead and schedule callback.";

  const latestSignal =
    (notes.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(-1)[0] ?? "") ||
    input.latestActivityTitle ||
    input.latestCallSummary ||
    "";

  return { stage, paymentStatus, flags, nextAction, latestSignal: latestSignal || null };
}

