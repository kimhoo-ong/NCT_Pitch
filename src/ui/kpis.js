// kpis.js — KPI card rendering + count-up animation
//
// Gotcha 5: slider drags fire events per pixel → each triggers a recalc → each
// would normally start a new count-up animation, causing queued animations fighting.
// Solution: one rAF loop per KPI, updating a target value immediately. The loop
// "chases" the target, not re-queuing from scratch each call.

const KPI_DEFS = [
  {
    id: 'gdv',
    label: 'GDV (Net)',
    field: 'gdv_thousand',
    format: v => 'RM ' + (v / 1000).toFixed(1) + 'M',
    deltaFormat: (d) => {
      if (Math.abs(d) < 500) return null;
      const sign = d > 0 ? '+' : '';
      return sign + 'RM ' + (d / 1000).toFixed(1) + 'M';
    },
    deltaClass: d => d > 500 ? 'positive' : d < -500 ? 'negative' : 'neutral',
    isHero: false,
  },
  {
    id: 'tdc',
    label: 'TDC',
    field: 'tdc_thousand',
    format: v => 'RM ' + (v / 1000).toFixed(1) + 'M',
    deltaFormat: (d) => {
      if (Math.abs(d) < 500) return null;
      const sign = d > 0 ? '+' : '';
      return sign + 'RM ' + (d / 1000).toFixed(1) + 'M';
    },
    // TDC going up is bad (negative = good)
    deltaClass: d => d < -500 ? 'positive' : d > 500 ? 'negative' : 'neutral',
    isHero: false,
  },
  {
    id: 'profit',
    label: 'Net Profit',
    field: 'net_profit_thousand',
    format: v => 'RM ' + (v / 1000).toFixed(1) + 'M',
    deltaFormat: (d) => {
      if (Math.abs(d) < 500) return null;
      const sign = d > 0 ? '+' : '';
      return sign + 'RM ' + (d / 1000).toFixed(1) + 'M';
    },
    deltaClass: d => d > 500 ? 'positive' : d < -500 ? 'negative' : 'neutral',
    isHero: false,
  },
  {
    id: 'margin',
    label: 'Net Margin',
    field: 'margin_pct',
    format: v => v.toFixed(1) + '%',
    deltaFormat: (d) => {
      if (Math.abs(d) < 0.05) return null;
      const sign = d > 0 ? '+' : '';
      return sign + d.toFixed(1) + 'pp';
    },
    deltaClass: d => d > 0.05 ? 'positive' : d < -0.05 ? 'negative' : 'neutral',
    isHero: true,
  },
];

function renderKPIShell(baselineKPIs) {
  const container = document.getElementById('kpi-container');
  if (!container) return;

  container.innerHTML = KPI_DEFS.map(def => `
    <div class="kpi-card${def.isHero ? ' kpi-hero' : ''}" data-kpi="${def.id}" id="kpi-card-${def.id}">
      <div class="kpi-label">${def.label}</div>
      <div class="kpi-value" id="kpi-value-${def.id}">${def.format(baselineKPIs[def.field])}</div>
      <div class="kpi-delta neutral" id="kpi-delta-${def.id}"></div>
      <div class="kpi-baseline" id="kpi-baseline-${def.id}">
        Baseline: ${def.format(baselineKPIs[def.field])}
      </div>
    </div>
  `).join('');
}

// ── Count-up animation (Gotcha 5) ────────────────────────────────────────────

// One animation state object per KPI. The rAF loop updates `current` toward `target`.
const _animState = {};

KPI_DEFS.forEach(def => {
  _animState[def.id] = {
    current: 0,
    target: 0,
    rafId: null,
    def,
    baselineVal: 0,
  };
});

const ANIM_SPEED = 0.18;  // fraction of remaining gap to close per frame

function _animateKPI(id) {
  const s = _animState[id];
  const diff = s.target - s.current;

  if (Math.abs(diff) < 0.01) {
    s.current = s.target;
    s.rafId = null;
    _renderKPIValue(id, s.current, s.baselineVal);
    return;
  }

  s.current += diff * ANIM_SPEED;
  _renderKPIValue(id, s.current, s.baselineVal);
  s.rafId = requestAnimationFrame(() => _animateKPI(id));
}

function _renderKPIValue(id, value, baselineVal) {
  const def = KPI_DEFS.find(d => d.id === id);
  if (!def) return;

  const el = document.getElementById('kpi-value-' + id);
  const deltaEl = document.getElementById('kpi-delta-' + id);
  const card = document.getElementById('kpi-card-' + id);
  if (!el) return;

  el.textContent = def.format(value);

  const delta = value - baselineVal;

  if (deltaEl) {
    const text = def.deltaFormat(delta);
    if (!text) {
      deltaEl.textContent = '';
      deltaEl.className = 'kpi-delta neutral';
    } else {
      deltaEl.textContent = text;
      deltaEl.className = 'kpi-delta ' + def.deltaClass(delta);
    }
  }

  // Margin card accent stripe
  if (id === 'margin' && card) {
    card.classList.remove('good', 'warn', 'danger');
    if (value >= 20)      card.classList.add('good');
    else if (value >= 15) card.classList.add('warn');
    else                  card.classList.add('danger');
  }
}

function updateKPIs(kpis, baselineKPIs) {
  KPI_DEFS.forEach(def => {
    const s = _animState[def.id];
    s.target      = kpis[def.field];
    s.baselineVal = baselineKPIs[def.field];

    // Kick off animation if not already running (Gotcha 5: don't re-queue)
    if (s.rafId === null) {
      s.current = s.target; // snap on first render, animate on subsequent
      s.rafId = requestAnimationFrame(() => _animateKPI(def.id));
    }
    // If already running: just update target — the loop will chase the new value
  });
}

// Call once after baseline loads to seed current values (no animation on first paint)
function initKPIs(baselineKPIs) {
  renderKPIShell(baselineKPIs);
  KPI_DEFS.forEach(def => {
    const s = _animState[def.id];
    s.current     = baselineKPIs[def.field];
    s.target      = baselineKPIs[def.field];
    s.baselineVal = baselineKPIs[def.field];
    _renderKPIValue(def.id, s.current, s.baselineVal);
  });
}

if (typeof module !== 'undefined') module.exports = { initKPIs, updateKPIs };
