"use client";

import { useMemo, useState } from "react";
import {
  BookingsSection,
  DashboardHero,
  HotProspectsAndOpsSection,
  KpiGrid,
  PipelineAndRevenueSection,
  TeamAndAdvisorSection,
} from "./AdminDashboardSections";
import type { AdminDashboardClientProps, HotProspectSortBy } from "./admin-dashboard.types";
import { filterAndSortHotProspects } from "./admin-dashboard.utils";

export function AdminDashboardClient(props: AdminDashboardClientProps) {
  const [hotSearch, setHotSearch] = useState("");
  const [onlyAiQualified, setOnlyAiQualified] = useState(false);
  const [sortBy, setSortBy] = useState<HotProspectSortBy>("score");

  const filteredHot = useMemo(
    () => filterAndSortHotProspects(props.topHot, hotSearch, onlyAiQualified, sortBy),
    [hotSearch, onlyAiQualified, props.topHot, sortBy]
  );

  return (
    <div className="space-y-8">
      <DashboardHero updatedLabel={props.updatedLabel} />
      <KpiGrid kpis={props.kpis} />
      <PipelineAndRevenueSection
        pipelineByStatus={props.pipelineByStatus}
        sources={props.sources}
        scoreDist={props.scoreDist}
        revenueTrend={props.revenueTrend}
      />
      <HotProspectsAndOpsSection
        filteredHot={filteredHot}
        hotSearch={hotSearch}
        onlyAiQualified={onlyAiQualified}
        sortBy={sortBy}
        followUps={props.followUps}
        aiOps={props.aiOps}
        setHotSearch={setHotSearch}
        setOnlyAiQualified={setOnlyAiQualified}
        setSortBy={setSortBy}
      />
      <BookingsSection bookings={props.bookings} />
      <TeamAndAdvisorSection team={props.team} advisorPipeline={props.advisorPipeline} />
    </div>
  );
}


