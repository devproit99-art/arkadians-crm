import type { PipelineStage } from "./types";

export const PIPELINE_STAGES: {
  key: PipelineStage;
  label: string;
  topBorderClass: string;
}[] = [
  { key: "new", label: "New", topBorderClass: "border-t-navy" },
  { key: "contacted", label: "Contacted", topBorderClass: "border-t-gold" },
  {
    key: "viewing_booked",
    label: "Viewing Booked",
    topBorderClass: "border-t-warning",
  },
  {
    key: "negotiating",
    label: "Negotiating",
    topBorderClass: "border-t-[color:var(--color-purple)]",
  },
  { key: "closed_won", label: "Closed", topBorderClass: "border-t-success" },
  {
    key: "closed_lost",
    label: "Lost",
    topBorderClass: "border-t-[color:color-mix(in_oklab,var(--color-medium-grey)_60%,white)]",
  },
];

export function scoreBadgeClasses(score: number) {
  if (score >= 90) return "bg-success ring-2 ring-gold text-white";
  if (score >= 70) return "bg-gold text-navy";
  if (score >= 40) return "bg-warning text-white";
  return "bg-light-grey text-navy";
}

