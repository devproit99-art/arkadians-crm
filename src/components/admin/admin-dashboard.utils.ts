import type { HotProspectRow, HotProspectSortBy } from "./admin-dashboard.types";

export function parseBudgetCrore(budget: string): number {
  const match = budget.match(/PKR\s+([0-9]+(?:\.[0-9]+)?)\s+crore/i);
  return match ? Number(match[1]) : 0;
}

export function filterAndSortHotProspects(
  rows: HotProspectRow[],
  search: string,
  onlyAiQualified: boolean,
  sortBy: HotProspectSortBy
): HotProspectRow[] {
  const query = search.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    if (onlyAiQualified && !row.aiQualified) return false;
    if (!query) return true;
    return (
      row.name.toLowerCase().includes(query) ||
      row.status.toLowerCase().includes(query) ||
      row.source.toLowerCase().includes(query) ||
      row.interest.toLowerCase().includes(query)
    );
  });

  return filteredRows.slice().sort((left, right) => {
    if (sortBy === "score") return right.score - left.score;
    return parseBudgetCrore(right.budget) - parseBudgetCrore(left.budget);
  });
}

