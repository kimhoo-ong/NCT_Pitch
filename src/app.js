// app.js — application boot + state management
//
// Single state object (Gotcha 14). All UI reads from and writes to `state`.
// Tabs and levers are purely view — they never own state.

const state = {
  baseline: null,
  levers: { ...ZERO_LEVERS },
  baselineKPIs: null,
};

// ── Lever change entry point ──────────────────────────────────────────────────
// Called by levers.js on every slider/input event.
// rAF-throttle to cap recalculations during rapid slider drags.

let _rafPending = false;

function onLeverChange(key, value) {
  state.levers[key] = value;

  if (!_rafPending) {
    _rafPending = true;
    requestAnimationFrame(() => {
      _rafPending = false;
      _recalcAndRender();
    });
  }
}

function _recalcAndRender() {
  const kpis = calculateKPIs(state.baseline, state.levers);

  // Attach baseline values for cost-detail footer (avoids double calculateKPIs call)
  kpis._baselineTDC    = state.baselineKPIs.tdc_thousand;
  kpis._baselineProfit = state.baselineKPIs.net_profit_thousand;
  kpis._baselineMargin = state.baselineKPIs.margin_pct;

  updateKPIs(kpis, state.baselineKPIs);
  updateLeverDisplay(state.levers, state.baseline);
  renderSummary(state.levers, kpis, state.baselineKPIs);

  // Cost Detail tab updates live in the background — only re-render DOM if it's active
  if (document.getElementById('panel-cost-detail').classList.contains('active')) {
    renderCostDetail();
  }
}

// ── Reset ─────────────────────────────────────────────────────────────────────
function handleReset() {
  state.levers = { ...ZERO_LEVERS };
  resetLeverUI();   // levers.js — resets slider thumbs visually (Gotcha 7)
  _recalcAndRender();
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot() {
  state.baseline   = await loadBaseline();  // applies calibration
  state.levers     = { ...ZERO_LEVERS };
  state.baselineKPIs = calculateKPIs(state.baseline, ZERO_LEVERS);

  // Populate project metadata in top bar
  const meta = state.baseline.meta;
  const nameEl   = document.getElementById('project-name');
  const badgeEl  = document.getElementById('baseline-badge');
  if (nameEl)  nameEl.textContent  = meta.project_name;
  if (badgeEl) badgeEl.textContent = `Baseline ${meta.baseline_version} · ${meta.refreshed_at}`;

  // Render UI
  renderLevers(state.baseline);
  initKPIs(state.baselineKPIs);
  renderSummary(state.levers, state.baselineKPIs, state.baselineKPIs);
}

boot();
