// levers.js — lever card rendering + slider binding
//
// Lever config defines the 6 levers and their display rules.
// Levers 1-3: multiplier (display %, stored as %)
// Levers 4-6: additive pp (display pp, stored as pp)
//
// The colour tint on the left edge of each card:
//   gold   = direction is favorable to margin
//   red    = direction is unfavorable to margin
//   none   = at zero

const LEVER_CONFIG = [
  {
    key:       'selling_price',
    label:     'Selling Price',
    unit:      '%',
    unitLabel: 'multiplier',
    min: -20, max: 20, step: 1, defaultVal: 0,
    tooltip:   'Adjusts selling price per SF for all unit types. +10% → gross GDV increases by 10% before discounts.',
    resultFn:  (levers, baseline) => {
      const adj = baseline.derived_params.construction_cost_per_sf_gfa; // not used here
      const basePrice = baseline.sales[0].selling_price_per_sf;
      const adjPrice  = basePrice * (1 + levers.selling_price / 100);
      return `→ RM ${adjPrice.toFixed(2)} / SF (residential T1)`;
    },
    // Higher selling price is good for margin
    favorableSign: 1,
  },
  {
    key:       'construction_cost',
    label:     'Construction Cost',
    unit:      '%',
    unitLabel: 'multiplier',
    min: -15, max: 25, step: 1, defaultVal: 0,
    tooltip:   'Scales all construction sub-items (5.x) proportionally. -3% = contractor agrees to reduce whole bill by 3%.',
    resultFn:  (levers, baseline) => {
      const adj = baseline.derived_params.construction_cost_per_sf_gfa * (1 + levers.construction_cost / 100);
      return `→ RM ${adj.toFixed(2)} / SF GFA`;
    },
    // Lower construction cost is good for margin
    favorableSign: -1,
  },
  {
    key:       'sales_period',
    label:     'Sales Period',
    unit:      '%',
    unitLabel: 'multiplier',
    min: -25, max: 50, step: 5, defaultVal: 0,
    tooltip:   'Stretches or compresses the sales period. Does NOT change GDV or construction cost — only affects how long construction interest accrues.',
    resultFn:  (levers, baseline) => {
      const months = baseline.financing.sales_period_months * (1 + levers.sales_period / 100);
      return `→ ${months.toFixed(0)} months`;
    },
    // Shorter sales period is good (less interest)
    favorableSign: -1,
  },
  {
    key:       'interest_rate',
    label:     'Interest Rate',
    unit:      'pp',
    unitLabel: 'additive',
    min: -2, max: 3, step: 0.1, defaultVal: 0,
    tooltip:   'Adds percentage points to the base interest rate (4.8% p.a.). Affects land holding interest and construction interest.',
    resultFn:  (levers, baseline) => {
      const rate = baseline.financing.interest_rate_pct + levers.interest_rate;
      return `→ ${rate.toFixed(1)}% p.a.`;
    },
    favorableSign: -1,
  },
  {
    key:       'ap_commission',
    label:     'A&P + Commission',
    unit:      'pp',
    unitLabel: 'additive',
    min: -1, max: 3, step: 0.1, defaultVal: 0,
    tooltip:   '+1pp splits equally: +0.5pp to Advertising & Promotion (item 17.1) and +0.5pp to Agent Commission (item 18).',
    resultFn:  (levers, baseline) => {
      const advPct = baseline.derived_params.advertising_promotion_pct_of_gdv + levers.ap_commission / 2;
      const comPct = baseline.derived_params.agent_commission_pct_of_gdv     + levers.ap_commission / 2;
      return `→ A&P ${advPct.toFixed(1)}% + Comm ${comPct.toFixed(1)}% of GDV`;
    },
    favorableSign: -1,
  },
  {
    key:       'bumi_discount',
    label:     'Bumi Contribution',
    unit:      'pp',
    unitLabel: 'additive',
    min: -2, max: 5, step: 0.1, defaultVal: 0,
    tooltip:   'Adjusts Bumi Contribution (item 20) as % of net GDV. +1pp increases TDC by 1% of GDV — affects margin directly.',
    resultFn:  (levers, baseline) => {
      const pct = baseline.derived_params.bumi_contribution_pct_of_gdv + levers.bumi_discount;
      return `→ ${pct.toFixed(1)}% of net GDV`;
    },
    favorableSign: -1,
  },
];

function renderLevers(baseline) {
  const container = document.getElementById('levers-container');
  if (!container) return;

  container.innerHTML = LEVER_CONFIG.map(cfg => `
    <div class="lever-card lever-neutral" id="lever-card-${cfg.key}" data-key="${cfg.key}">
      <div class="lever-header">
        <span class="lever-name" title="${cfg.tooltip}">${cfg.label}</span>
        <span class="lever-unit">${cfg.unitLabel}</span>
      </div>
      <div class="lever-control">
        <input
          type="range"
          class="lever-slider"
          id="slider-${cfg.key}"
          min="${cfg.min}" max="${cfg.max}" step="${cfg.step}"
          value="${cfg.defaultVal}"
          aria-label="${cfg.label}"
        />
        <input
          type="number"
          class="lever-input"
          id="input-${cfg.key}"
          min="${cfg.min}" max="${cfg.max}" step="${cfg.step}"
          value="${cfg.defaultVal}"
          aria-label="${cfg.label} value"
        />
        <span style="font-family:var(--mono);font-size:11px;color:var(--ink-dim);flex-shrink:0;">${cfg.unit}</span>
      </div>
      <div class="lever-footer">
        <span class="lever-result" id="result-${cfg.key}"></span>
        <span class="lever-delta neutral" id="delta-${cfg.key}"></span>
      </div>
    </div>
  `).join('');

  // Bind events after rendering
  LEVER_CONFIG.forEach(cfg => {
    const slider = document.getElementById('slider-' + cfg.key);
    const input  = document.getElementById('input-'  + cfg.key);

    // Slider → update state (rAF-throttled on rapid drag, Gotcha 4)
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);  // Gotcha: value is a string (Gotcha 2)
      input.value = v;
      onLeverChange(cfg.key, v);
    });

    // Numeric input → sync slider + state
    input.addEventListener('change', () => {
      let v = parseFloat(input.value);
      v = Math.max(cfg.min, Math.min(cfg.max, v));
      v = Math.round(v / cfg.step) * cfg.step;
      input.value = v;
      slider.value = v;
      onLeverChange(cfg.key, v);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') input.blur();
    });
  });

  // Initial render with zero levers
  updateLeverDisplay(state.levers, baseline);
}

function updateLeverDisplay(levers, baseline) {
  LEVER_CONFIG.forEach(cfg => {
    const v      = levers[cfg.key];
    const card   = document.getElementById('lever-card-' + cfg.key);
    const result = document.getElementById('result-' + cfg.key);
    const delta  = document.getElementById('delta-'  + cfg.key);

    if (!card) return;

    // Left-edge tint (Gotcha context: favorable direction)
    card.classList.remove('lever-positive', 'lever-negative', 'lever-neutral');
    if (Math.abs(v) < 1e-9) {
      card.classList.add('lever-neutral');
    } else if (v * cfg.favorableSign > 0) {
      card.classList.add('lever-positive');
    } else {
      card.classList.add('lever-negative');
    }

    // Result line
    if (result) result.textContent = cfg.resultFn(levers, baseline);

    // Delta badge
    if (delta) {
      if (Math.abs(v) < 1e-9) {
        delta.textContent = '';
        delta.className = 'lever-delta neutral';
      } else {
        const sign = v > 0 ? '+' : '';
        delta.textContent = `${sign}${v}${cfg.unit}`;
        delta.className = 'lever-delta ' + (v * cfg.favorableSign > 0 ? 'positive' : 'negative');
      }
    }
  });
}

// Reset all lever UI to zero (Gotcha 7: must dispatch 'input' to move thumb visually)
function resetLeverUI() {
  LEVER_CONFIG.forEach(cfg => {
    const slider = document.getElementById('slider-' + cfg.key);
    const input  = document.getElementById('input-'  + cfg.key);
    if (slider) {
      slider.value = cfg.defaultVal;
      slider.dispatchEvent(new Event('input'));  // Gotcha 7
    }
    if (input) input.value = cfg.defaultVal;
  });
}

if (typeof module !== 'undefined') module.exports = { LEVER_CONFIG, renderLevers, updateLeverDisplay, resetLeverUI };
