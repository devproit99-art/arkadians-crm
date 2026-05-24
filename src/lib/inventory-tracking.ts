export type InventoryTracking = {
  flatNumber: string | null;
  tower: string | null;
  flatType: string | null;
  viewCategory: string | null;
  clientStage: string;
  depositStatus: string;
  instalmentStatus: string;
};

const EMPTY: InventoryTracking = {
  flatNumber: null,
  tower: null,
  flatType: null,
  viewCategory: null,
  clientStage: "No inventory signal",
  depositStatus: "Not started",
  instalmentStatus: "Not started",
};

/** Parse structured inventory lines appended to lead notes (see buildInventoryBlock in assign route). */
export function parseInventoryTracking(notes: string | null | undefined): InventoryTracking {
  const text = (notes ?? "").trim();
  if (!text) return EMPTY;

  const lines = text.split(/\r?\n/).map((l: any) => l.trim());

  let flatNumber: string | null = null;
  let tower: string | null = null;
  let flatType: string | null = null;
  let viewCategory: string | null = null;
  let clientStage: string | null = null;
  let deposit: string | null = null;
  let instalment: string | null = null;

  for (const line of lines) {
    if (!line) continue;
    const flatM = line.match(/^Flat\s+([A-Za-z0-9-]+)\s*$/i);
    if (flatM) {
      flatNumber = flatM[1] ?? null;
      continue;
    }
    const towerM = line.match(/^Tower\s+(.+)$/i);
    if (towerM) {
      tower = towerM[1]?.trim() ?? null;
      continue;
    }
    const typeM = line.match(/^Type:\s*(.+)$/i);
    if (typeM) {
      flatType = typeM[1]?.trim() ?? null;
      continue;
    }
    const viewM = line.match(/^View:\s*(.+)$/i);
    if (viewM) {
      viewCategory = viewM[1]?.trim() ?? null;
      continue;
    }
    const stageM = line.match(/^Client stage:\s*(.+)$/i);
    if (stageM) {
      clientStage = stageM[1]?.trim() ?? null;
      continue;
    }
    const depM = line.match(/^Deposit:\s*(.+)$/i);
    if (depM) {
      deposit = depM[1]?.trim() ?? null;
      continue;
    }
    const instM = line.match(/^Instalment:\s*(.+)$/i) ?? line.match(/^Installment:\s*(.+)$/i);
    if (instM) {
      instalment = instM[1]?.trim() ?? null;
      continue;
    }
  }

  // Backward compatibility: older single-line formats
  if (!flatNumber && !clientStage) {
    const assignedMatch = text.match(/Assigned flat\s+([A-Za-z0-9-]+)/i);
    if (assignedMatch) {
      return {
        flatNumber: assignedMatch[1] ?? null,
        tower,
        flatType,
        viewCategory,
        clientStage: "Assigned / Reserved",
        depositStatus: "Deposit secured",
        instalmentStatus: "Pending",
      };
    }
    const interestMatch = text.match(/Interest\/viewing logged for flat\s+([A-Za-z0-9-]+)/i);
    if (interestMatch) {
      return {
        flatNumber: interestMatch[1] ?? null,
        tower,
        flatType,
        viewCategory,
        clientStage: "Interested / Viewing",
        depositStatus: "Pending",
        instalmentStatus: "Not started",
      };
    }
  }

  // Loose match if block got pasted on one line (avoid greedy Type:/View: regex bugs)
  if (!flatNumber) {
    const oneLineFlat = text.match(/\bFlat\s+([A-Za-z0-9-]+)\b/i)?.[1] ?? null;
    flatNumber = oneLineFlat;
  }

  if (!flatNumber && !flatType && !viewCategory && !clientStage && !deposit && !instalment) {
    return EMPTY;
  }

  return {
    flatNumber,
    tower,
    flatType,
    viewCategory,
    clientStage: clientStage ?? "Interested",
    depositStatus: deposit ?? "Pending",
    instalmentStatus: instalment ?? "Not started",
  };
}

