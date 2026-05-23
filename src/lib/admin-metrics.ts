import type { LeadStatus, LeadSource, UnitType, ViewPreference } from "@prisma/client";

export const DEMO_ADVISORS = [
  { name: "Ahmad Raza", role: "Sales Manager" },
  { name: "Sara Malik", role: "Property Consultant" },
  { name: "Bilal Khan", role: "Client Care" },
  { name: "Nadia Sheikh", role: "Sales Advisor" },
] as const;

export type AdminLeadRow = {
  id: string;
  name: string;
  status: LeadStatus;
  source: LeadSource;
  score: number;
  budgetMin: bigint | null;
  budgetMax: bigint | null;
  preferredUnit: UnitType | null;
  preferredView: ViewPreference | null;
  urgency: string;
  notes: string | null;
  lastCallAt: Date | null;
  ownerId: string | null;
  ownerName?: string | null;
};

export type AdminActivityRow = {
  id: string;
  leadId: string;
  title: string;
  status: string;
  type: string;
  dueAt: Date | null;
  createdAt: Date;
  userId: string | null;
};

export type AdminCallLogRow = {
  id: string;
  leadId: string;
  status: string;
  transcript: string | null;
  startedAt: Date | null;
  createdAt: Date;
};

const CRORE = BigInt(10_000_000);

export function getLeadBudgetValuePkr(lead: Pick<AdminLeadRow, "budgetMin" | "budgetMax">): bigint {
  return lead.budgetMax ?? lead.budgetMin ?? BigInt(0);
}

export function formatPkrCrore(valuePkr: bigint): string {
  if (valuePkr <= BigInt(0)) return "PKR 0 crore";
  const whole = valuePkr / CRORE;
  const rem = valuePkr % CRORE;
  const oneDecimal = (rem * BigInt(10)) / CRORE;
  if (whole >= BigInt(100)) return `PKR ${whole.toString()} crore`;
  if (oneDecimal === BigInt(0)) return `PKR ${whole.toString()} crore`;
  return `PKR ${whole.toString()}.${oneDecimal.toString()} crore`;
}

export function getLeadInterest(lead: Pick<AdminLeadRow, "preferredUnit" | "preferredView">): string {
  const unit = lead.preferredUnit ? lead.preferredUnit.replaceAll("_", " ") : "—";
  const view = lead.preferredView ? `${lead.preferredView} view` : "";
  return view ? `${unit} · ${view}` : unit;
}

export function deriveBookingStatus(lead: Pick<AdminLeadRow, "score" | "status">): string {
  if (lead.status === "closed_lost") return "Lost";
  if (lead.status === "viewing_booked") return "Viewing booked";
  if (lead.score >= 85) return "Reserved";
  if (lead.score >= 75) return "Booking pending";
  if (lead.status === "contacted") return "In discussion";
  return "Enquiry";
}

export function derivePaidStatus(bookingStatus: string): string {
  if (bookingStatus === "Reserved") return "Deposit pending";
  if (bookingStatus === "Booking pending") return "Awaiting confirmation";
  if (bookingStatus === "Viewing booked") return "Not paid";
  if (bookingStatus === "Lost") return "Closed";
  if (bookingStatus === "In discussion") return "Not paid";
  return "Not paid";
}

export function deriveOutstandingNextStep(bookingStatus: string): string {
  if (bookingStatus === "Reserved") return "Collect deposit";
  if (bookingStatus === "Booking pending") return "Confirm booking";
  if (bookingStatus === "Viewing booked") return "Complete viewing";
  if (bookingStatus === "In discussion") return "Consultant follow-up";
  return "Qualify lead";
}

export function deriveNextAction(opts: {
  lead: Pick<AdminLeadRow, "score" | "status">;
  hasCallback: boolean;
}): string {
  const { lead, hasCallback } = opts;
  if (lead.status === "viewing_booked") return "Prepare viewing";
  if (lead.score >= 75 && hasCallback) return "Call at confirmed time";
  if (lead.score >= 75) return "Senior consultant call";
  if (lead.score >= 45) return "Send WhatsApp confirmation";
  return "Nurture with project info";
}

export function stableAdvisorForLead(lead: Pick<AdminLeadRow, "id" | "ownerName" | "ownerId">): {
  advisorName: string;
  advisorRole: string;
  derived: boolean;
} {
  if (lead.ownerName?.trim()) {
    return { advisorName: lead.ownerName, advisorRole: "Advisor", derived: false };
  }

  // Deterministic distribution: hash-like using char codes
  let acc = 0;
  for (let i = 0; i < lead.id.length; i++) acc = (acc + lead.id.charCodeAt(i) * (i + 1)) % 10_000;
  const idx = acc % DEMO_ADVISORS.length;
  const a = DEMO_ADVISORS[idx]!;
  return { advisorName: a.name, advisorRole: a.role, derived: true };
}

export function performanceBadge(metrics: {
  pipelineValuePkr: bigint;
  hotLeads: number;
  followUpsDue: number;
  followUpsCompleted: number;
  callsLogged: number;
}): "Excellent" | "Active" | "Needs attention" | "New" {
  if (metrics.pipelineValuePkr >= BigInt(500_000_000) || metrics.hotLeads >= 3 || metrics.followUpsCompleted >= 4) {
    return "Excellent";
  }
  if (metrics.callsLogged > 0 || metrics.followUpsCompleted > 0) return "Active";
  if (metrics.followUpsDue >= 3) return "Needs attention";
  return "New";
}

