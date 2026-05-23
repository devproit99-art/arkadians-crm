import type { PipelineLead } from "@/components/pipeline/types";

export type DemoLead = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  source:
    | "website_voice"
    | "website_form"
    | "website_game"
    | "phone"
    | "referral"
    | "broker"
    | "walk_in"
    | "social_media";
  status:
    | "new"
    | "contacted"
    | "viewing_booked"
    | "negotiating"
    | "closed_won"
    | "closed_lost";
  score: number;
  /** Present for API-listed DB leads; demo rows may omit. */
  budgetMin?: number;
  budgetMax?: number;
  budgetLabel: string;
  preferredUnit?: string;
  preferredView?: string;
  urgency?: "low" | "medium" | "high" | "immediate";
  language?: string;
  ownerLabel?: string;
  ownerId?: string;
  updatedLabel: string;
  /** Formatted labels when available (e.g. from DB). */
  createdAtLabel?: string;
  updatedAtLabel?: string;
  lastCallAtLabel?: string;
  notes?: string;
  inventoryFlatNumber?: string;
  inventoryFlatType?: string;
  inventoryStage?: string;
  depositStatus?: string;
  instalmentStatus?: string;
};

export type DemoCall = {
  id: string;
  leadId: string;
  leadName: string;
  createdAtLabel: string;
  duration: string;
  sentiment: "positive" | "neutral" | "negative";
  summary: string;
  transcript: { speaker: "Agent" | "Caller"; text: string }[];
};

export type DemoActivity = {
  id: string;
  leadId: string;
  leadName: string;
  type:
    | "task"
    | "call"
    | "email"
    | "whatsapp"
    | "viewing"
    | "meeting"
    | "note"
    | "follow_up";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  dueLabel?: string;
  createdAtLabel: string;
};

export const demoLeads: DemoLead[] = [
  {
    id: "lead_ahmed_khan",
    name: "Ahmed Khan",
    phone: "+92 300 123 4567",
    email: "a.khan@email.com",
    source: "website_voice",
    status: "negotiating",
    score: 92,
    budgetLabel: "PKR 8–15 crore",
    preferredUnit: "Penthouse",
    preferredView: "Sea",
    urgency: "high",
    language: "EN",
    ownerLabel: "Ahmad R.",
    updatedLabel: "2 days ago",
  },
  {
    id: "lead_fatima_syed",
    name: "Fatima Syed",
    phone: "+92 300 987 6543",
    email: "fatima.s@corp.pk",
    source: "website_game",
    status: "viewing_booked",
    score: 87,
    budgetLabel: "PKR 5–8 crore",
    preferredUnit: "4-Bed Duplex",
    preferredView: "Dual",
    urgency: "high",
    language: "EN",
    ownerLabel: "Sara M.",
    updatedLabel: "Today",
  },
  {
    id: "lead_omar_raza",
    name: "Omar Raza",
    phone: "+92 333 222 1100",
    email: "omar.raza@email.com",
    source: "website_form",
    status: "contacted",
    score: 78,
    budgetLabel: "PKR 3–5 crore",
    preferredUnit: "3-Bed",
    preferredView: "City",
    urgency: "medium",
    language: "EN",
    ownerLabel: "Hassan A.",
    updatedLabel: "Today",
  },
  {
    id: "lead_zara_ali",
    name: "Zara Ali",
    source: "referral",
    status: "new",
    score: 64,
    budgetLabel: "PKR 1–3 crore",
    preferredUnit: "2-Bed",
    preferredView: "City",
    urgency: "low",
    language: "EN",
    ownerLabel: "Sara M.",
    updatedLabel: "Today",
  },
];

export const demoPipelineLeads: PipelineLead[] = demoLeads.map((l) => ({
  id: l.id,
  name: l.name,
  score: l.score,
  source: l.source.replaceAll("_", " "),
  phone: l.phone,
  email: l.email,
  budgetLabel: l.budgetLabel,
  unitLabel: l.preferredUnit,
  viewLabel: l.preferredView,
  daysInStage:
    l.updatedLabel === "Today" ? 0 : l.updatedLabel.includes("2 days") ? 2 : 3,
  ownerLabel: l.ownerLabel,
  stage: l.status,
}));

export const demoCalls: DemoCall[] = [
  {
    id: "call_001",
    leadId: "lead_fatima_syed",
    leadName: "Fatima Syed",
    createdAtLabel: "Today, 10:14",
    duration: "3:42",
    sentiment: "positive",
    summary: "Sea-facing 3-bed interest; asked about private viewing windows.",
    transcript: [
      { speaker: "Agent", text: "Thank you for calling The Arkadians. May I ask what type of residence you’re exploring?" },
      { speaker: "Caller", text: "A 3-bedroom, ideally sea view, and I’d like to understand payment plans." },
      { speaker: "Agent", text: "Understood. Would you like a private viewing this week or next?" },
      { speaker: "Caller", text: "This week, if possible." },
    ],
  },
  {
    id: "call_002",
    leadId: "lead_ahmed_khan",
    leadName: "Ahmed Khan",
    createdAtLabel: "2 days ago, 17:02",
    duration: "5:18",
    sentiment: "neutral",
    summary: "Penthouse budget confirmed; requested tower guidance and sea outlook clarity.",
    transcript: [
      { speaker: "Agent", text: "Welcome back, Ahmed. Are you leaning penthouse or duplex at this stage?" },
      { speaker: "Caller", text: "Penthouse. I want the best sea-facing terraces—no compromises." },
      { speaker: "Agent", text: "Perfect. I’ll prepare two options and propose a discreet private viewing." },
    ],
  },
];

export const demoActivities: DemoActivity[] = [
  {
    id: "act_001",
    leadId: "lead_ahmed_khan",
    leadName: "Ahmed Khan",
    type: "viewing",
    status: "pending",
    priority: "urgent",
    title: "Schedule private viewing (Penthouse, sea-facing)",
    dueLabel: "Thursday, 4:00 PM",
    createdAtLabel: "Today",
  },
  {
    id: "act_002",
    leadId: "lead_fatima_syed",
    leadName: "Fatima Syed",
    type: "whatsapp",
    status: "in_progress",
    priority: "high",
    title: "Send payment plan + terrace highlights",
    dueLabel: "Today, 6:00 PM",
    createdAtLabel: "Today",
  },
  {
    id: "act_003",
    leadId: "lead_omar_raza",
    leadName: "Omar Raza",
    type: "task",
    status: "pending",
    priority: "medium",
    title: "Follow up on 3-bed availability and city view tiers",
    dueLabel: "Tomorrow",
    createdAtLabel: "Today",
  },
];

export function getLeadById(id: string) {
  return demoLeads.find((l) => l.id === id) ?? null;
}

