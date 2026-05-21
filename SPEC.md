# NCT Feasibility Simulator — Specification

> Single-file HTML what-if simulator for NCT Group. Sits alongside the Fabric + Power BI platform as an exploratory tool for CEO/CFO/IC meetings. Live calculation, zero network dependency, double-click to open. Two tabs: a clean **Simulator** view for executives, and a read-only **Cost Detail** view that mirrors the client's F_L2 sheet line-by-line.

---

## 1. Purpose & Scope

### What this is
A **browser-based what-if calculator** for NCT property feasibility studies. CFO/IC adjust 6 strategic levers, see GDV / TDC / Net Profit / Margin recalculate live. A second tab shows the full F_L2 cost report (read-only) so QS/Finance in the room can see exactly which cost items moved and by how much. Users export a Scenario Report (CSV + JSON) and hand it to QS to execute against Excel.

### What this is NOT
- Not a replacement for the Fabric pipeline (that's the source of truth)
- Not a data entry tool (users still upload Excel to SharePoint for official records)
- Not connected to any backend in v1 (all data is static-embedded)
- **Not editable** — the F_L2 cost detail tab is read-only; users see the impact of lever changes, they cannot edit individual cost items in v1

### The decision loop this enables

1. CFO/IC opens simulator in a meeting
2. Adjusts the 6 levers, sees KPI impact
3. Switches to Cost Detail tab → sees which specific cost items moved (e.g., "5.2.1 Piling: 5,186 → 5,031, -3%")
4. Likes the scenario → exports CSV + JSON
5. CSV becomes the **executable instruction list** for QS/Finance
6. QS/Finance edit the source Excel, upload to SharePoint, Fabric Pipeline runs
7. Next IC meeting: simulator's baseline reflects the new reality

---

## 2. Architecture Principles

### P1 — Single HTML file, zero dependencies
- One `.html` file with all CSS, JS, data embedded
- No external CDN, no fonts from Google, no npm packages at runtime
- Double-click in any browser, works offline
- File hosted on SharePoint document library

### P2 — Pluggable data loader
Hardcoded baseline today, but the code must isolate it behind a single async function so future versions can swap in Fabric REST or SharePoint JSON without touching UI or calculation code.

```javascript
async function loadBaseline() {
  return BASELINE_DATA;  // v1: embedded constant
  // v2: return await fetch('./baseline.json').then(r => r.json());
  // v3: return await fetchFromFabric(token);
}
```

### P3 — Calculation logic is single-source-of-truth-ready
All formulas must be pure functions taking `(baseline, levers)` and returning `{kpis, costDetail}`. This same logic will eventually be ported to Fabric UDF (or validated against Fabric DAX via reconciliation). Keep formulas readable.

### P4 — No side effects in v1
- No localStorage write (planned for v1.2)
- No fetch (planned for v1.5)
- No analytics tracking
- No external scripts

### P5 — Print-friendly
CFO might print the Scenario Report. Both tabs must have a sensible print stylesheet for A4 landscape.

---

## 3. The 6 Levers

| # | Lever | Type | Range | Default | Step | Display | What it changes |
|---|---|---|---|---|---|---|---|
| 1 | **Selling Price** | multiplier | -20% to +20% | 0% | 1% | % | × baseline `selling_price_per_sf` |
| 2 | **Construction Cost** | multiplier | -15% to +25% | 0% | 1% | % | × baseline `construction_cost_per_sf_gfa` |
| 3 | **Sales Period** | multiplier | -25% to +50% | 0% | 5% | % | × baseline `sales_period_months` |
| 4 | **Interest Rate** | additive | -2pp to +3pp | 0pp | 0.1pp | pp | + baseline `interest_rate_pct` |
| 5 | **A&P + Commission** | additive | -1pp to +3pp | 0pp | 0.1pp | pp | + baseline `ap_commission_pct_of_gdv` |
| 6 | **Bumi Discount** | additive | -2pp to +5pp | 0pp | 0.1pp | pp | + baseline `bumi_pct` (per residential unit type) |

### Why levers 1-3 are multipliers and 4-6 are additive
Levers 1-3 act on absolute quantities (RM/SF, months), so a "%" adjustment is natural ("price +5%").
Levers 4-6 act on values that are *already* percentages (interest rate, A&P, Bumi). Multiplying them is confusing ("does +10% on 4.8% mean 5.28% or 14.8%?"). Additive percentage-points (`pp`) is unambiguous.

### Lever UX
- Numeric input + slider on same row
- Below each lever: current delta (`+5%` or `+0.5pp`) and resulting absolute value (`→ RM 682.50/SF`)
- Color tint at left edge: gold if favorable to margin, red if unfavorable, neutral if zero
- Reset all button always visible

---

## 4. The 4 KPIs (v1)

| KPI | Formula | Display | Notes |
|---|---|---|---|
| **GDV (Net)** | `Σ(units × built_up × price × adj_price) × (1 - total_discount)` | `RM 1,611M` | Net Gross Development Value after discount stack |
| **TDC** | `LandCost + ConstCost(adj) + ProfFees + Authority + Soft + Marketing(adj) + Interest(adj)` | `RM 1,247M` | Total Development Cost, all-in |
| **Net Profit** | `GDV - TDC` | `RM 364M` | Absolute net profit |
| **Margin %** | `Net Profit / GDV × 100` | `22.6%` | ≥20% gold tint, 15-20% neutral, <15% red |

### KPI display rules
- Show delta vs baseline: `RM 364M (+RM 14M)` or `22.6% (+1.2pp)`
- Baseline value small underneath: `Baseline: RM 350M`
- Smooth count-up animation on change (handwritten, no library)

### Reserved for v1.x (in code as `// TODO v1.x`)
- Cost per SF (GFA / NFA)
- Funding Gap timeline mini-chart
- Bear / Base / Bull preset buttons
- Sensitivity tornado

---

## 5. Baseline Data Schema

Embedded as a top-level `BASELINE_DATA` constant. Includes the full cost item tree (needed for the Cost Detail tab).

```javascript
const BASELINE_DATA = {
  meta: {
    project_id: "EMIRA01",
    project_name: "Emira Shah Alam",
    developer: "Ribuan Ekuiti Sdn Bhd",
    parcel: "Parcel 1",
    phase: "PH 1",
    cost_status: "Feasibility",
    baseline_version: "v1.0",
    refreshed_at: "2026-05-21",
    currency: "RM",
    display_unit: "thousand"  // amounts shown in '000
  },

  // Sales side — array of unit types
  sales: [
    {
      unit_type_code: "HR1-T1",
      property_category: "Residential",
      product_name: "HR1 Type 1 - Standard",
      no_of_units: 2613,
      built_up_sf: 800,
      selling_price_per_sf: 650,
      discount_stack: {
        early_bird_pct: 3,
        promotion_pct: 2,
        staff_pct: 0.5,
        bumi_pct: 7,
        gst_or_sst_pct: 0
      }
    },
    {
      unit_type_code: "HR1-T2",
      property_category: "Residential",
      product_name: "HR1 Type 2 - Premium",
      no_of_units: 500,
      built_up_sf: 1200,
      selling_price_per_sf: 750,
      discount_stack: { early_bird_pct: 3, promotion_pct: 2, staff_pct: 0.5, bumi_pct: 7, gst_or_sst_pct: 0 }
    },
    {
      unit_type_code: "RETAIL",
      property_category: "Retail",
      product_name: "Retail Lots",
      no_of_units: 1,
      built_up_sf: 209167,
      selling_price_per_sf: 1200,
      discount_stack: { early_bird_pct: 0, promotion_pct: 0, staff_pct: 0, bumi_pct: 0, gst_or_sst_pct: 0 }
    },
    {
      unit_type_code: "CARPARK",
      property_category: "Car Park",
      product_name: "Car Park Bays",
      no_of_units: 50,
      built_up_sf: 1,
      selling_price_per_sf: 38000,
      discount_stack: { early_bird_pct: 0, promotion_pct: 0, staff_pct: 0, bumi_pct: 0, gst_or_sst_pct: 0 }
    }
  ],

  // Cost tree — matches client's F_L2 structure (item_no driven, hierarchical via parent_no)
  // row_role: 'header' | 'aggregate' | 'leaf'
  // calc: 'input' (fixed RM amount) | 'derived_pct_gdv' (% of net GDV) | 'derived_interest' (computed)
  cost_items: [
    // Item 4 — Land (Common, fixed inputs)
    { item_no: "4",     parent: null,  level: 1, row_role: "header",    label: "TOTAL LAND PURCHASE COST",  amount_thousand: null,  calc: null },
    { item_no: "4.1",   parent: "4",   level: 2, row_role: "leaf",      label: "Original Land Purchase Cost", amount_thousand: 65340, calc: "input" },
    { item_no: "4.2",   parent: "4",   level: 2, row_role: "leaf",      label: "Incidental Land Costs",       amount_thousand: 1000,  calc: "input" },
    { item_no: "4.3",   parent: "4",   level: 2, row_role: "leaf",      label: "Stamp Duty",                  amount_thousand: 1300,  calc: "input" },
    { item_no: "4.4",   parent: "4",   level: 2, row_role: "leaf",      label: "Land Holding Interest",       amount_thousand: null,  calc: "derived_interest", base: "land_total" },
    { item_no: "4.5",   parent: "4",   level: 2, row_role: "leaf",      label: "Legal Fees",                  amount_thousand: 250,   calc: "input" },
    { item_no: "4.6",   parent: "4",   level: 2, row_role: "leaf",      label: "Legal Disbursement",          amount_thousand: 50,    calc: "input" },
    { item_no: "4.7",   parent: "4",   level: 2, row_role: "leaf",      label: "Quit Rent",                   amount_thousand: 100,   calc: "input" },
    { item_no: "4.8",   parent: "4",   level: 2, row_role: "leaf",      label: "Assessment Rate",             amount_thousand: 80,    calc: "input" },

    // Item 5 — Construction (the lever 2 target)
    { item_no: "5",     parent: null,  level: 1, row_role: "header",    label: "TOTAL CONSTRUCTION COST",     amount_thousand: null,  calc: null },
    { item_no: "5.1",   parent: "5",   level: 2, row_role: "aggregate", label: "Earthwork",                   amount_thousand: 2500,  calc: "input" },
    { item_no: "5.2",   parent: "5",   level: 2, row_role: "aggregate", label: "Sub-Structural",              amount_thousand: null,  calc: "rollup" },
    { item_no: "5.2.1", parent: "5.2", level: 3, row_role: "leaf",      label: "Piling",                      amount_thousand: 5186,  calc: "input" },
    { item_no: "5.2.2", parent: "5.2", level: 3, row_role: "leaf",      label: "Pile Cap",                    amount_thousand: 1500,  calc: "input" },
    { item_no: "5.3",   parent: "5",   level: 2, row_role: "aggregate", label: "Super-Structural (Main)",     amount_thousand: 88146, calc: "input" },
    { item_no: "5.4",   parent: "5",   level: 2, row_role: "leaf",      label: "External Works",              amount_thousand: 7000,  calc: "input" },
    { item_no: "5.5",   parent: "5",   level: 2, row_role: "leaf",      label: "M&E",                         amount_thousand: 6000,  calc: "input" },

    // Item 6-8 — Professional / Authority / Soft (lump sums in v1)
    { item_no: "6",     parent: null,  level: 1, row_role: "leaf",      label: "Professional Fees",           amount_thousand: 5500,  calc: "input" },
    { item_no: "7",     parent: null,  level: 1, row_role: "leaf",      label: "Authority Contribution",      amount_thousand: 3200,  calc: "input" },
    { item_no: "8",     parent: null,  level: 1, row_role: "leaf",      label: "Soft Costs / Contingency",    amount_thousand: 2800,  calc: "input" },

    // Item 17-21 — Sales & Marketing (derived from GDV %)
    { item_no: "17",    parent: null,  level: 1, row_role: "header",    label: "SALES & MARKETING",           amount_thousand: null,  calc: null },
    { item_no: "17.1",  parent: "17",  level: 2, row_role: "leaf",      label: "A&P + Commission",            amount_thousand: null,  calc: "derived_pct_gdv", pct: "ap_commission_pct_of_gdv" },
    { item_no: "17.2",  parent: "17",  level: 2, row_role: "leaf",      label: "Bumi Contribution (lump)",    amount_thousand: 1500,  calc: "input" },
    { item_no: "17.3",  parent: "17",  level: 2, row_role: "leaf",      label: "Admin Fees",                  amount_thousand: null,  calc: "derived_pct_gdv", pct: "admin_fees_pct_of_gdv" },

    // Item 19 — Construction Interest (derived)
    { item_no: "19",    parent: null,  level: 1, row_role: "leaf",      label: "Construction Interest",       amount_thousand: null,  calc: "derived_interest", base: "construction_borrowing" }
  ],

  // Coefficients used by derived items
  derived_params: {
    construction_total_gfa_sf: 890260,
    construction_cost_per_sf_gfa: 123.92,  // ← lever 2 multiplies this
    ap_commission_pct_of_gdv: 4.5,         // ← lever 5 adds delta
    admin_fees_pct_of_gdv: 2.0
  },

  // Financing
  financing: {
    bank_borrowing_pct: 75,
    equity_pct: 25,
    interest_rate_pct: 4.8,                // ← lever 4 adds delta
    development_period_months: 36,
    sales_period_months: 24                // ← lever 3 multiplies this
  },

  // Project-level
  project: {
    plot_ratio: 6.0,
    efficiency_nfa_over_gfa_pct: 80,
    total_nfa_sf: 712208
  }
};
```

**Note on Item 5 design:** In v1 we model construction as one number driven by `cost_per_sf_gfa × total_gfa`. The cost_items entries for 5.1, 5.2.x, 5.3 etc. are **display-only** for the Cost Detail tab — they show the baseline breakdown but get scaled proportionally when lever 2 moves. This matches how a real cost reduction would work (the contractor's whole bill moves, not just one sub-item).

---

## 6. Calculation Formulas (pure functions)

All in `calculations.js`. Pure, no DOM, fully unit-testable.

### 6.1 Apply levers to baseline

```javascript
function applyLevers(baseline, levers) {
  return {
    ...baseline,
    sales: baseline.sales.map(s => ({
      ...s,
      selling_price_per_sf: s.selling_price_per_sf * (1 + levers.selling_price / 100),
      discount_stack: {
        ...s.discount_stack,
        // Only adjust Bumi for residential (retail/carpark have 0 baseline)
        bumi_pct: s.discount_stack.bumi_pct > 0
          ? s.discount_stack.bumi_pct + levers.bumi_discount
          : s.discount_stack.bumi_pct
      }
    })),
    derived_params: {
      ...baseline.derived_params,
      construction_cost_per_sf_gfa: baseline.derived_params.construction_cost_per_sf_gfa * (1 + levers.construction_cost / 100),
      ap_commission_pct_of_gdv: baseline.derived_params.ap_commission_pct_of_gdv + levers.ap_commission
    },
    financing: {
      ...baseline.financing,
      interest_rate_pct: baseline.financing.interest_rate_pct + levers.interest_rate,
      sales_period_months: baseline.financing.sales_period_months * (1 + levers.sales_period / 100)
    }
  };
}
```

### 6.2 GDV calculation

```javascript
function calculateGDV(adjusted) {
  const gross_gdv_thousand = adjusted.sales.reduce((sum, s) => {
    return sum + (s.no_of_units * s.built_up_sf * s.selling_price_per_sf) / 1000;
  }, 0);

  const net_gdv_thousand = adjusted.sales.reduce((sum, s) => {
    const gross = (s.no_of_units * s.built_up_sf * s.selling_price_per_sf) / 1000;
    const total_discount_pct = Object.values(s.discount_stack).reduce((a, b) => a + b, 0);
    return sum + gross * (1 - total_discount_pct / 100);
  }, 0);

  return { gross_gdv_thousand, net_gdv_thousand };
}
```

### 6.3 Cost detail expansion (for both KPI and Cost Detail tab)

This produces a full snapshot of every cost item with baseline + adjusted values. Used by both the KPI calc and the Cost Detail tab — single source.

```javascript
function expandCostItems(adjusted, baseline, net_gdv_thousand) {
  const construction_total = (adjusted.derived_params.construction_total_gfa_sf 
    * adjusted.derived_params.construction_cost_per_sf_gfa) / 1000;
  
  const baseline_construction_total = (baseline.derived_params.construction_total_gfa_sf
    * baseline.derived_params.construction_cost_per_sf_gfa) / 1000;
  
  // For scaling sub-items proportionally
  const construction_scale = construction_total / baseline_construction_total;
  
  // Land subtotal (sum of leaves under item 4 except 4.4 which is derived)
  const land_total = baseline.cost_items
    .filter(i => i.parent === "4" && i.calc === "input")
    .reduce((sum, i) => sum + i.amount_thousand, 0);
  
  // Land holding interest = land_total × rate × (dev_period/12) × 0.5 (avg outstanding)
  const land_holding_interest = land_total 
    * (adjusted.financing.interest_rate_pct / 100)
    * (adjusted.financing.development_period_months / 12)
    * 0.5;
  
  // Construction interest = construction_borrowing × rate × (sales_period/12) × 0.5
  const construction_borrowing = construction_total * (adjusted.financing.bank_borrowing_pct / 100);
  const construction_interest = construction_borrowing
    * (adjusted.financing.interest_rate_pct / 100)
    * (adjusted.financing.sales_period_months / 12)
    * 0.5;
  
  // Expand every cost item with baseline + adjusted + delta
  return baseline.cost_items.map(item => {
    let baselineAmount = item.amount_thousand;
    let adjustedAmount = item.amount_thousand;
    
    // Scale construction items (5.x) by construction_scale
    if (item.item_no === "5" || item.item_no.startsWith("5.")) {
      if (item.calc === "input") {
        adjustedAmount = baselineAmount * construction_scale;
      }
    }
    
    // Derived: land holding interest
    if (item.item_no === "4.4") {
      // baseline land holding interest with baseline rate
      const baselineRate = baseline.financing.interest_rate_pct;
      const baselinePeriod = baseline.financing.development_period_months;
      baselineAmount = land_total * (baselineRate / 100) * (baselinePeriod / 12) * 0.5;
      adjustedAmount = land_holding_interest;
    }
    
    // Derived: construction interest
    if (item.item_no === "19") {
      const baselineConstBorrow = baseline_construction_total * (baseline.financing.bank_borrowing_pct / 100);
      const baselineConstInt = baselineConstBorrow 
        * (baseline.financing.interest_rate_pct / 100)
        * (baseline.financing.sales_period_months / 12)
        * 0.5;
      baselineAmount = baselineConstInt;
      adjustedAmount = construction_interest;
    }
    
    // Derived: % of GDV (A&P, Admin)
    if (item.calc === "derived_pct_gdv") {
      const baselinePct = baseline.derived_params[item.pct];
      const adjustedPct = adjusted.derived_params[item.pct];
      // Need baseline net_gdv too — compute by re-running with zero levers? Simpler: pass it in
      // Actually we already have baseline net_gdv from a separate call — fix this in implementation
      // For now: rough approximation using baseline net_gdv passed in
      baselineAmount = null;  // computed by caller
      adjustedAmount = net_gdv_thousand * (adjustedPct / 100);
    }
    
    return {
      ...item,
      baseline_amount_thousand: baselineAmount,
      adjusted_amount_thousand: adjustedAmount,
      delta_thousand: (adjustedAmount !== null && baselineAmount !== null) 
        ? adjustedAmount - baselineAmount 
        : null,
      delta_pct: (adjustedAmount !== null && baselineAmount !== null && baselineAmount !== 0)
        ? ((adjustedAmount - baselineAmount) / baselineAmount) * 100
        : null
    };
  });
}
```

> **Implementation note for Claude Code:** the comment above flags that `derived_pct_gdv` items need both baseline and adjusted GDV. Cleanest fix: compute `baseline_kpis` once on load and pass both into `expandCostItems`. Don't try to make this single-pass — readability matters more than micro-optimization.

### 6.4 TDC and KPIs

```javascript
function calculateKPIs(baseline, levers) {
  const adjusted = applyLevers(baseline, levers);
  const { net_gdv_thousand } = calculateGDV(adjusted);
  const baselineGdv = calculateGDV(baseline).net_gdv_thousand;
  
  const expanded = expandCostItems(adjusted, baseline, net_gdv_thousand);
  
  // TDC = sum of all leaf items (excluding headers + aggregate placeholders)
  const tdc = expanded
    .filter(i => i.row_role === "leaf" && i.adjusted_amount_thousand !== null)
    .reduce((sum, i) => sum + i.adjusted_amount_thousand, 0);
  
  const net_profit = net_gdv_thousand - tdc;
  const margin_pct = (net_profit / net_gdv_thousand) * 100;
  
  return {
    gdv_thousand: net_gdv_thousand,
    tdc_thousand: tdc,
    net_profit_thousand: net_profit,
    margin_pct,
    cost_detail: expanded,
    adjusted
  };
}
```

---

## 7. UI / Layout — Two Tabs

### Tab structure
```
┌────────────────────────────────────────────────────────┐
│  Project · Emira Shah Alam       Baseline: 2026-05-21  │
│  ┌─────────────┬───────────────┐                       │
│  │ Simulator   │ Cost Detail   │  [ Reset ] [ Export ] │
│  └─────────────┴───────────────┘                       │
└────────────────────────────────────────────────────────┘
```

Tabs are in-page (no URL routing). State persists across tab switches (levers don't reset).

### Tab 1: Simulator (default)

```
┌───────────────────────────┬────────────────────────────────────┐
│  LEVERS (left, ~45%)      │  RESULTS (right, ~55%)             │
│                           │                                    │
│  Selling Price            │  ┌─────────┬─────────┐             │
│  ━━━━●━━━━  +5%           │  │ GDV     │ TDC     │             │
│  → RM 682.50 / SF         │  │ 1,691M  │ 1,253M  │             │
│                           │  │ +80M    │ +6M     │             │
│  Construction Cost        │  └─────────┴─────────┘             │
│  ━━●━━━━━  -3%            │  ┌─────────┬─────────┐             │
│  → RM 120.20 / SF GFA     │  │ Profit  │ Margin  │ ← hero      │
│                           │  │ 438M    │ 25.9%   │             │
│  Sales Period             │  │ +74M    │ +3.3pp  │             │
│  ━●━━━━━━  0%             │  └─────────┴─────────┘             │
│  → 24 months              │                                    │
│                           │  Scenario summary                  │
│  Interest Rate            │  ──────────────────                │
│  ━●━━━━━━  0pp            │  At +5% selling price and -3%      │
│  → 4.8% p.a.              │  construction cost, margin moves   │
│                           │  from 22.6% to 25.9% (+3.3pp).     │
│  A&P + Commission         │  Net profit gain: RM 74M.          │
│  ━●━━━━━━  0pp            │                                    │
│  → 4.5% of GDV            │  → View Cost Detail tab for the    │
│                           │    full line-by-line breakdown     │
│  Bumi Discount            │                                    │
│  ━●━━━━━━  0pp            │                                    │
│  → 7.0% (residential)     │                                    │
└───────────────────────────┴────────────────────────────────────┘
```

### Tab 2: Cost Detail (read-only F_L2 mirror)

```
┌────────────────────────────────────────────────────────────────────┐
│  Adjustments active:  Selling +5%   Const -3%   (others: 0)        │
│                                                                     │
│  Item   Description              Baseline      Adjusted    Δ      │
│  ─────  ─────────────────        ─────────    ─────────   ──────  │
│  4      TOTAL LAND               65,340 *      65,340     (= )    │ ← header bold
│   4.1   Original Land            65,340         65,340     (=)     │
│   4.2   Incidental Costs          1,000          1,000     (=)     │
│   4.3   Stamp Duty                1,300          1,300     (=)     │
│   4.4   Land Holding Interest     1,569          1,569     (=)     │ ← derived, gray
│   4.5   Legal Fees                  250            250     (=)     │
│   ...                                                              │
│  5      TOTAL CONSTRUCTION      110,332 *     107,022    -3,310   │
│   5.1   Earthwork                 2,500          2,425      -75    │
│   5.2   Sub-Structural            6,686 *        6,486     -200   │ ← aggregate, italic
│    5.2.1 Piling                   5,186          5,031     -155   │
│    5.2.2 Pile Cap                 1,500          1,455      -45   │
│   5.3   Super-Structural Main    88,146         85,502   -2,644   │
│   5.4   External Works            7,000          6,790     -210   │
│   5.5   M&E                       6,000          5,820     -180   │
│   ...                                                              │
│  17     SALES & MARKETING                                          │
│   17.1  A&P + Commission         72,495         76,095   +3,600   │ ← derived (GDV%)
│   17.2  Bumi Contribution         1,500          1,500     (=)     │
│   17.3  Admin Fees               32,220         33,820   +1,600   │ ← derived
│  19     Construction Interest    11,914         10,816   -1,098   │ ← derived
│                                                                     │
│  ──────────────────────────────────────────────────────────────    │
│  TOTAL DEVELOPMENT COST        1,247,000     1,253,000   +6,000   │
│  TOTAL GDV (NET)              1,611,000     1,691,000  +80,000   │
│  NET PROFIT                     364,000        438,000  +74,000   │
│  MARGIN                           22.6%         25.9%  +3.3 pp    │
└────────────────────────────────────────────────────────────────────┘

Legend:  (=) no change   +/-N delta   * = aggregate (sum of sub-items)
         Bold = section header   Italic gray = derived (computed)
```

### Cost Detail rules

- **Read-only.** No editable cells in v1. If the user tries to click into a number, nothing happens.
- **Indent by level** (3 spaces per level, monospace font for alignment)
- **Headers** (row_role: 'header') — bold, no number column
- **Aggregates** (row_role: 'aggregate') — italic with `*` marker, displayed in slightly muted color
- **Leaves** (row_role: 'leaf') — normal text
- **Derived** (calc !== 'input') — gray text + small "derived" annotation on hover
- **Delta column rules:**
  - `(=)` if delta is 0 or near-zero (|delta| < 1 thousand)
  - Green `-N,NNN` if cost decreased (good)
  - Red `+N,NNN` if cost increased (bad)
  - For GDV: green = increased (good), red = decreased (bad)
- **Footer totals** with `─────` rule above

### Tab interaction

- Switching tabs is instant (no animation)
- Lever changes apply to both tabs (Cost Detail tab updates live too, but is usually not the active view)
- Top bar (`Adjustments active: ...`) on Cost Detail tab summarizes which levers are non-zero

---

## 8. Visual Style

**Match the pitch deck exactly.** Same palette, typography, spacing.

### Palette
```css
--bg: #faf7f1;          /* warm cream */
--bg-2: #f2ede3;        /* slightly deeper cream */
--ink: #1a1814;         /* deep warm black */
--ink-muted: #5c5851;   /* warm grey */
--ink-dim: #7a766a;     /* dim grey */
--gold: #a8853f;        /* deep gold */
--gold-bright: #c9a961; /* accent gold */
--gold-dim: rgba(168, 133, 63, 0.12);
--line: rgba(26, 24, 20, 0.10);
--positive: #3ca05a;
--negative: #c83232;
```

### Typography
- **Display / KPI numbers:** Fraunces (variable serif, italic for hero) — fallback Georgia
- **Body / labels:** Inter — fallback system-ui
- **Numbers / mono / Cost Detail table:** JetBrains Mono — fallback Courier New

In v1, use **system font fallbacks** (no embedded font files) to keep single-file size down. The pitch deck visual identity is maintained via palette + spacing + the serif italic for headlines.

### Cost Detail table specifically
Use mono font for the entire table — vital for alignment of item numbers (4.1 / 4.2 / 5.2.1) and indented descriptions. Numbers right-aligned in their columns.

---

## 9. Export

### Trigger
One button in the top bar: `[Export Scenario]`. Click downloads **two files** in sequence:
1. `EMIRA01_scenario_2026-05-21T14-32.csv`
2. `EMIRA01_scenario_2026-05-21T14-32.json`

### CSV format (for QS to execute against Excel)

```csv
NCT Feasibility Scenario Report
Project,Emira Shah Alam
Baseline,v1.0 (2026-05-21)
Generated,2026-05-21T14:32:08+08:00

LEVERS
Lever,Baseline,Adjustment,Result
Selling Price,(baseline),+5%,*1.05
Construction Cost,(baseline),-3%,*0.97
Sales Period,24 months,0%,24 months
Interest Rate,4.8%,0pp,4.8%
A&P + Commission,4.5%,0pp,4.5%
Bumi Discount,7.0%,0pp,7.0%

KPI SUMMARY (RM '000)
KPI,Baseline,New,Delta,Delta %
GDV (Net),1611000,1691000,+80000,+5.0%
TDC,1247000,1253000,+6000,+0.5%
Net Profit,364000,438000,+74000,+20.3%
Margin %,22.6,25.9,+3.3pp,(pp)

COST DETAIL (RM '000)
Item No,Description,Baseline,New,Delta,Action
4,TOTAL LAND PURCHASE COST,67320,67320,0,
4.1,Original Land Purchase Cost,65340,65340,0,
4.2,Incidental Land Costs,1000,1000,0,
4.3,Stamp Duty,1300,1300,0,
4.4,Land Holding Interest (derived),1569,1569,0,(no action - auto)
4.5,Legal Fees,250,250,0,
...
5,TOTAL CONSTRUCTION COST,110332,107022,-3310,
5.1,Earthwork,2500,2425,-75,Reduce by 3%
5.2.1,Piling,5186,5031,-155,Reduce by 3%
...
17.1,A&P + Commission (derived),72495,76095,+3600,(no action - auto)
17.3,Admin Fees (derived),32220,33820,+1600,(no action - auto)
19,Construction Interest (derived),11914,10816,-1098,(no action - auto)
```

**Why CSV not Excel:** Single-file constraint + no SheetJS dependency. CSV opens in Excel just fine. The "Action" column tells QS what to do with each row.

**CSV encoding:** UTF-8 with BOM (so Excel opens it correctly with non-ASCII characters if any creep in).

### JSON format (for system / audit / future re-import)

```json
{
  "scenario_id": "scn_2026-05-21T14-32-08",
  "project_id": "EMIRA01",
  "project_name": "Emira Shah Alam",
  "baseline_version": "v1.0",
  "baseline_refreshed_at": "2026-05-21",
  "scenario_created_at": "2026-05-21T14:32:08+08:00",
  "levers": {
    "selling_price": 5,
    "construction_cost": -3,
    "sales_period": 0,
    "interest_rate": 0,
    "ap_commission": 0,
    "bumi_discount": 0
  },
  "baseline_kpis": {
    "gdv_thousand": 1611000,
    "tdc_thousand": 1247000,
    "net_profit_thousand": 364000,
    "margin_pct": 22.6
  },
  "scenario_kpis": {
    "gdv_thousand": 1691000,
    "tdc_thousand": 1253000,
    "net_profit_thousand": 438000,
    "margin_pct": 25.9
  },
  "cost_detail": [
    { "item_no": "4.1", "description": "Original Land", "baseline_thousand": 65340, "adjusted_thousand": 65340, "delta_thousand": 0, "calc": "input" },
    ...
  ]
}
```

---

## 10. Reconciliation Tests

Same as before — the simulator's baseline (all levers at 0) must match Fabric/Power BI values:

```javascript
const RECONCILIATION_TARGETS = {
  gdv_thousand: 1611000,
  tdc_thousand: 1247000,
  net_profit_thousand: 364000,
  margin_pct: 22.6,
  tolerance_thousand: 1000,
  tolerance_pct: 0.1
};
```

**Additional test for Cost Detail expansion:**
```javascript
// Sum of all leaf cost items === TDC
const tdcFromCostDetail = baseline.cost_items
  .filter(i => i.row_role === 'leaf' && i.calc === 'input')
  .reduce((s, i) => s + i.amount_thousand, 0);
// + derived items (land holding, construction interest, A&P, admin)
// should equal TDC within tolerance
```

---

## 11. Browser Support

Chrome / Edge / Safari, last 2 years. No polyfills.

---

## 12. Out of Scope (v1)

- localStorage scenario saving (v1.2)
- Editable Cost Detail (v2.0 — out of scope, may never ship — see CLAUDE.md)
- Multi-project switcher
- Bear/Base/Bull preset buttons (v1.4)
- Funding gap timeline chart (v1.3)
- Sensitivity tornado (v1.5)
- Excel `.xlsx` export (v1.6 if needed — currently CSV is adequate)
- Authentication
- Mobile-first layout (basic responsive only)

---

## 13. Acceptance Criteria

- [ ] Open `index.html` by double-click, full UI renders without errors
- [ ] Both tabs render correctly; switching is instant
- [ ] All 6 levers respond instantly (<50ms visual feedback)
- [ ] All 4 KPIs recalculate within 100ms
- [ ] Cost Detail tab updates live with lever changes
- [ ] Baseline KPIs match Fabric source within 0.1% (reconciliation tests pass)
- [ ] Cost Detail leaf sum + derived items === TDC (internal consistency)
- [ ] Export downloads BOTH CSV and JSON files
- [ ] CSV opens correctly in Excel with no encoding issues
- [ ] CSV "Action" column is populated for items where lever effects apply
- [ ] Reset button returns all levers to 0
- [ ] No console errors at idle
- [ ] No network requests at any time (verify in DevTools)
- [ ] File size under 200 KB total
- [ ] Works offline (test with WiFi off)
- [ ] Renders correctly in Chrome, Edge, Safari latest
- [ ] Print preview of both tabs looks reasonable on A4 landscape

---

## 14. Effort Estimate

| Component | Days |
|---|---|
| Project skeleton + data + build script | 0.5 |
| Calculations + reconciliation tests | 1.0 |
| Simulator tab UI (levers + KPIs + animations) | 1.0 |
| Cost Detail tab UI (table rendering + indent + colors) | 0.75 |
| Export (CSV + JSON generation + download) | 0.5 |
| Polish, manual test, cross-browser, print stylesheet | 0.75 |
| **Total** | **~4.5 days** |

---

## 15. Future Roadmap

| Version | Scope | Effort |
|---|---|---|
| v1.0 | This spec | 4-5 days |
| v1.1 | Cost per SF KPI | +0.5 day |
| v1.2 | localStorage save | +1 day |
| v1.3 | Funding gap chart | +1 day |
| v1.4 | Bear/Base/Bull presets | +0.5 day |
| v1.5 | Sensitivity tornado | +1.5 days |
| v1.6 | .xlsx export (if requested) | +1 day (SheetJS, ~+100KB) |
| v2.0 | Dynamic baseline (SharePoint JSON) | +2 days |
| v3.0 | Direct Fabric REST + OAuth | +5-10 days (depends on IT) |
