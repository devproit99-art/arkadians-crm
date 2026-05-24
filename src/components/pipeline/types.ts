export type PipelineStage =
  | "new"
  | "contacted"
  | "viewing_booked"
  | "negotiating"
  | "closed_won"
  | "closed_lost";

export type PipelineLead = {
  id: string;
  name: string;
  score: number;
  source: string;
  budgetLabel: string;
  budgetMin?: number;
  budgetMax?: number;
  phone?: string;
  email?: string;
  unitLabel?: string;
  viewLabel?: string;
  inventoryFlatNumber?: string;
  inventoryFlatType?: string;
  inventoryStage?: string;
  depositStatus?: string;
  instalmentStatus?: string;
  daysInStage: number;
  ownerId?: string;
  ownerLabel?: string;
  stage: PipelineStage;
};


