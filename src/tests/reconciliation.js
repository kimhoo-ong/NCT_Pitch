#!/usr/bin/env node
// reconciliation.js — verifies simulator baseline after calibration
// Run: node src/tests/reconciliation.js
// Used by build.sh: exits non-zero on failure to block the build.

'use strict';

const { BASELINE_DATA, ZERO_LEVERS, TARGET_NET_MARGIN_PCT } = require('../data/baseline.js');
const { calculateKPIs, calculateGDV, calibrateEstimatedCosts } = require('../lib/calculations.js');

// Apply calibration (same as data-loader.js does at runtime)
calibrateEstimatedCosts(BASELINE_DATA, TARGET_NET_MARGIN_PCT);

// ─── Reconciliation targets ───────────────────────────────────────────────────
//
// GDV targets: EXACT from client's Std_Feasi_Sample__ENG.xls Sales Summary sheet.
//   gross = 1,619,690,065 → 1,619,690 thousand
//   net   = gross × (1 - 0.23) = 1,247,161,350 → 1,247,161 thousand
//
// TDC / Margin: margin-based (we calibrate to 20%; TDC is indicative).
//   Tolerance ±0.5pp on margin after calibration.
const RECONCILIATION_TARGETS = {
  gross_gdv_thousand: 1619690,
  net_gdv_thousand:   1247161,
  gdv_tolerance_thousand: 100,

  margin_pct_target: TARGET_NET_MARGIN_PCT,
  margin_pct_tolerance: 0.5,

  tdc_vs_leaves_tolerance: 0.01,  // floating-point only

  selling_price_plus_10_min_profit_lift_pct: 30,
  construction_minus_10_min_profit_lift_pct: 20,

  no_negative_gdv_at_extremes: true,
  no_nan_at_extremes: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return n === null || n === undefined ? 'null' : Math.round(n).toLocaleString();
}

function fmtPct(n) {
  return n === null || n === undefined ? 'null' : n.toFixed(2) + '%';
}

function check(label, actual, expected, tolerance, isPercent) {
  const diff = Math.abs(actual - expected);
  const pass = diff <= tolerance;
  const sym = pass ? '✓' : '✗';
  if (isPercent) {
    console.log(`  ${sym} ${label}: actual=${fmtPct(actual)}  expected=${fmtPct(expected)}  diff=${fmtPct(diff)}  tol=±${fmtPct(tolerance)}`);
  } else {
    console.log(`  ${sym} ${label}: actual=${fmt(actual)}  expected=${fmt(expected)}  diff=${fmt(diff)}  tol=±${fmt(tolerance)}`);
  }
  return pass;
}

// ─── Test 1: GDV reconciliation (exact — real source data) ───────────────────

function testGDV() {
  console.log('\n=== TEST 1: GDV Reconciliation (exact vs Std_Feasi_Sample__ENG.xls) ===');
  const { gross_gdv_thousand, net_gdv_thousand } = calculateGDV(BASELINE_DATA);
  const tol = RECONCILIATION_TARGETS.gdv_tolerance_thousand;

  const r1 = check('Gross GDV (RM\'000)', gross_gdv_thousand, RECONCILIATION_TARGETS.gross_gdv_thousand, tol, false);
  const r2 = check('Net GDV   (RM\'000)', net_gdv_thousand,   RECONCILIATION_TARGETS.net_gdv_thousand,   tol, false);

  return r1 && r2;
}

// ─── Test 2: Margin after calibration ────────────────────────────────────────

function testMargin() {
  console.log('\n=== TEST 2: Margin After Calibration ===');
  const kpis = calculateKPIs(BASELINE_DATA, ZERO_LEVERS);
  const tol = RECONCILIATION_TARGETS.margin_pct_tolerance;

  console.log(`  Net GDV: RM ${fmt(kpis.gdv_thousand)}K`);
  console.log(`  TDC:     RM ${fmt(kpis.tdc_thousand)}K  (indicative)`);
  console.log(`  Profit:  RM ${fmt(kpis.net_profit_thousand)}K`);

  return check('Margin %', kpis.margin_pct, RECONCILIATION_TARGETS.margin_pct_target, tol, true);
}

// ─── Test 3: Internal consistency — leaf sum === TDC ─────────────────────────

function testCostDetailConsistency() {
  console.log('\n=== TEST 3: Cost Detail Internal Consistency (leaf sum === TDC) ===');
  const kpis = calculateKPIs(BASELINE_DATA, ZERO_LEVERS);
  const { cost_detail } = kpis;

  const leafSum = cost_detail
    .filter(i => i.row_role !== 'header' && i.calc !== 'rollup' && i.adjusted_amount_thousand !== null)
    .reduce((s, i) => s + i.adjusted_amount_thousand, 0);

  const diff = Math.abs(leafSum - kpis.tdc_thousand);
  const pass = diff < RECONCILIATION_TARGETS.tdc_vs_leaves_tolerance;
  console.log(`  ${pass ? '✓' : '✗'} leaf sum (${fmt(leafSum)}) === TDC (${fmt(kpis.tdc_thousand)})  diff=${diff.toFixed(6)}`);
  return pass;
}

// ─── Test 4: Rollup aggregates match children ─────────────────────────────────

function testRollupAggregates() {
  console.log('\n=== TEST 4: Rollup Aggregate Consistency ===');
  const kpis = calculateKPIs(BASELINE_DATA, ZERO_LEVERS);
  const { cost_detail } = kpis;

  const rollups = cost_detail.filter(i => i.calc === 'rollup');
  let allPass = true;

  for (const agg of rollups) {
    const children = cost_detail.filter(c => c.parent === agg.item_no && c.calc !== 'rollup');
    const childSum = children.reduce((s, c) => s + (c.adjusted_amount_thousand ?? 0), 0);
    const diff = Math.abs(childSum - (agg.adjusted_amount_thousand ?? 0));
    const pass = diff < 0.01;
    if (!pass) allPass = false;
    console.log(`  ${pass ? '✓' : '✗'} ${agg.item_no} (${agg.label}): sum_children=${fmt(childSum)}  aggregate=${fmt(agg.adjusted_amount_thousand)}`);
  }
  return allPass;
}

// ─── Test 5: Sensitivity smoke tests ─────────────────────────────────────────

function testSensitivity() {
  console.log('\n=== TEST 5: Sensitivity Smoke Tests ===');
  const base = calculateKPIs(BASELINE_DATA, ZERO_LEVERS);
  let allPass = true;

  // SP +10%
  const sp10 = calculateKPIs(BASELINE_DATA, { ...ZERO_LEVERS, selling_price: 10 });
  const sp10Lift = ((sp10.net_profit_thousand - base.net_profit_thousand) / base.net_profit_thousand) * 100;
  const sp10Pass = sp10Lift >= RECONCILIATION_TARGETS.selling_price_plus_10_min_profit_lift_pct;
  if (!sp10Pass) allPass = false;
  console.log(`  ${sp10Pass ? '✓' : '✗'} SP +10% → profit lift: ${sp10Lift.toFixed(1)}%  (min: ${RECONCILIATION_TARGETS.selling_price_plus_10_min_profit_lift_pct}%)`);

  // Construction -10%
  const cc10 = calculateKPIs(BASELINE_DATA, { ...ZERO_LEVERS, construction_cost: -10 });
  const cc10Lift = ((cc10.net_profit_thousand - base.net_profit_thousand) / base.net_profit_thousand) * 100;
  const cc10Pass = cc10Lift >= RECONCILIATION_TARGETS.construction_minus_10_min_profit_lift_pct;
  if (!cc10Pass) allPass = false;
  console.log(`  ${cc10Pass ? '✓' : '✗'} Const -10% → profit lift: ${cc10Lift.toFixed(1)}%  (min: ${RECONCILIATION_TARGETS.construction_minus_10_min_profit_lift_pct}%)`);

  // Lever 5 (+1pp) → both advertising and agent commission increase by 0.5pp each
  const l5 = calculateKPIs(BASELINE_DATA, { ...ZERO_LEVERS, ap_commission: 1 });
  const l5GdvSame = Math.abs(l5.gdv_thousand - base.gdv_thousand) < 1;
  const l5TdcUp = l5.tdc_thousand > base.tdc_thousand;
  const l5Pass = l5GdvSame && l5TdcUp;
  if (!l5Pass) allPass = false;
  console.log(`  ${l5Pass ? '✓' : '✗'} Lever 5 +1pp → GDV unchanged (${l5GdvSame}), TDC up (${l5TdcUp})`);

  // Lever 6 (+1pp) → bumi contribution increases (TDC up, GDV unchanged)
  const l6 = calculateKPIs(BASELINE_DATA, { ...ZERO_LEVERS, bumi_discount: 1 });
  const l6GdvSame = Math.abs(l6.gdv_thousand - base.gdv_thousand) < 1;
  const l6TdcUp = l6.tdc_thousand > base.tdc_thousand;
  const l6Pass = l6GdvSame && l6TdcUp;
  if (!l6Pass) allPass = false;
  console.log(`  ${l6Pass ? '✓' : '✗'} Lever 6 +1pp → GDV unchanged (${l6GdvSame}), TDC up (${l6TdcUp})`);

  return allPass;
}

// ─── Test 6: Boundary / no NaN ───────────────────────────────────────────────

function testBoundaries() {
  console.log('\n=== TEST 6: Boundary / No NaN ===');
  const extremeLow  = { selling_price: -20, construction_cost: -15, sales_period: -25, interest_rate: -2, ap_commission: -1, bumi_discount: -2 };
  const extremeHigh = { selling_price: 20,  construction_cost: 25,  sales_period: 50,  interest_rate: 3,  ap_commission: 3,  bumi_discount: 5  };

  let allPass = true;
  for (const [label, levers] of [['extreme low', extremeLow], ['extreme high', extremeHigh]]) {
    const kpis = calculateKPIs(BASELINE_DATA, levers);
    const hasNaN = isNaN(kpis.gdv_thousand) || isNaN(kpis.tdc_thousand) || isNaN(kpis.net_profit_thousand) || isNaN(kpis.margin_pct);
    const hasNegGDV = kpis.gdv_thousand < 0;
    const pass = !hasNaN && !hasNegGDV;
    if (!pass) allPass = false;
    console.log(`  ${pass ? '✓' : '✗'} ${label}: GDV=${fmt(kpis.gdv_thousand)}  TDC=${fmt(kpis.tdc_thousand)}  profit=${fmt(kpis.net_profit_thousand)}  margin=${fmtPct(kpis.margin_pct)}`);
  }
  return allPass;
}

// ─── Test 7: Calibration report ──────────────────────────────────────────────

function reportCalibration() {
  console.log('\n=== CALIBRATION REPORT ===');
  const cal = BASELINE_DATA._calibration;
  if (!cal) {
    console.log('  ✗ _calibration not set on BASELINE_DATA');
    return false;
  }
  console.log(`  Target margin:         ${cal.target_margin_pct}%`);
  console.log(`  Scale factor applied:  ${cal.scale_factor.toFixed(4)}x  (to all is_estimated items with seed > 0)`);
  console.log(`  Net GDV:               RM ${fmt(cal.net_gdv_thousand)}K`);
  console.log(`  Target TDC:            RM ${fmt(cal.target_tdc_thousand)}K`);
  console.log(`  Fixed TDC (real+deriv):RM ${fmt(cal.fixed_tdc_thousand)}K`);
  console.log(`  [EST] seed total:      RM ${fmt(cal.est_seed_sum_thousand)}K`);
  console.log(`  [EST] calibrated total:RM ${fmt(cal.est_calibrated_sum_thousand)}K`);

  // Print calibrated EST items for Kim's review
  console.log('\n  Calibrated [EST] items:');
  BASELINE_DATA.cost_items
    .filter(i => i.is_estimated && i.calc === 'input' && i.amount_thousand > 0)
    .sort((a, b) => parseFloat(a.item_no) - parseFloat(b.item_no))
    .forEach(i => console.log(`    ${i.item_no.padEnd(6)} ${i.label.padEnd(38)} RM ${fmt(i.amount_thousand)}K`));

  return true;
}

// ─── Run all ──────────────────────────────────────────────────────────────────

function runAll() {
  console.log('NCT Feasibility Simulator — Reconciliation Tests');
  console.log(`Baseline: ${BASELINE_DATA.meta.project_name} ${BASELINE_DATA.meta.baseline_version}`);
  console.log(`Run at:   ${new Date().toISOString()}`);

  const t1 = testGDV();
  const t2 = testMargin();
  const t3 = testCostDetailConsistency();
  const t4 = testRollupAggregates();
  const t5 = testSensitivity();
  const t6 = testBoundaries();
  reportCalibration();

  const allPass = t1 && t2 && t3 && t4 && t5 && t6;

  console.log('\n─────────────────────────────────────────────────');
  if (allPass) {
    console.log('RESULT: ALL TESTS PASSED');
  } else {
    console.log('RESULT: ONE OR MORE TESTS FAILED');
    if (!t1) console.log('  → GDV mismatch: check sales data in baseline.js');
    if (!t2) console.log('  → Margin off target: check calibration or derived_params');
    if (!t3) console.log('  → Internal inconsistency: leaf sum ≠ TDC');
  }
  console.log('─────────────────────────────────────────────────\n');

  process.exit(allPass ? 0 : 1);
}

runAll();
