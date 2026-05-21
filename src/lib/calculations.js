// calculations.js — pure functions, no DOM, no globals
// All functions take (baseline, levers) as arguments and return new objects.
// Safe to unit-test and future-portable to Fabric UDF (Fabric supports JS).
//
// Money convention: all internal values in RM thousands.
// Percentage convention: 4.8 means 4.8% (not 0.048). Convert at point of use.

// ─── Lever application ────────────────────────────────────────────────────────

// Lever 1 (selling_price): % multiplier on selling_price_per_sf
// Lever 2 (construction_cost): % multiplier on construction_cost_per_sf_gfa
// Lever 3 (sales_period): % multiplier on sales_period_months
// Lever 4 (interest_rate): pp additive on interest_rate_pct
// Lever 5 (ap_commission): pp additive split equally between advertising + agent commission
// Lever 6 (bumi_discount): pp additive on bumi_contribution_pct_of_gdv (cost item 20)
//
// Bumi is NOT in the per-unit discount_stack (see feedback CLAUDE_CODE_FEEDBACK.md §3).
// It lives as cost item 20, a TDC line item derived as % of net GDV.
//
// The discount_stack in sales[] is uniform: 23% across all unit types (early_bird 5% +
// staff 5% + promotion 10% + others 3%). No Bumi discount in per-unit math.
function applyLevers(baseline, levers) {
  return {
    ...baseline,
    sales: baseline.sales.map(s => ({
      ...s,
      selling_price_per_sf: s.selling_price_per_sf * (1 + levers.selling_price / 100),
      // discount_stack is uniform and fixed (no lever directly changes it)
    })),
    derived_params: {
      ...baseline.derived_params,
      construction_cost_per_sf_gfa:
        baseline.derived_params.construction_cost_per_sf_gfa * (1 + levers.construction_cost / 100),
      // Lever 5 splits its delta equally: +1pp total → +0.5pp each
      advertising_promotion_pct_of_gdv:
        baseline.derived_params.advertising_promotion_pct_of_gdv + levers.ap_commission / 2,
      agent_commission_pct_of_gdv:
        baseline.derived_params.agent_commission_pct_of_gdv + levers.ap_commission / 2,
      // Lever 6 adjusts bumi contribution pct (cost item 20)
      bumi_contribution_pct_of_gdv:
        baseline.derived_params.bumi_contribution_pct_of_gdv + levers.bumi_discount,
    },
    financing: {
      ...baseline.financing,
      interest_rate_pct: baseline.financing.interest_rate_pct + levers.interest_rate,
      sales_period_months:
        baseline.financing.sales_period_months * (1 + levers.sales_period / 100),
    },
  };
}

// ─── GDV ─────────────────────────────────────────────────────────────────────

function calculateGDV(data) {
  const gross_gdv_thousand = data.sales.reduce((sum, s) => {
    return sum + (s.no_of_units * s.built_up_sf * s.selling_price_per_sf) / 1000;
  }, 0);

  const net_gdv_thousand = data.sales.reduce((sum, s) => {
    const gross = (s.no_of_units * s.built_up_sf * s.selling_price_per_sf) / 1000;
    const total_discount_pct = Object.values(s.discount_stack).reduce((a, b) => a + b, 0);
    return sum + gross * (1 - total_discount_pct / 100);
  }, 0);

  return { gross_gdv_thousand, net_gdv_thousand };
}

// ─── Cost item expansion ──────────────────────────────────────────────────────

// Returns a new array with every cost_item annotated with:
//   baseline_amount_thousand, adjusted_amount_thousand, delta_thousand, delta_pct
//
// Two-pass approach:
//   Pass 1: compute all non-rollup items
//   Pass 2: compute rollup aggregates (e.g. 5.2) from their children's pass-1 values
//
// Derived items:
//   4.3 (Land Holding Interest):
//     land_input_total × rate × (dev_period_months/12) × 0.5
//     land_input_total = sum of all 4.x items with calc:'input'
//     Simplified average-outstanding approx (v1; real model needs monthly amortization).
//
//   17.1, 18, 20, 21 (S&M and Bumi, % of net GDV):
//     baseline amount = baseline net GDV × baseline pct
//     adjusted amount = adjusted net GDV × adjusted pct
//
//   X (Construction Interest):
//     construction_total × bank_borrowing_pct × rate × (sales_period_months/12) × 0.5
//     Uses derived_params construction total, not sum of 5.x items.
//     Lever 3 (sales_period) changes how long interest accrues.
//     Lever 4 (interest_rate) changes the rate.
//
// Construction scaling (all 5.x items with calc:'input'):
//   construction_scale = adj_total / baseline_total
//   where total = construction_total_gfa_sf × construction_cost_per_sf_gfa / 1000
//   Every 5.x input item (including [EST] items) scales by this factor.
//   Financially correct: a contractor price reduction applies to the whole bill.
function expandCostItems(adjusted, baseline, net_gdv_thousand, baseline_net_gdv_thousand) {
  // Construction totals (from derived_params, not sum of 5.x items)
  const construction_total =
    (adjusted.derived_params.construction_total_gfa_sf *
      adjusted.derived_params.construction_cost_per_sf_gfa) / 1000;

  const baseline_construction_total =
    (baseline.derived_params.construction_total_gfa_sf *
      baseline.derived_params.construction_cost_per_sf_gfa) / 1000;

  const construction_scale = construction_total / baseline_construction_total;

  // Land input total (all 4.x items with calc:'input') — base for land holding interest
  const land_input_total = baseline.cost_items
    .filter(i => i.parent === '4' && i.calc === 'input')
    .reduce((s, i) => s + (i.amount_thousand ?? 0), 0);

  // Land holding interest: all land inputs × rate × (dev_period/12) × 0.5
  const baseline_land_interest =
    land_input_total *
    (baseline.financing.interest_rate_pct / 100) *
    (baseline.financing.development_period_months / 12) *
    0.5;

  const adjusted_land_interest =
    land_input_total *
    (adjusted.financing.interest_rate_pct / 100) *
    (adjusted.financing.development_period_months / 12) *
    0.5;

  // Construction interest: construction_borrowing × rate × (sales_period/12) × 0.5
  const baseline_construction_borrowing =
    baseline_construction_total * (baseline.financing.bank_borrowing_pct / 100);
  const adjusted_construction_borrowing =
    construction_total * (adjusted.financing.bank_borrowing_pct / 100);

  const baseline_construction_interest =
    baseline_construction_borrowing *
    (baseline.financing.interest_rate_pct / 100) *
    (baseline.financing.sales_period_months / 12) *
    0.5;

  const adjusted_construction_interest =
    adjusted_construction_borrowing *
    (adjusted.financing.interest_rate_pct / 100) *
    (adjusted.financing.sales_period_months / 12) *
    0.5;

  // Pass 1 — compute all non-rollup items
  const pass1 = baseline.cost_items.map(item => {
    let baselineAmt = item.amount_thousand;
    let adjustedAmt = item.amount_thousand;

    if (item.calc === 'input') {
      if (item.item_no === '5' || item.item_no.startsWith('5.')) {
        // All 5.x input items scale with lever 2
        adjustedAmt = baselineAmt * construction_scale;
      }
      // All other input items are fixed (no lever moves them directly)
    }

    if (item.item_no === '4.3') {
      baselineAmt = baseline_land_interest;
      adjustedAmt = adjusted_land_interest;
    }

    if (item.item_no === 'X') {
      baselineAmt = baseline_construction_interest;
      adjustedAmt = adjusted_construction_interest;
    }

    if (item.calc === 'derived_pct_gdv') {
      const basePct = baseline.derived_params[item.pct];
      const adjPct = adjusted.derived_params[item.pct];
      baselineAmt = baseline_net_gdv_thousand * (basePct / 100);
      adjustedAmt = net_gdv_thousand * (adjPct / 100);
    }

    // rollup computed in pass 2
    if (item.calc === 'rollup') {
      baselineAmt = null;
      adjustedAmt = null;
    }

    const delta =
      adjustedAmt !== null && baselineAmt !== null ? adjustedAmt - baselineAmt : null;
    const deltaPct =
      delta !== null && baselineAmt !== null && baselineAmt !== 0
        ? (delta / baselineAmt) * 100
        : null;

    return {
      ...item,
      baseline_amount_thousand: baselineAmt,
      adjusted_amount_thousand: adjustedAmt,
      delta_thousand: delta,
      delta_pct: deltaPct,
    };
  });

  // Pass 2 — rollup aggregates: sum of direct non-rollup children
  return pass1.map(item => {
    if (item.calc !== 'rollup') return item;

    const children = pass1.filter(c => c.parent === item.item_no && c.calc !== 'rollup');
    const baselineSum = children.reduce((s, c) => s + (c.baseline_amount_thousand ?? 0), 0);
    const adjustedSum = children.reduce((s, c) => s + (c.adjusted_amount_thousand ?? 0), 0);
    const delta = adjustedSum - baselineSum;
    const deltaPct = baselineSum !== 0 ? (delta / baselineSum) * 100 : null;

    return {
      ...item,
      baseline_amount_thousand: baselineSum,
      adjusted_amount_thousand: adjustedSum,
      delta_thousand: delta,
      delta_pct: deltaPct,
    };
  });
}

// ─── KPI computation ──────────────────────────────────────────────────────────

// TDC: sum of all items that carry a direct cost value.
//   Excluded: 'header' rows (section titles), 'rollup' aggregates (computed from children).
//   Included: 'leaf' AND 'aggregate-with-calc-input' items (e.g. 5.1, 5.3 which are
//   marked aggregate in F_L2 but have no children in v1 and carry a real amount).
function calculateKPIs(baseline, levers) {
  const adjusted = applyLevers(baseline, levers);
  const { net_gdv_thousand } = calculateGDV(adjusted);
  const { net_gdv_thousand: baseline_net_gdv_thousand } = calculateGDV(baseline);

  const expanded = expandCostItems(
    adjusted,
    baseline,
    net_gdv_thousand,
    baseline_net_gdv_thousand,
  );

  const tdc = expanded
    .filter(
      i =>
        i.row_role !== 'header' &&
        i.calc !== 'rollup' &&
        i.adjusted_amount_thousand !== null,
    )
    .reduce((sum, i) => sum + i.adjusted_amount_thousand, 0);

  const net_profit = net_gdv_thousand - tdc;
  const margin_pct = (net_profit / net_gdv_thousand) * 100;

  return {
    gdv_thousand: net_gdv_thousand,
    tdc_thousand: tdc,
    net_profit_thousand: net_profit,
    margin_pct,
    cost_detail: expanded,
    adjusted,
  };
}

// ─── Calibration ─────────────────────────────────────────────────────────────

// Scales all is_estimated cost items by a uniform factor so that the baseline
// (all levers at zero) produces exactly target_margin_pct.
//
// Approach:
//   1. Compute net GDV from current sales data (inline, no dependency on calculateGDV)
//   2. Compute target TDC = net_gdv × (1 - target_margin/100)
//   3. Compute "fixed TDC" — sum of all non-estimated items including derived items
//   4. EST items must account for: target_TDC - fixed_TDC
//   5. scale_factor = needed / current_est_sum
//   6. Apply to each is_estimated item in-place (mutates baseline.cost_items)
//
// Called once by data-loader.js at startup. Results stored in baseline._calibration.
//
// NOTE: items with amount_thousand === 0 remain 0 after calibration (0 × anything = 0).
// This is intentional — 0 signals "genuinely not applicable" (e.g. GST, Interior Design).
// Non-zero [EST] seeds absorb the calibration proportionally.
function calibrateEstimatedCosts(baseline, target_margin_pct) {
  // Compute net GDV inline (avoids circular dependency with calculateGDV which isn't loaded yet)
  const net_gdv = baseline.sales.reduce((sum, s) => {
    const gross = (s.no_of_units * s.built_up_sf * s.selling_price_per_sf) / 1000;
    const disc = Object.values(s.discount_stack).reduce((a, b) => a + b, 0);
    return sum + gross * (1 - disc / 100);
  }, 0);

  const target_tdc = net_gdv * (1 - target_margin_pct / 100);

  // Fixed non-estimated input items (real data, never scaled)
  const fixed_input_sum = baseline.cost_items
    .filter(i => !i.is_estimated && i.calc === 'input' && i.amount_thousand !== null)
    .reduce((s, i) => s + i.amount_thousand, 0);

  // Land holding interest at baseline (derived, fixed)
  const land_input_total = baseline.cost_items
    .filter(i => i.parent === '4' && i.calc === 'input')
    .reduce((s, i) => s + (i.amount_thousand ?? 0), 0);
  const land_interest =
    land_input_total *
    (baseline.financing.interest_rate_pct / 100) *
    (baseline.financing.development_period_months / 12) *
    0.5;

  // GDV-derived items at baseline (fixed pcts × fixed net_gdv)
  const derived_gdv_sum = ['advertising_promotion_pct_of_gdv', 'agent_commission_pct_of_gdv',
    'bumi_contribution_pct_of_gdv', 'admin_fees_pct_of_gdv']
    .reduce((s, key) => s + net_gdv * (baseline.derived_params[key] / 100), 0);

  // Construction interest at baseline
  const baseline_construction_total =
    (baseline.derived_params.construction_total_gfa_sf *
      baseline.derived_params.construction_cost_per_sf_gfa) / 1000;
  const construction_interest =
    baseline_construction_total *
    (baseline.financing.bank_borrowing_pct / 100) *
    (baseline.financing.interest_rate_pct / 100) *
    (baseline.financing.sales_period_months / 12) *
    0.5;

  // Estimated input items (scalable)
  const est_items = baseline.cost_items.filter(
    i => i.is_estimated && i.calc === 'input' && i.amount_thousand !== null && i.amount_thousand > 0,
  );
  const current_est_sum = est_items.reduce((s, i) => s + i.amount_thousand, 0);

  const fixed_tdc = fixed_input_sum + land_interest + derived_gdv_sum + construction_interest;
  const needed_from_est = target_tdc - fixed_tdc;
  const scale_factor = current_est_sum > 0 ? needed_from_est / current_est_sum : 1;

  // Apply scale in-place — calibrated values replace raw seeds
  est_items.forEach(item => {
    item.amount_thousand = item.amount_thousand * scale_factor;
  });

  // Record results for reporting (Test 9 in reconciliation.js reads this)
  baseline._calibration = {
    target_margin_pct,
    scale_factor: Math.round(scale_factor * 100) / 100,
    net_gdv_thousand: Math.round(net_gdv),
    target_tdc_thousand: Math.round(target_tdc),
    fixed_tdc_thousand: Math.round(fixed_tdc),
    est_seed_sum_thousand: Math.round(current_est_sum),
    est_calibrated_sum_thousand: Math.round(needed_from_est),
  };

  return scale_factor;
}

// Node.js compatibility
if (typeof module !== 'undefined') {
  module.exports = {
    applyLevers,
    calculateGDV,
    expandCostItems,
    calculateKPIs,
    calibrateEstimatedCosts,
  };
}
