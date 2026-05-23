"use client";

export type Kpi = {
  title: string;
  value: string;
  badge?: string;
  tone?: "gold" | "success" | "warning" | "slate";
};

export type StatusDatum = { status: string; count: number; pipelineCrore: number };
export type SourceDatum = { source: string; count: number; avgScore: number };
export type ScoreDatum = { bucket: "Hot" | "Warm" | "Cold"; count: number };
export type RevenueDatum = { label: string; valueCrore: number };

export type HotProspectRow = {
  id: string;
  name: string;
  budget: string;
  interest: string;
  score: number;
  status: string;
  source: string;
  nextAction: string;
  aiQualified: boolean;
  callbackLabel?: string | null;
};

export type HotProspectSortBy = "score" | "budget";

export type FollowUpRow = {
  id: string;
  leadName: string;
  title: string;
  dueLabel: string | null;
  status: string;
  ownerLabel: string | null;
};

export type BookingRow = {
  id: string;
  client: string;
  interest: string;
  bookingStatus: string;
  paidStatus: string;
  estimatedValue: string;
  nextStep: string;
};

export type TeamRow = {
  name: string;
  role: string;
  assigned: number;
  hot: number;
  calls: number;
  followUpsDue: number;
  viewings: number;
  pipelineValue: string;
  performance: "Excellent" | "Active" | "Needs attention" | "New";
};

export type AdminDashboardClientProps = {
  updatedLabel: string;
  kpis: Kpi[];
  pipelineByStatus: StatusDatum[];
  sources: SourceDatum[];
  scoreDist: ScoreDatum[];
  revenueTrend: RevenueDatum[];
  topHot: HotProspectRow[];
  followUps: FollowUpRow[];
  bookings: BookingRow[];
  aiOps: { k: string; v: number }[];
  team: TeamRow[];
  advisorPipeline: { label: string; valueCrore: number }[];
};
