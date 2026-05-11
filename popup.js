// Download Router — Popup Script

let rules = [];
let editingId = null;
let selectedType = "domain";
let dragSrcIndex = null;

const container = document.getElementById("rules-container");
const emptyState = document.getElementById("empty-state");
const backdrop = document.getElementById("modal-backdrop");
const modalTitle = document.getElementById("modal-title");
const openBtn = document.getElementById("open-modal-btn");
const cancelBtn = document.getElementById("cancel-btn");
const saveBtn = document.getElementById("save-btn");
const ruleValueInput = document.getElementById("rule-value");
const ruleFolderInput = document.getElementById("rule-folder");
const rulePriorityInput = document.getElementById("rule-priority");
const valueLabel = document.getElementById("value-label");
const ruleHint = document.getElementById("rule-hint");
const toast = document.getElementById("toast");
const segBtns = document.querySelectorAll(".seg-btn");

// ── INIT ──────────────────────────────────────────────────────────────────────
chrome.storage.sync.get({ rules: [] }, ({ rules: saved }) => {
  rules = saved;
  renderRules();
});

if (document.fonts?.ready) {
  document.fonts.ready.then(() => scheduleRulesContainerSizing());
}
window.addEventListener("load", () => scheduleRulesContainerSizing());

// ── RENDER ────────────────────────────────────────────────────────────────────
function renderRules() {
  // Remove all rule cards (keep empty state)
  container.querySelectorAll(".rule-card").forEach((el) => el.remove());

  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  if (!sorted.length) {
    emptyState.style.display = "flex";
    return;
  }
  emptyState.style.display = "none";

  sorted.forEach((rule, idx) => {
    const card = document.createElement("div");
    card.className = "rule-card" + (rule.enabled === false ? " disabled" : "");
    card.dataset.id = rule.id;
    card.draggable = true;

    const typeLabels = { domain: "Domain", extension: "Ext", pattern: "Regex" };
    buildRuleCard(card, rule, typeLabels);

    // Drag events
    card.addEventListener("dragstart", (e) => {
      dragSrcIndex = idx;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      card.classList.add("drag-over");
    });
    card.addEventListener("dragleave", () =>
      card.classList.remove("drag-over"),
    );
    card.addEventListener("drop", (e) => {
      e.preventDefault();
      card.classList.remove("drag-over");
      if (dragSrcIndex === null || dragSrcIndex === idx) return;
      reorderRules(dragSrcIndex, idx);
    });

    container.appendChild(card);
  });

  // Delegate clicks
  container.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("change", handleAction);
    el.addEventListener("click", handleAction);
  });

  scheduleRulesContainerSizing();
}

function buildRuleCard(card, rule, typeLabels) {
  const dragHandle = document.createElement("div");
  dragHandle.className = "drag-handle";
  dragHandle.title = "Drag to reorder";
  dragHandle.textContent = "⠿";

  const priorityBadge = document.createElement("div");
  priorityBadge.className = "priority-badge";
  priorityBadge.textContent = String(rule.priority ?? "");

  const ruleInfo = document.createElement("div");
  ruleInfo.className = "rule-info";

  const ruleTypeValue = document.createElement("div");
  ruleTypeValue.className = "rule-type-value";

  const typeChip = document.createElement("span");
  typeChip.className = `type-chip ${rule.type ?? ""}`;
  typeChip.textContent = typeLabels[rule.type] || rule.type;

  const ruleValue = document.createElement("span");
  ruleValue.className = "rule-value";
  ruleValue.textContent = String(rule.value ?? "");

  ruleTypeValue.appendChild(typeChip);
  ruleTypeValue.appendChild(ruleValue);

  const ruleFolder = document.createElement("div");
  ruleFolder.className = "rule-folder";
  ruleFolder.append("→ ");

  const folderValue = document.createElement("span");
  folderValue.textContent = String(rule.folder ?? "");
  ruleFolder.appendChild(folderValue);

  ruleInfo.appendChild(ruleTypeValue);
  ruleInfo.appendChild(ruleFolder);

  const ruleActions = document.createElement("div");
  ruleActions.className = "rule-actions";

  const toggleLabel = document.createElement("label");
  toggleLabel.className = "toggle";
  toggleLabel.title = `${rule.enabled === false ? "Enable" : "Disable"} rule`;

  const toggleInput = document.createElement("input");
  toggleInput.type = "checkbox";
  toggleInput.checked = rule.enabled !== false;
  toggleInput.dataset.action = "toggle";
  toggleInput.dataset.id = rule.id;

  const toggleTrack = document.createElement("div");
  toggleTrack.className = "toggle-track";

  const toggleThumb = document.createElement("div");
  toggleThumb.className = "toggle-thumb";

  toggleLabel.appendChild(toggleInput);
  toggleLabel.appendChild(toggleTrack);
  toggleLabel.appendChild(toggleThumb);

  const editBtn = document.createElement("button");
  editBtn.className = "icon-btn";
  editBtn.dataset.action = "edit";
  editBtn.dataset.id = rule.id;
  editBtn.title = "Edit";
  editBtn.appendChild(
    createLucideSvg([
      {
        d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      },
      { d: "m15 5 4 4" },
    ]),
  );

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "icon-btn danger";
  deleteBtn.dataset.action = "delete";
  deleteBtn.dataset.id = rule.id;
  deleteBtn.title = "Delete";
  deleteBtn.appendChild(
    createLucideSvg([
      { d: "M10 11v6" },
      { d: "M14 11v6" },
      { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" },
      { d: "M3 6h18" },
      { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" },
    ]),
  );

  ruleActions.appendChild(toggleLabel);
  ruleActions.appendChild(editBtn);
  ruleActions.appendChild(deleteBtn);

  card.appendChild(dragHandle);
  card.appendChild(priorityBadge);
  card.appendChild(ruleInfo);
  card.appendChild(ruleActions);
}

function createLucideSvg(paths) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  for (const { d } of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }

  return svg;
}

function scheduleRulesContainerSizing() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => updateRulesContainerSizing());
  });
}

function updateRulesContainerSizing() {
  const cards = Array.from(container.querySelectorAll(".rule-card"));

  if (cards.length === 0) {
    container.style.maxHeight = "";
    return;
  }

  const styles = getComputedStyle(container);
  const paddingTop = parseFloat(styles.paddingTop) || 0;
  const paddingBottom = parseFloat(styles.paddingBottom) || 0;
  const gap = parseFloat(styles.rowGap || styles.gap) || 0;

  const visibleCount = Math.min(cards.length, 5);
  let maxHeight =
    paddingTop + paddingBottom + gap * Math.max(0, visibleCount - 1);

  for (let i = 0; i < visibleCount; i++) {
    maxHeight += cards[i].getBoundingClientRect().height;
  }

  container.style.maxHeight = `${Math.ceil(maxHeight)}px`;
}

function handleAction(e) {
  const el = e.currentTarget;
  const action = el.dataset.action;
  const id = el.dataset.id;

  if (action === "toggle") {
    const rule = rules.find((r) => r.id === id);
    if (rule) {
      rule.enabled = el.checked;
      saveRules();
      renderRules();
    }
  } else if (action === "edit") {
    openEditModal(id);
  } else if (action === "delete") {
    rules = rules.filter((r) => r.id !== id);
    reassignPriorities();
    saveRules();
    renderRules();
    showToast("Rule deleted");
  }
}

// ── DRAG REORDER ──────────────────────────────────────────────────────────────
function reorderRules(fromIdx, toIdx) {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  const [moved] = sorted.splice(fromIdx, 1);
  sorted.splice(toIdx, 0, moved);
  // Re-assign priorities
  sorted.forEach((r, i) => {
    r.priority = i + 1;
  });
  rules = sorted;
  saveRules();
  renderRules();
}

function reassignPriorities() {
  rules
    .sort((a, b) => a.priority - b.priority)
    .forEach((r, i) => {
      r.priority = i + 1;
    });
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
openBtn.addEventListener("click", () => openModal());
cancelBtn.addEventListener("click", closeModal);
backdrop.addEventListener("click", (e) => {
  if (e.target === backdrop) closeModal();
});

segBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    segBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedType = btn.dataset.type;
    updateTypeUI();
    if (selectedType === "domain") {
      ruleValueInput.value = normalizeDomainValue(ruleValueInput.value);
    }
  });
});

ruleValueInput.addEventListener("blur", () => {
  if (selectedType === "domain") {
    ruleValueInput.value = normalizeDomainValue(ruleValueInput.value);
  }
});

function updateTypeUI() {
  const hints = {
    domain: [
      "Domain",
      "e.g. gameassets.com",
      "Match any download from this domain (subdomains included).",
    ],
    extension: [
      "File Extension",
      "e.g. .png",
      "Match any download with this file extension.",
    ],
    pattern: [
      "Regex Pattern",
      "e.g. invoice.*\\.pdf",
      "Match filename or URL against a regular expression.",
    ],
  };
  const [label, ph, hint] = hints[selectedType] || hints.domain;
  valueLabel.textContent = label;
  ruleValueInput.placeholder = ph;
  ruleHint.textContent = hint;
}

function openModal(id = null) {
  editingId = id;
  segBtns.forEach((b) => b.classList.remove("active"));

  if (id) {
    const rule = rules.find((r) => r.id === id);
    modalTitle.textContent = "Edit Rule";
    selectedType = rule.type;
    ruleValueInput.value =
      selectedType === "domain"
        ? normalizeDomainValue(rule.value)
        : String(rule.value ?? "");
    ruleFolderInput.value = rule.folder;
    rulePriorityInput.value = rule.priority;
  } else {
    modalTitle.textContent = "New Rule";
    selectedType = "domain";
    ruleValueInput.value = "";
    ruleFolderInput.value = "";
    rulePriorityInput.value = rules.length + 1;
  }

  document
    .querySelector(`.seg-btn[data-type="${selectedType}"]`)
    .classList.add("active");
  updateTypeUI();
  document.body.classList.add("modal-open");
  backdrop.classList.add("open");
  setTimeout(() => ruleValueInput.focus(), 200);
}

function openEditModal(id) {
  openModal(id);
}

function closeModal() {
  backdrop.classList.remove("open");
  document.body.classList.remove("modal-open");
  editingId = null;
}

saveBtn.addEventListener("click", () => {
  const rawValue = ruleValueInput.value.trim();
  const value =
    selectedType === "domain" ? normalizeDomainValue(rawValue) : rawValue;
  const folder = ruleFolderInput.value.trim();
  const priority = parseInt(rulePriorityInput.value, 10);

  if (!value) {
    shake(ruleValueInput);
    return;
  }
  if (!folder) {
    shake(ruleFolderInput);
    return;
  }
  if (!priority || priority < 1) {
    shake(rulePriorityInput);
    return;
  }

  if (selectedType === "domain") {
    ruleValueInput.value = value;
  }

  if (editingId) {
    const rule = rules.find((r) => r.id === editingId);
    Object.assign(rule, { type: selectedType, value, folder, priority });
  } else {
    rules.push({
      id: crypto.randomUUID(),
      type: selectedType,
      value,
      folder,
      priority,
      enabled: true,
    });
  }

  saveRules();
  renderRules();
  closeModal();
  showToast(editingId ? "Rule updated" : "Rule added");
});

// ── UTILS ─────────────────────────────────────────────────────────────────────
function saveRules() {
  chrome.storage.sync.set({ rules });
}

function normalizeDomainValue(value) {
  let v = String(value ?? "").trim();
  if (!v) return "";

  try {
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v);
    v = new URL(hasScheme ? v : `https://${v}`).hostname;
  } catch {
    v = v.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
    v = v.split(/[/?#]/)[0];
    v = v.split("@").pop() || "";
    v = v.replace(/:\d+$/, "");
  }

  v = v.replace(/^www\./i, "").toLowerCase();
  return v;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function shake(el) {
  el.style.animation = "none";
  el.style.borderColor = "var(--danger)";
  setTimeout(() => {
    el.style.borderColor = "";
  }, 800);
}

let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2000);
}
