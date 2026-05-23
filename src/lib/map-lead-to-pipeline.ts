import type { PipelineLead, PipelineStage } from "@/components/pipeline/types";

export type ApiLeadListItem = {
  id: string;
  name: string;
  status: string;
  score: number;
  source?: string;
  phone?: string;
  email?: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetLabel: string;
  preferredUnit?: string;
  preferredView?: string;
  ownerLabel?: string;
  ownerId?: string;
  inventoryFlatNumber?: string;
  inventoryFlatType?: string;
  inventoryStage?: string;
  depositStatus?: string;
  instalmentStatus?: string;
  updatedLabel?: string;
};

function daysFromUpdatedLabel(label: string | undefined): number {
  if (!label) return 0;
  if (label === "Today" || label === "Recently") return 0;
  const m = label.match(/(\d+)\s*day/i);
  if (m) return Number(m[1]);
  return 0;
}

const KNOWN_STAGES = new Set<PipelineStage>([
  "new",
  "contacted",
  "viewing_booked",
  "negotiating",
  "closed_won",
  "closed_lost",
]);

function isPipelineStage(s: string): s is PipelineStage {
  return KNOWN_STAGES.has(s as PipelineStage);
}

/** Map API/DB status to a pipeline column. Never drops a lead. */
export function normalizeToPipelineStage(status: unknown): PipelineStage {
  const s = typeof status === "string" ? status.trim() : "";
  if (isPipelineStage(s)) return s;
  const lower = s.toLowerCase();
  if (lower === "closed" || lower === "won") return "closed_won";
  if (lower === "lost") return "closed_lost";
  return "new";
}

const UNIT_LABELS: Record<string, string> = {
  two_bed: "2-Bed",
  three_bed: "3-Bed",
  three_bed_large: "3-Bed Large",
  four_bed_duplex: "4-Bed Duplex",
  penthouse: "Penthouse",
};

const VIEW_LABELS: Record<string, string> = {
  sea: "Sea",
  golf: "Golf",
  city: "City",
  dual: "Dual",
};

function formatUnitLabel(v: string | undefined): string | undefined {
  if (!v) return undefined;
  return UNIT_LABELS[v] ?? v.replaceAll("_", " ");
}

function formatViewLabel(v: string | undefined): string | undefined {
  if (!v) return undefined;
  return VIEW_LABELS[v] ?? v;
}

function formatSourceLabel(source: string | undefined): string {
  if (!source) return "—";
  return source.replaceAll("_", " ");
}

export function mapApiLeadToPipelineLead(raw: ApiLeadListItem): PipelineLead {
  const score = typeof raw.score === "number" && !Number.isNaN(raw.score) ? raw.score : 0;

  return {
    id: raw.id,
    name: raw.name,
    score,
    stage: normalizeToPipelineStage(raw.status),
    source: formatSourceLabel(raw.source),
    budgetLabel: raw.budgetLabel || "Not set",
    budgetMin: raw.budgetMin,
    budgetMax: raw.budgetMax,
    phone: raw.phone,
    email: raw.email,
    unitLabel: formatUnitLabel(raw.preferredUnit),
    viewLabel: formatViewLabel(raw.preferredView),
    inventoryFlatNumber: raw.inventoryFlatNumber,
    inventoryFlatType: raw.inventoryFlatType,
    inventoryStage: raw.inventoryStage,
    depositStatus: raw.depositStatus,
    instalmentStatus: raw.instalmentStatus,
    daysInStage: daysFromUpdatedLabel(raw.updatedLabel),
    ownerId: raw.ownerId,
    ownerLabel: raw.ownerLabel,
  };
}
