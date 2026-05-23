const query = new URLSearchParams(window.location.search);
const scopeRaw = (query.get("scope") || "").toLowerCase();
let scope = scopeRaw === "admin" ? "admin" : "user";
const isSelectMode = query.get("select") === "1";
const leadId = query.get("leadId") || "";

const STATUS_LABEL = {
  available: "Available",
  interested: "Interested",
  viewing: "Viewing",
  deposit_secured: "Deposit Secured",
  payment_secured: "Payment Secured",
  sold_assigned: "Sold / Assigned"
};

const USER_STATUSES = ["available", "interested", "viewing"];
const ADMIN_STATUSES = [
  "available",
  "interested",
  "viewing",
  "deposit_secured",
  "payment_secured",
  "sold_assigned"
];

const HARD_LOCK_STATUSES = ["deposit_secured", "payment_secured", "sold_assigned"];

const unitForm = document.getElementById("unitForm");
const resetBtn = document.getElementById("resetBtn");
const summaryCards = document.getElementById("summaryCards");
const inventoryBody = document.getElementById("inventoryBody");
const editorPanel = document.getElementById("editorPanel");
const permissionsNotice = document.getElementById("permissionsNotice");

let pendingUnit = null;
let unitsCache = [];
let lastError = "";
let lastSuccess = "";

const filters = {
  tower: document.getElementById("filterTower"),
  viewCategory: document.getElementById("filterViewCategory"),
  status: document.getElementById("filterStatus"),
  type: document.getElementById("filterType"),
  flatNumber: document.getElementById("filterFlatNumber")
};

function statusOptionsForScope() {
  return scope === "admin" ? ADMIN_STATUSES : USER_STATUSES;
}

function initialStatusFilter() {
  const raw = (query.get("status") || "").toLowerCase();
  const opts = statusOptionsForScope();
  return opts.includes(raw) ? raw : "";
}

async function apiGetUnits() {
  lastError = "";
  lastSuccess = "";
  const res = await fetch(`/api/inventory/units?scope=${encodeURIComponent(scope)}`, {
    credentials: "same-origin",
    cache: "no-store"
  }).catch((e) => {
    lastError = `Network error loading inventory.`;
    console.error(e);
    return null;
  });
  if (!res || !res.ok) {
    lastError = `Could not load inventory (HTTP ${res ? res.status : "?"}).`;
    return [];
  }
  const json = await res.json().catch(() => null);
  const data = json && typeof json === "object" && "data" in json ? json.data : null;
  const meta = json && typeof json === "object" && "meta" in json ? json.meta : null;
  if (meta && typeof meta === "object" && meta.scope) {
    const nextScope = String(meta.scope).toLowerCase();
    scope = nextScope === "admin" ? "admin" : "user";
  }
  return Array.isArray(data) ? data : [];
}

async function apiUpsertUnit(payload) {
  lastError = "";
  lastSuccess = "";
  console.log("[inventory] Save Flat -> POST /api/inventory/units", payload);
  const res = await fetch("/api/inventory/units", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload)
  }).catch((e) => {
    lastError = `Network error saving changes.`;
    console.error(e);
    return null;
  });
  if (!res || !res.ok) {
    let msg = "";
    try {
      const json = await res?.json();
      msg = json && json.error && json.error.message ? String(json.error.message) : "";
      if (json && json.error && json.error.details) {
        msg = `${msg} ${JSON.stringify(json.error.details)}`.trim();
      }
    } catch {}
    lastError = msg || `Could not save (HTTP ${res ? res.status : "?"}).`;
    console.error("[inventory] Save Flat failed", lastError);
    return false;
  }
  lastSuccess = "Saved.";
  console.log("[inventory] Save Flat success");
  return true;
}

function getFormData() {
  return {
    id: document.getElementById("id").value || undefined,
    tower: document.getElementById("tower").value.trim(),
    flatNumber: document.getElementById("flatNumber").value.trim(),
    sizeSqft: Number(document.getElementById("sizeSqft").value),
    type: document.getElementById("type").value,
    viewCategory: document.getElementById("viewCategory").value,
    price: Number(document.getElementById("price").value),
    status: document.getElementById("status").value,
    customerName: document.getElementById("customerName").value.trim(),
    notes: document.getElementById("notes").value.trim(),
    // When inventory is opened from a lead page, persist the relationship
    // so the unit row reflects the lead assignment context.
    leadId: isSelectMode && leadId ? leadId : null
  };
}

function resetForm() {
  unitForm.reset();
  document.getElementById("id").value = "";
}

function populateForm(unit) {
  document.getElementById("id").value = unit.id;
  document.getElementById("tower").value = unit.tower;
  document.getElementById("flatNumber").value = unit.flatNumber;
  document.getElementById("sizeSqft").value = unit.sizeSqft;
  document.getElementById("type").value = unit.type;
  document.getElementById("viewCategory").value = unit.viewCategory;
  document.getElementById("price").value = Number(unit.price || 0);
  document.getElementById("status").value = unit.status;
  document.getElementById("customerName").value = unit.customerName || "";
  document.getElementById("notes").value = unit.notes || "";
}

function embeddedLeadFlow() {
  return isSelectMode && Boolean(leadId);
}

function setEditorPanelVisibility() {
  if (!editorPanel) return;
  // On a lead profile we only browse + Select; saving happens in the parent panel (single Save).
  if (embeddedLeadFlow()) {
    editorPanel.style.display = "none";
    return;
  }
  editorPanel.style.display = scope === "admin" ? "" : "none";
}

function renderPermissionsNotice() {
  permissionsNotice.classList.add("notice");
  const err = lastError ? `<div style="margin-top:8px;color:#991b1b;font-size:13px;"><strong>Error:</strong> ${lastError}</div>` : "";
  const ok = lastSuccess ? `<div style="margin-top:8px;color:#166534;font-size:13px;"><strong>Success:</strong> ${lastSuccess}</div>` : "";
  const leadHint = embeddedLeadFlow()
    ? `<p style="margin-top:8px;"><strong>Lead workflow:</strong> use <strong>Select</strong> on a row, then save status and notes in the panel above the table.</p>`
    : "";
  if (scope === "admin") {
    permissionsNotice.innerHTML = `
      <h2>Administrator Access</h2>
      <p>Full stock visibility: Available, Interested, Viewing, Deposit Secured, Payment Secured, Sold/Assigned.</p>
      ${leadHint}
      ${err}
      ${ok}
    `;
    setEditorPanelVisibility();
    return;
  }

  permissionsNotice.innerHTML = `
    <h2>User Access</h2>
    <p>You can browse inventory signals that remain market-available: Available, Interested, Viewing.</p>
    ${leadHint}
    ${err}
    ${ok}
  `;
  setEditorPanelVisibility();
}

function renderSummaryCards(units) {
  const count = (pred) => units.filter(pred).length;
  const cards =
    scope === "admin"
      ? [
          { label: "Total", value: units.length },
          { label: "Available", value: count((u) => u.status === "available") },
          { label: "Interested", value: count((u) => u.status === "interested") },
          { label: "Viewing", value: count((u) => u.status === "viewing") },
          { label: "Deposit Secured", value: count((u) => u.status === "deposit_secured") },
          { label: "Payment Secured", value: count((u) => u.status === "payment_secured") },
          { label: "Sold / Assigned", value: count((u) => u.status === "sold_assigned") }
        ]
      : [
          { label: "Total", value: units.length },
          { label: "Available", value: count((u) => u.status === "available") },
          { label: "Interested", value: count((u) => u.status === "interested") },
          { label: "Viewing", value: count((u) => u.status === "viewing") }
        ];

  summaryCards.innerHTML = cards
    .map(
      (card) => `
      <div class="card">
        <div class="label">${card.label}</div>
        <div class="value">${card.value}</div>
      </div>
    `
    )
    .join("");
}

function renderFilters(units) {
  const towers = [...new Set(units.map((u) => u.tower))].filter(Boolean).sort();
  const views = [...new Set(units.map((u) => u.viewCategory))].filter(Boolean).sort();
  const types = [...new Set(units.map((u) => u.type))].filter(Boolean).sort();

  const setSelectOptions = (select, options) => {
    const current = select.value;
    select.innerHTML = [`<option value="">All</option>`, ...options.map((o) => `<option value="${o}">${o}</option>`)].join("");
    select.value = options.includes(current) ? current : "";
  };

  setSelectOptions(filters.tower, towers);
  setSelectOptions(filters.viewCategory, views);
  setSelectOptions(filters.type, types);
  setSelectOptions(filters.status, statusOptionsForScope().map((s) => s));
  // Replace status labels
  Array.from(filters.status.options).forEach((opt) => {
    if (!opt.value) return;
    opt.textContent = STATUS_LABEL[opt.value] || opt.value;
  });
}

function getFilteredUnits(units) {
  const selectedTower = filters.tower.value;
  const selectedView = filters.viewCategory.value;
  const selectedStatus = filters.status.value;
  const selectedType = filters.type.value;
  const flatSearch = filters.flatNumber.value.trim().toLowerCase();

  return units.filter((u) => {
    const towerMatch = !selectedTower || u.tower === selectedTower;
    const viewMatch = !selectedView || u.viewCategory === selectedView;
    const statusMatch = !selectedStatus || u.status === selectedStatus;
    const typeMatch = !selectedType || u.type === selectedType;
    const flatMatch = !flatSearch || String(u.flatNumber || "").toLowerCase().includes(flatSearch);
    return towerMatch && viewMatch && statusMatch && typeMatch && flatMatch;
  });
}

function sortUnitsForDisplay(units) {
  return [...units].sort((a, b) => {
    const viewDiff = String(a.viewCategory || "").localeCompare(String(b.viewCategory || ""));
    if (viewDiff !== 0) return viewDiff;
    const towerDiff = String(a.tower || "").localeCompare(String(b.tower || ""));
    if (towerDiff !== 0) return towerDiff;
    return String(a.flatNumber || "").localeCompare(String(b.flatNumber || ""));
  });
}

function actionButtons(unit) {
  const canSelect = isSelectMode && leadId;
  const hideEditOnLead = embeddedLeadFlow();
  if (scope !== "admin") {
    const softSelectable = USER_STATUSES.includes(unit.status);
    return canSelect && softSelectable
      ? `<div class="row-actions"><button type="button" data-action="select" data-id="${unit.id}">Select</button></div>`
      : '<span class="text-muted">View only</span>';
  }

  const selectBtn = canSelect ? `<button type="button" data-action="select" data-id="${unit.id}">Select</button>` : "";
  const editBtn = hideEditOnLead ? "" : `<button type="button" data-action="edit" data-id="${unit.id}">Edit</button>`;
  return `<div class="row-actions">
    ${selectBtn}
    ${editBtn}
  </div>`;
}

function renderTable(units) {
  if (!units.length) {
    inventoryBody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-row">No flats match the current filters.</td>
      </tr>
    `;
    return;
  }

  inventoryBody.innerHTML = units
    .map(
      (u) => `
      <tr>
        <td>${u.flatNumber}</td>
        <td>${u.tower}</td>
        <td>${u.viewCategory}</td>
        <td>${u.type}</td>
        <td>${u.sizeSqft}</td>
        <td>${Number(u.price || 0).toLocaleString()}</td>
        <td><span class="status status-${u.status}">${STATUS_LABEL[u.status] || u.status}</span></td>
        <td>${u.customerName || "-"}</td>
        <td class="cell-notes" title="${String(u.notes || "").replaceAll('"', "&quot;")}">${u.notes ? String(u.notes).slice(0, 140) : "—"}</td>
        <td>${actionButtons(u)}</td>
      </tr>
    `
    )
    .join("");
}

function render() {
  renderFilters(unitsCache);
  renderSummaryCards(unitsCache);
  const filtered = getFilteredUnits(unitsCache);
  renderTable(sortUnitsForDisplay(filtered));
}

async function refresh() {
  unitsCache = await apiGetUnits();
  renderPermissionsNotice();
  render();
}

unitForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (scope !== "admin") return;
  const formData = getFormData();
  const ok = await apiUpsertUnit(formData);
  if (ok) {
    // Show the updated record immediately, even if filters would hide it.
    filters.flatNumber.value = formData.flatNumber || "";
    await refresh();
    renderPermissionsNotice();
    render();

    // If we're in select mode with a bound lead, also push the
    // assignment into the parent lead page so the client card
    // updates in a single flow.
    if (isSelectMode && leadId && formData.flatNumber) {
      const matched = unitsCache.find(
        (u) =>
          String(u.flatNumber || "").toLowerCase() === formData.flatNumber.toLowerCase() &&
          String(u.tower || "").toLowerCase() === String(formData.tower || "").toLowerCase(),
      );
      if (matched) {
        window.parent.postMessage(
          {
            type: "arkadians_inventory_assign",
            unit: matched,
            status: formData.status,
            leadId,
          },
          "*",
        );
      }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

resetBtn.addEventListener("click", resetForm);

Object.values(filters).forEach((filterEl) => {
  filterEl.addEventListener("input", render);
  filterEl.addEventListener("change", render);
});

inventoryBody.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  const action = btn.getAttribute("data-action");
  const target = unitsCache.find((u) => u.id === id);
  if (!target) return;

  if (action === "select" && isSelectMode) {
    if (scope !== "admin" && (HARD_LOCK_STATUSES.includes(target.status) || !USER_STATUSES.includes(target.status))) {
      lastError = "This flat is locked and cannot be selected by sales users.";
      renderPermissionsNotice();
      return;
    }

    // Populate the editor form only on standalone inventory (not embedded on a lead).
    if (scope === "admin" && !embeddedLeadFlow()) {
      populateForm(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    window.parent.postMessage(
      {
        type: "arkadians_inventory_select",
        unit: {
          id: target.id,
          tower: target.tower,
          flatNumber: target.flatNumber,
          type: target.type,
          viewCategory: target.viewCategory,
          notes: target.notes ?? null,
          customerName: target.customerName ?? null,
        },
        leadId: leadId || null
      },
      "*"
    );
    return;
  }

  if (action === "edit") {
    if (embeddedLeadFlow()) return;
    populateForm(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

renderPermissionsNotice();
const initStatus = initialStatusFilter();
if (initStatus) filters.status.value = initStatus;
refresh();
