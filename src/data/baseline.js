// BASELINE_DATA — Emira Shah Alam, Parcel 1, Phase 1
// Source: NCT Group Std_Feasi_Sample__ENG.xls (Sales Summary + Cost per SF sheets)
// All monetary amounts: RM thousands. All percentages: plain numbers (4.8 = 4.8%).
//
// Data provenance is flagged on each cost item:
//   is_estimated: false  — value from client Excel (treat as real)
//   is_estimated: true   — industry-benchmark estimate pending QS confirmation
//
// calibrateEstimatedCosts() is called by data-loader.js after calculations.js loads.
// It scales all is_estimated items by a uniform factor to hit TARGET_NET_MARGIN_PCT.
// The calibration factor and resulting KPIs are stored in BASELINE_DATA._calibration.

const TARGET_NET_MARGIN_PCT = 20;  // Industry-typical for Malaysian residential

const BASELINE_DATA = {
  meta: {
    project_id: 'EMIRA01',
    project_name: 'Emira Shah Alam',
    developer: 'Ribuan Ekuiti Sdn Bhd',
    parcel: 'Parcel 1',
    phase: 'PH 1',
    cost_status: 'Feasibility — Indicative',
    baseline_version: 'v1.1',
    refreshed_at: '2026-05-21',
    currency: 'RM',
    display_unit: 'thousand',
    tdc_label: 'Indicative — pending client validation',
  },

  // ── Sales mix ───────────────────────────────────────────────────────────────
  // Source: Sales Summary sheet rows 4, 19, 34
  // Units are fractional (direct from client Excel — keep as-is)
  // discount_stack: FOUR fields, 23% total applied uniformly across ALL unit types
  // Bumi is NOT a per-unit discount — it is cost item 20 (derived_pct_gdv) on TDC side
  sales: [
    {
      unit_type_code: 'HR1-T1',
      property_category: 'Residential',
      product_name: 'Residential Type 1',
      no_of_units: 2613.6,
      built_up_sf: 800,
      selling_price_per_sf: 650,
      discount_stack: {
        early_bird_pct: 5,
        staff_pct: 5,
        promotion_pct: 10,
        others_pct: 3,
      },
    },
    {
      unit_type_code: 'RETAIL',
      property_category: 'Retail',
      product_name: 'Retail Type 1',
      no_of_units: 209.088,
      built_up_sf: 1000,
      selling_price_per_sf: 1200,
      discount_stack: {
        early_bird_pct: 5,
        staff_pct: 5,
        promotion_pct: 10,
        others_pct: 3,
      },
    },
    {
      unit_type_code: 'CARPARK',
      property_category: 'Car Park',
      product_name: 'Car Park Type 1',
      no_of_units: 97.124648,
      built_up_sf: 100,
      selling_price_per_sf: 1000,
      discount_stack: {
        early_bird_pct: 5,
        staff_pct: 5,
        promotion_pct: 10,
        others_pct: 3,
      },
    },
  ],

  // ── Cost tree (full F_L2 structure, items 4–X) ───────────────────────────────
  // row_role: 'header' | 'aggregate' | 'leaf'
  // calc:     'input' | 'rollup' | 'derived_pct_gdv' | 'derived_interest'
  //
  // Items 11–15 are structural placeholders (0, no lever effect).
  // [EST] items with amount_thousand === 0 get a non-zero seed before calibration
  // so the calibration multiplier can move them. Seeds are industry benchmarks for a
  // ~890k SF GFA mixed-development project in Selangor.
  cost_items: [
    // ── Item 4: Land ──────────────────────────────────────────────────────────
    { item_no: '4',     parent: null,  level: 1, row_role: 'header',    label: 'TOTAL LAND PURCHASE COST',        amount_thousand: null,   calc: null,               is_estimated: false },
    // 4.1 REAL: R5 in Project Summary: residential 65,340 + commercial 6,534 + carpark 217.8 = 72,091.8 → 72,092
    { item_no: '4.1',   parent: '4',   level: 2, row_role: 'leaf',      label: 'Original Land Purchase Cost',     amount_thousand: 72092,  calc: 'input',            is_estimated: false },
    { item_no: '4.2',   parent: '4',   level: 2, row_role: 'leaf',      label: 'Incidental Land Purchase Cost',   amount_thousand: 1000,   calc: 'input',            is_estimated: true },
    // 4.3 DERIVED: interest on total land inputs × rate × (dev_period/12) × 0.5
    // Lever 4 (interest_rate) affects this.
    { item_no: '4.3',   parent: '4',   level: 2, row_role: 'leaf',      label: 'Land Holding Interest',           amount_thousand: null,   calc: 'derived_interest', is_estimated: false, base: 'land_input_total' },
    { item_no: '4.4',   parent: '4',   level: 2, row_role: 'leaf',      label: 'Conversion Premium',              amount_thousand: 500,    calc: 'input',            is_estimated: true },
    { item_no: '4.5',   parent: '4',   level: 2, row_role: 'leaf',      label: 'Lease Extension',                 amount_thousand: 200,    calc: 'input',            is_estimated: true },
    { item_no: '4.6',   parent: '4',   level: 2, row_role: 'leaf',      label: 'Stamp Duty + Legal',              amount_thousand: 1500,   calc: 'input',            is_estimated: true },

    // ── Item 5: Construction ─────────────────────────────────────────────────
    // REAL total: RM 110,325k from Cost per SF sheet (awarded construction packages only)
    // [EST] items below represent additional construction elements not in the awarded packages.
    // All 5.x items scale proportionally when lever 2 moves (construction_scale factor).
    { item_no: '5',     parent: null,  level: 1, row_role: 'header',    label: 'TOTAL CONSTRUCTION COST',         amount_thousand: null,   calc: null,               is_estimated: false },
    // 5.1 REAL: Earthwork & Hoarding from Cost per SF (729,881 + 11,520 VO = 741,401)
    { item_no: '5.1',   parent: '5',   level: 2, row_role: 'leaf',      label: 'Earthwork & Site Clearance',      amount_thousand: 741,    calc: 'input',            is_estimated: false },
    { item_no: '5.2',   parent: '5',   level: 2, row_role: 'aggregate', label: 'Sub-Structural',                  amount_thousand: null,   calc: 'rollup',           is_estimated: false },
    // 5.2.1 REAL: Piling + Pilecap + Starter Bar = 5,200,000 + 132,571 VO = 5,332,571
    { item_no: '5.2.1', parent: '5.2', level: 3, row_role: 'leaf',      label: 'Piling, Pilecap & Starter Bar',   amount_thousand: 5333,   calc: 'input',            is_estimated: false },
    { item_no: '5.2.2', parent: '5.2', level: 3, row_role: 'leaf',      label: 'Retaining Wall',                  amount_thousand: 500,    calc: 'input',            is_estimated: true },
    // 5.3 REAL: Main Building Works = 107,500,000 - 3,263,339 VO = 104,236,661
    { item_no: '5.3',   parent: '5',   level: 2, row_role: 'leaf',      label: 'Main Building Works',             amount_thousand: 104237, calc: 'input',            is_estimated: false },
    { item_no: '5.4',   parent: '5',   level: 2, row_role: 'leaf',      label: 'Interior Design',                 amount_thousand: 0,      calc: 'input',            is_estimated: true },
    // 5.5–5.11: seeded with industry-benchmark values so calibration can scale them.
    // Actual values are the calibrated results, not these raw seeds.
    { item_no: '5.5',   parent: '5',   level: 2, row_role: 'leaf',      label: 'Landscaping Works',               amount_thousand: 4000,   calc: 'input',            is_estimated: true },
    { item_no: '5.6',   parent: '5',   level: 2, row_role: 'leaf',      label: 'Infrastructure Works',            amount_thousand: 10000,  calc: 'input',            is_estimated: true },
    { item_no: '5.7',   parent: '5',   level: 2, row_role: 'leaf',      label: 'Miscellaneous',                   amount_thousand: 2000,   calc: 'input',            is_estimated: true },
    { item_no: '5.8',   parent: '5',   level: 2, row_role: 'leaf',      label: 'Show Unit',                       amount_thousand: 2000,   calc: 'input',            is_estimated: true },
    { item_no: '5.9',   parent: '5',   level: 2, row_role: 'leaf',      label: 'Preliminaries',                   amount_thousand: 10000,  calc: 'input',            is_estimated: true },
    { item_no: '5.10',  parent: '5',   level: 2, row_role: 'leaf',      label: 'Project Contingency',             amount_thousand: 5500,   calc: 'input',            is_estimated: true },
    { item_no: '5.11',  parent: '5',   level: 2, row_role: 'leaf',      label: 'Mechanical & Engineering',        amount_thousand: 11000,  calc: 'input',            is_estimated: true },

    // ── Item 6: Professional Fees ────────────────────────────────────────────
    { item_no: '6',     parent: null,  level: 1, row_role: 'header',    label: 'PROFESSIONAL FEES',               amount_thousand: null,   calc: null,               is_estimated: false },
    { item_no: '6.1',   parent: '6',   level: 2, row_role: 'leaf',      label: 'Architect',                       amount_thousand: 3500,   calc: 'input',            is_estimated: true },
    { item_no: '6.2',   parent: '6',   level: 2, row_role: 'leaf',      label: 'Quantity Surveyor',               amount_thousand: 1200,   calc: 'input',            is_estimated: true },
    { item_no: '6.3',   parent: '6',   level: 2, row_role: 'leaf',      label: 'C&S Engineer',                    amount_thousand: 1500,   calc: 'input',            is_estimated: true },
    { item_no: '6.4',   parent: '6',   level: 2, row_role: 'leaf',      label: 'M&E Engineer',                    amount_thousand: 1100,   calc: 'input',            is_estimated: true },
    { item_no: '6.5',   parent: '6',   level: 2, row_role: 'leaf',      label: 'ID Consultant',                   amount_thousand: 800,    calc: 'input',            is_estimated: true },
    // 6.6 REAL: Soil Investigation from Cost per SF (19,990 - 5,885 VO = 14,105)
    { item_no: '6.6',   parent: '6',   level: 2, row_role: 'leaf',      label: 'Soil Investigation',              amount_thousand: 14,     calc: 'input',            is_estimated: false },
    { item_no: '6.7',   parent: '6',   level: 2, row_role: 'leaf',      label: 'Planner',                         amount_thousand: 400,    calc: 'input',            is_estimated: true },

    // ── Item 7: Authority Contribution ──────────────────────────────────────
    { item_no: '7',     parent: null,  level: 1, row_role: 'header',    label: 'AUTHORITY CONTRIBUTION',          amount_thousand: null,   calc: null,               is_estimated: false },
    { item_no: '7.1',   parent: '7',   level: 2, row_role: 'leaf',      label: 'TNB Contribution',                amount_thousand: 1200,   calc: 'input',            is_estimated: true },
    { item_no: '7.2',   parent: '7',   level: 2, row_role: 'leaf',      label: 'Syabas Contribution',             amount_thousand: 800,    calc: 'input',            is_estimated: true },
    { item_no: '7.3',   parent: '7',   level: 2, row_role: 'leaf',      label: 'IWK Contribution',                amount_thousand: 600,    calc: 'input',            is_estimated: true },
    { item_no: '7.4',   parent: '7',   level: 2, row_role: 'leaf',      label: 'Bomba Contribution',              amount_thousand: 300,    calc: 'input',            is_estimated: true },
    { item_no: '7.5',   parent: '7',   level: 2, row_role: 'leaf',      label: 'Telekom + Others',                amount_thousand: 300,    calc: 'input',            is_estimated: true },
    { item_no: '7.6',   parent: '7',   level: 2, row_role: 'leaf',      label: 'Road & Drain Contribution',       amount_thousand: 1000,   calc: 'input',            is_estimated: true },

    // ── Items 8–16: Various direct costs ────────────────────────────────────
    { item_no: '8',     parent: null,  level: 1, row_role: 'leaf',      label: 'Plan Submission Fees',            amount_thousand: 300,    calc: 'input',            is_estimated: true },
    { item_no: '9',     parent: null,  level: 1, row_role: 'leaf',      label: 'Plan, Survey & Strata Title',     amount_thousand: 500,    calc: 'input',            is_estimated: true },
    // 10 REAL: Assumption R25 from client Excel = 2,247 thousand (1.5% of construction est.)
    { item_no: '10',    parent: null,  level: 1, row_role: 'leaf',      label: 'Project Management Fees',         amount_thousand: 2247,   calc: 'input',            is_estimated: false },
    { item_no: '11',    parent: null,  level: 1, row_role: 'leaf',      label: 'Others 1',                        amount_thousand: 0,      calc: 'input',            is_estimated: true },
    { item_no: '12',    parent: null,  level: 1, row_role: 'leaf',      label: 'Others 2',                        amount_thousand: 0,      calc: 'input',            is_estimated: true },
    { item_no: '13',    parent: null,  level: 1, row_role: 'leaf',      label: 'Others 3',                        amount_thousand: 0,      calc: 'input',            is_estimated: true },
    { item_no: '14',    parent: null,  level: 1, row_role: 'leaf',      label: 'Others 4',                        amount_thousand: 0,      calc: 'input',            is_estimated: true },
    { item_no: '15',    parent: null,  level: 1, row_role: 'leaf',      label: 'GST Provision',                   amount_thousand: 0,      calc: 'input',            is_estimated: false },
    { item_no: '16',    parent: null,  level: 1, row_role: 'leaf',      label: 'Development Contingency',         amount_thousand: 3000,   calc: 'input',            is_estimated: true },

    // ── Items 17–21: Sales & Marketing ──────────────────────────────────────
    { item_no: '17',    parent: null,  level: 1, row_role: 'header',    label: 'SALES & MARKETING',               amount_thousand: null,   calc: null,               is_estimated: false },
    // 17.1 + 18: lever 5 splits its delta pp between these two pcts (+0.5pp each per +1pp lever)
    { item_no: '17.1',  parent: '17',  level: 2, row_role: 'leaf',      label: 'Advertising & Promotion',         amount_thousand: null,   calc: 'derived_pct_gdv',  is_estimated: false, pct: 'advertising_promotion_pct_of_gdv' },
    { item_no: '18',    parent: null,  level: 1, row_role: 'leaf',      label: 'Agent Commission',                amount_thousand: null,   calc: 'derived_pct_gdv',  is_estimated: false, pct: 'agent_commission_pct_of_gdv' },
    { item_no: '19',    parent: null,  level: 1, row_role: 'leaf',      label: 'Sales Gallery',                   amount_thousand: 1500,   calc: 'input',            is_estimated: true },
    // 20: lever 6 adjusts bumi_contribution_pct_of_gdv (additive pp)
    { item_no: '20',    parent: null,  level: 1, row_role: 'leaf',      label: 'Bumi Contribution',               amount_thousand: null,   calc: 'derived_pct_gdv',  is_estimated: false, pct: 'bumi_contribution_pct_of_gdv' },
    // 21 REAL: Assumption R29-R30: 3% for GDV < RM250M; 2% for ≥RM250M
    { item_no: '21',    parent: null,  level: 1, row_role: 'leaf',      label: 'Administration Fees',             amount_thousand: null,   calc: 'derived_pct_gdv',  is_estimated: false, pct: 'admin_fees_pct_of_gdv' },

    // ── Item X: Construction Interest (virtual — shows finance cost for transparency) ──
    // Formula: construction_total × bank_borrowing_pct × interest_rate × (sales_period/12) × 0.5
    // Lever 3 (sales_period) and Lever 4 (interest_rate) affect this.
    // Simplified: assumes linear drawdown; real model needs monthly amortization (v1.x TODO).
    { item_no: 'X',     parent: null,  level: 1, row_role: 'leaf',      label: 'Construction Interest',           amount_thousand: null,   calc: 'derived_interest', is_estimated: false, base: 'construction_borrowing' },
  ],

  // ── Derived item coefficients ────────────────────────────────────────────────
  // REAL values from client Excel; [EST] values are industry estimates.
  derived_params: {
    // Construction (REAL from Cost per SF sheet)
    construction_total_gfa_sf: 890260,
    construction_cost_per_sf_gfa: 123.92,   // lever 2 multiplies this
    total_nfa_sf: 420530,
    cost_per_sf_nfa: 262.35,                 // informational only

    // S&M percentages of net GDV:
    // lever 5 (+pp) splits its delta equally between advertising and commission (+0.5pp each)
    advertising_promotion_pct_of_gdv: 2.0,  // lever 5 adds delta/2
    agent_commission_pct_of_gdv: 2.5,       // lever 5 adds delta/2
    bumi_contribution_pct_of_gdv: 2.0,      // lever 6 adds delta (full pp)
    // REAL: Assumption R29-R30 from client Excel (3% for this project scale)
    admin_fees_pct_of_gdv: 3.0,
  },

  // ── Financing assumptions ────────────────────────────────────────────────────
  financing: {
    bank_borrowing_pct: 75,
    equity_pct: 25,
    interest_rate_pct: 4.8,                // lever 4 adds delta (pp)
    development_period_months: 36,
    sales_period_months: 24,               // lever 3 multiplies this
  },

  // ── Project-level (informational) ───────────────────────────────────────────
  project: {
    plot_ratio: 6.0,
    efficiency_nfa_over_gfa_pct: 80,
  },

  // Populated by calibrateEstimatedCosts() in calculations.js — do not edit manually.
  _calibration: null,
};

// All levers at zero — baseline scenario
const ZERO_LEVERS = {
  selling_price: 0,      // % multiplier (lever 1)
  construction_cost: 0,  // % multiplier (lever 2)
  sales_period: 0,       // % multiplier (lever 3)
  interest_rate: 0,      // pp additive  (lever 4)
  ap_commission: 0,      // pp additive  (lever 5) — splits between advertising + agent
  bumi_discount: 0,      // pp additive  (lever 6) — adjusts bumi_contribution_pct
};

// Node.js compatibility
if (typeof module !== 'undefined') {
  module.exports = { BASELINE_DATA, ZERO_LEVERS, TARGET_NET_MARGIN_PCT };
}
