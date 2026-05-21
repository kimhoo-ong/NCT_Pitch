# CLAUDE_CODE_FEEDBACK.md — Updated Baseline + Blocker Resolution

> Read this. It supersedes BLOCKER 1 & 2 with corrected data and explicit decisions.

## TL;DR

You were correct to stop and flag blockers. I went back to the client's actual Excel and found:

1. **I confused Gross GDV with Net GDV in the original SPEC.** True numbers below.
2. **TDC was a fabricated guess.** Real TDC is unknown — client's F_L2 is empty.
3. **The cost item tree in SPEC was incomplete.** Full F_L2 structure included below (item 1-21, 75+ items).

This document provides:
- Verified baseline data from the client's Std_Feasi sample
- Honest labeling of what's "real" vs "indicative"
- A new reconciliation strategy that doesn't require fake-pass

---

## 1. CORRECTED Baseline — Sales Side (real data)

Source: client's `Std_Feasi_Sample__ENG.xls` → **Sales Summary** sheet

### Residential (Row 4)
- **Units:** 2613.6 (yes, fractional — this is from the source Excel)
- **Built up:** 800 SF/unit
- **Price:** RM 650/SF
- **Price/unit:** RM 520,000

### Retail (Row 19)
- **Units:** 209.088 (also fractional)
- **Built up:** 1,000 SF/unit
- **Price:** RM 1,200/SF
- **Price/unit:** RM 1,200,000

### Car Park (Row 34)
- **Units:** 97.12464812939548
- **Built up:** 100 SF/unit
- **Price:** RM 1,000/SF
- **Price/unit:** RM 20,000 (so SF here is actually "bay-equivalent", not square feet — but treat it as the SF math model)

### Discount stack (Row 4, 19, 34 columns H-K, applied uniformly to ALL unit types)
| Discount | Rate |
|---|---|
| Early Bird | 5% |
| Staff | 5% |
| Promotion | 10% |
| Others | 3% |
| **TOTAL** | **23%** |

**Note**: I previously had a 12.5% discount in SPEC. Actual is 23%. Bumi (lever 6) is NOT in this stack — Bumi appears in F_L2 Item 20 as a lump-sum cost, not a per-unit discount. **This is a critical structural correction.** See Section 4 below for how this changes lever 6.

### Verified GDV math (from real data)

```
Residential gross: 2613.6 × 800 × 650 = RM 1,359,072,000
Retail gross:      209.088 × 1000 × 1200 = RM 250,905,600
Car Park gross:    97.124648... × 100 × 1000 = RM 9,712,465
TOTAL GROSS GDV:                          RM 1,619,690,065  →  1,619,690 thousand

After 23% discount stack (applied uniformly):
Residential net: RM 1,046,485,440
Retail net:      RM 193,197,312
Car Park net:    RM 7,478,598
TOTAL NET GDV:   RM 1,247,161,350         →  1,247,161 thousand
```

### What to use in `baseline.js`

```javascript
sales: [
  {
    unit_type_code: "HR1-T1",
    property_category: "Residential",
    product_name: "Residential Type 1",
    no_of_units: 2613.6,
    built_up_sf: 800,
    selling_price_per_sf: 650,
    discount_stack: {
      early_bird_pct: 5,
      staff_pct: 5,
      promotion_pct: 10,
      others_pct: 3
    }
  },
  {
    unit_type_code: "RETAIL",
    property_category: "Retail",
    product_name: "Retail Type 1",
    no_of_units: 209.088,
    built_up_sf: 1000,
    selling_price_per_sf: 1200,
    discount_stack: {
      early_bird_pct: 5,
      staff_pct: 5,
      promotion_pct: 10,
      others_pct: 3
    }
  },
  {
    unit_type_code: "CARPARK",
    property_category: "Car Park",
    product_name: "Car Park Type 1",
    no_of_units: 97.124648,
    built_up_sf: 100,
    selling_price_per_sf: 1000,
    discount_stack: {
      early_bird_pct: 5,
      staff_pct: 5,
      promotion_pct: 10,
      others_pct: 3
    }
  }
],
```

### NEW RECONCILIATION TARGETS

```javascript
const RECONCILIATION_TARGETS = {
  gross_gdv_thousand: 1619690,
  net_gdv_thousand:   1247161,
  tolerance_thousand: 100,        // tighter now — we have exact source
  tolerance_pct: 0.01
};
```

These should match exactly (modulo floating-point error from the fractional units).

---

## 2. The TDC Reality Check

The client's F_L2 sheet is **structurally complete but data-empty** (all amount cells are 0 or blank). The only construction data we have is from the **Cost per SF** sheet, which gives us the Emira project's actual construction package totals:

| Package | Awarded | VO | Total |
|---|---|---|---|
| Soil investigation | RM 19,990 | -5,885 | RM 14,105 |
| Earthwork & hoarding | RM 729,881 | +11,520 | RM 741,401 |
| Piling, pilecap & starter bar | RM 5,200,000 | +132,571 | RM 5,332,571 |
| Main building works | RM 107,500,000 | -3,263,339 | RM 104,236,661 |
| **TOTAL CONSTRUCTION** | | | **RM 110,324,737** |
| Cost/GFA | | | RM 123.92/SF |
| GFA | | | 890,260 SF |
| NFA | | | 420,530 SF |

### What we know vs don't know

| Item | Source | Real? |
|---|---|---|
| 4.1 Land Purchase Cost | Project Summary R5: 65,340 + 6,534 + 217.8 = 72,091.8 thousand | ✅ Real |
| 4.x other land items | Empty in client Excel | ⚠️ Estimate |
| 5.x Construction total | Cost per SF: RM 110,325 thousand | ✅ Real |
| 5.x sub-breakdown (5.1, 5.2, 5.3...) | Aggregated only — no leaf detail | ⚠️ Estimate |
| 6, 7, 8 (Prof Fees, Authority, Soft Costs) | Empty in client Excel | ⚠️ Estimate |
| 10 PM Fees | Assumption R20-R27: ~1.5% to 1.9% of construction | ✅ Formula known |
| 17, 18, 19, 20, 21 (S&M items) | Empty in client Excel | ⚠️ Estimate |

### Decision: Make TDC "honest indicative"

Instead of pretending baseline matches a known Fabric value, do this:

1. **Label baseline TDC as "Indicative — pending client validation"** in the UI (small caption under TDC KPI card on the Simulator tab)
2. **Use educated guesses for the unknown items** (see Section 3 below for proposed numbers based on Malaysian property industry benchmarks)
3. **Reconciliation tests don't fail on TDC absolute value** — instead they verify:
   - Internal consistency (sum of leaves === TDC)
   - Lever responsiveness (lever 2 -3% → construction drops 3%, etc.)
   - No NaN, no negative, no infinite

This is more honest than the v1 SPEC and more useful for pitch demo. CFO/CEO sees the simulator working with **his own GDV numbers** (which ARE real) and **plausible TDC structure** (clearly labeled as indicative).

---

## 3. COMPLETE Cost Items Tree (Item 1-21, real F_L2 structure)

This is the full F_L2 structure from the client's actual Excel. All `amount_thousand` values marked `[EST]` are indicative — we have no real data for them.

```javascript
cost_items: [
  // ═══ INCOME SIDE — for display only, not summed into TDC ═══
  // (Items 1-3 are GDV-related, handled in sales[] array, but kept in F_L2 display for completeness)
  
  // ═══ DEVELOPMENT COST ═══
  
  // Item 4 — Land
  { item_no: "4",     parent: null,  level: 1, row_role: "header",    label: "TOTAL LAND PURCHASE COST",      amount_thousand: null,  calc: null },
  { item_no: "4.1",   parent: "4",   level: 2, row_role: "leaf",      label: "Original Land Purchase Cost",    amount_thousand: 72092, calc: "input" }, // REAL: residential 65,340 + commercial 6,534 + carpark 217.8
  { item_no: "4.2",   parent: "4",   level: 2, row_role: "leaf",      label: "Incidental Land Purchase Cost",  amount_thousand: 1000,  calc: "input" }, // [EST]
  { item_no: "4.3",   parent: "4",   level: 2, row_role: "leaf",      label: "Land Holding Interest",          amount_thousand: null,  calc: "derived_interest", base: "land_total" },
  { item_no: "4.4",   parent: "4",   level: 2, row_role: "leaf",      label: "Conversion Premium",             amount_thousand: 500,   calc: "input" }, // [EST]
  { item_no: "4.5",   parent: "4",   level: 2, row_role: "leaf",      label: "Lease Extension",                amount_thousand: 0,     calc: "input" },
  { item_no: "4.6",   parent: "4",   level: 2, row_role: "leaf",      label: "Stamp Duty + Legal",             amount_thousand: 1500,  calc: "input" }, // [EST] — combines 4.5/4.6/4.7/4.8 from SPEC

  // Item 5 — Construction (REAL total RM 110,325 thousand, sub-breakdown estimated)
  { item_no: "5",     parent: null,  level: 1, row_role: "header",    label: "TOTAL CONSTRUCTION COST",        amount_thousand: null,  calc: null },
  { item_no: "5.1",   parent: "5",   level: 2, row_role: "leaf",      label: "Earthwork & Site Clearance",     amount_thousand: 741,   calc: "input" }, // REAL from Cost per SF
  { item_no: "5.2",   parent: "5",   level: 2, row_role: "aggregate", label: "Sub-Structural",                 amount_thousand: null,  calc: "rollup" },
  { item_no: "5.2.1", parent: "5.2", level: 3, row_role: "leaf",      label: "Piling, Pilecap & Starter Bar",  amount_thousand: 5333,  calc: "input" }, // REAL
  { item_no: "5.2.2", parent: "5.2", level: 3, row_role: "leaf",      label: "Retaining Wall",                 amount_thousand: 500,   calc: "input" }, // [EST]
  { item_no: "5.3",   parent: "5",   level: 2, row_role: "leaf",      label: "Main Building Works",            amount_thousand: 104237, calc: "input" }, // REAL — bulk of construction
  { item_no: "5.4",   parent: "5",   level: 2, row_role: "leaf",      label: "Interior Design",                amount_thousand: 0,     calc: "input" }, // [EST] — 0 for now
  { item_no: "5.5",   parent: "5",   level: 2, row_role: "leaf",      label: "Landscaping Works",              amount_thousand: 0,     calc: "input" }, // [EST]
  { item_no: "5.6",   parent: "5",   level: 2, row_role: "leaf",      label: "Infrastructure Works",           amount_thousand: 0,     calc: "input" }, // [EST]
  { item_no: "5.7",   parent: "5",   level: 2, row_role: "leaf",      label: "Miscellaneous",                  amount_thousand: 0,     calc: "input" }, // [EST]
  { item_no: "5.8",   parent: "5",   level: 2, row_role: "leaf",      label: "Show Unit",                      amount_thousand: 0,     calc: "input" }, // [EST]
  { item_no: "5.9",   parent: "5",   level: 2, row_role: "leaf",      label: "Preliminaries",                  amount_thousand: 0,     calc: "input" }, // [EST]
  { item_no: "5.10",  parent: "5",   level: 2, row_role: "leaf",      label: "Project Contingency",            amount_thousand: 5500,  calc: "input" }, // [EST] ~5% of construction
  { item_no: "5.11",  parent: "5",   level: 2, row_role: "leaf",      label: "Mechanical & Engineering",       amount_thousand: 11000, calc: "input" }, // [EST] ~10% of construction

  // Item 6 — Professional Fees
  { item_no: "6",     parent: null,  level: 1, row_role: "header",    label: "PROFESSIONAL FEES",              amount_thousand: null,  calc: null },
  { item_no: "6.1",   parent: "6",   level: 2, row_role: "leaf",      label: "Architect",                      amount_thousand: 3500,  calc: "input" }, // [EST] ~3% of construction
  { item_no: "6.2",   parent: "6",   level: 2, row_role: "leaf",      label: "Quantity Surveyor",              amount_thousand: 1200,  calc: "input" }, // [EST]
  { item_no: "6.3",   parent: "6",   level: 2, row_role: "leaf",      label: "C&S Engineer",                   amount_thousand: 1500,  calc: "input" }, // [EST]
  { item_no: "6.4",   parent: "6",   level: 2, row_role: "leaf",      label: "M&E Engineer",                   amount_thousand: 1100,  calc: "input" }, // [EST]
  { item_no: "6.5",   parent: "6",   level: 2, row_role: "leaf",      label: "ID Consultant",                  amount_thousand: 800,   calc: "input" }, // [EST]
  { item_no: "6.6",   parent: "6",   level: 2, row_role: "leaf",      label: "Soil Investigation",             amount_thousand: 14,    calc: "input" }, // REAL: from Cost per SF
  { item_no: "6.7",   parent: "6",   level: 2, row_role: "leaf",      label: "Planner",                        amount_thousand: 400,   calc: "input" }, // [EST]

  // Item 7 — Authority Contribution
  { item_no: "7",     parent: null,  level: 1, row_role: "header",    label: "AUTHORITY CONTRIBUTION",         amount_thousand: null,  calc: null },
  { item_no: "7.1",   parent: "7",   level: 2, row_role: "leaf",      label: "TNB Contribution",               amount_thousand: 1200,  calc: "input" }, // [EST]
  { item_no: "7.2",   parent: "7",   level: 2, row_role: "leaf",      label: "Syabas Contribution",            amount_thousand: 800,   calc: "input" }, // [EST]
  { item_no: "7.3",   parent: "7",   level: 2, row_role: "leaf",      label: "IWK Contribution",               amount_thousand: 600,   calc: "input" }, // [EST]
  { item_no: "7.4",   parent: "7",   level: 2, row_role: "leaf",      label: "Bomba Contribution",             amount_thousand: 300,   calc: "input" }, // [EST]
  { item_no: "7.5",   parent: "7",   level: 2, row_role: "leaf",      label: "Telekom + Others",               amount_thousand: 300,   calc: "input" }, // [EST]
  { item_no: "7.6",   parent: "7",   level: 2, row_role: "leaf",      label: "Road & Drain Contribution",      amount_thousand: 1000,  calc: "input" }, // [EST]

  // Items 8-16 — Various direct costs
  { item_no: "8",     parent: null,  level: 1, row_role: "leaf",      label: "Plan Submission Fees",           amount_thousand: 300,   calc: "input" }, // [EST]
  { item_no: "9",     parent: null,  level: 1, row_role: "leaf",      label: "Plan, Survey & Strata Title",    amount_thousand: 500,   calc: "input" }, // [EST]
  { item_no: "10",    parent: null,  level: 1, row_role: "leaf",      label: "Project Management Fees",        amount_thousand: 2247,  calc: "input" }, // REAL: Assumption R25 = 2,247 thousand (1.5%)
  { item_no: "11",    parent: null,  level: 1, row_role: "leaf",      label: "Others 1",                       amount_thousand: 0,     calc: "input" },
  { item_no: "12",    parent: null,  level: 1, row_role: "leaf",      label: "Others 2",                       amount_thousand: 0,     calc: "input" },
  { item_no: "13",    parent: null,  level: 1, row_role: "leaf",      label: "Others 3",                       amount_thousand: 0,     calc: "input" },
  { item_no: "14",    parent: null,  level: 1, row_role: "leaf",      label: "Others 4",                       amount_thousand: 0,     calc: "input" },
  { item_no: "15",    parent: null,  level: 1, row_role: "leaf",      label: "GST Provision",                  amount_thousand: 0,     calc: "input" }, // GST repealed in MY for property
  { item_no: "16",    parent: null,  level: 1, row_role: "leaf",      label: "Development Contingency",        amount_thousand: 3000,  calc: "input" }, // [EST]

  // Item 17-21 — Sales & Marketing
  { item_no: "17",    parent: null,  level: 1, row_role: "header",    label: "SALES & MARKETING",              amount_thousand: null,  calc: null },
  { item_no: "17.1",  parent: "17",  level: 2, row_role: "leaf",      label: "Advertising & Promotion",        amount_thousand: null,  calc: "derived_pct_gdv", pct: "advertising_promotion_pct_of_gdv" },
  { item_no: "18",    parent: null,  level: 1, row_role: "leaf",      label: "Agent Commission",               amount_thousand: null,  calc: "derived_pct_gdv", pct: "agent_commission_pct_of_gdv" },
  { item_no: "19",    parent: null,  level: 1, row_role: "leaf",      label: "Sales Gallery",                  amount_thousand: 1500,  calc: "input" }, // [EST]
  { item_no: "20",    parent: null,  level: 1, row_role: "leaf",      label: "Bumi Contribution",              amount_thousand: null,  calc: "derived_pct_gdv", pct: "bumi_contribution_pct_of_gdv" }, // ← LEVER 6 NOW ADJUSTS THIS pct
  { item_no: "21",    parent: null,  level: 1, row_role: "leaf",      label: "Administration Fees",            amount_thousand: null,  calc: "derived_pct_gdv", pct: "admin_fees_pct_of_gdv" },

  // Construction Interest (computed, displayed as virtual item for transparency)
  { item_no: "X",     parent: null,  level: 1, row_role: "leaf",      label: "Construction Interest",          amount_thousand: null,  calc: "derived_interest", base: "construction_borrowing" }
]
```

### New `derived_params`

```javascript
derived_params: {
  construction_total_gfa_sf: 890260,                  // REAL from Cost per SF
  construction_cost_per_sf_gfa: 123.92,               // REAL — lever 2 multiplies this
  total_nfa_sf: 420530,                                // REAL from Cost per SF
  cost_per_sf_nfa: 262.35,                             // REAL (informational)
  advertising_promotion_pct_of_gdv: 2.0,              // [EST] — separated from Agent Commission
  agent_commission_pct_of_gdv: 2.5,                   // [EST] — typical Malaysian property
  bumi_contribution_pct_of_gdv: 2.0,                  // [EST] — typical state quota cost
  admin_fees_pct_of_gdv: 3.0                          // REAL: Assumption R29-R30 (GDV < 250M: 3%; >250M: 2%)
}
```

### Lever 5 redefinition

Lever 5 was "A&P + Commission" — one slider. Real F_L2 has TWO items:
- 17.1 Advertising & Promotion (~2% GDV)
- 18 Agent Commission (~2.5% GDV)

**Decision:** Keep lever 5 as a single slider but apply the +delta to BOTH `advertising_promotion_pct_of_gdv` AND `agent_commission_pct_of_gdv`. So +1pp on lever 5 means +0.5pp to each. Document this in UI tooltip.

### Lever 6 redefinition — CRITICAL

Lever 6 was "Bumi Discount" applied to `discount_stack.bumi_pct` per unit type. **This was wrong.**

In the real F_L2 structure, Bumi is **Item 20: Bumi Contribution** — a cost item on the development side, NOT a discount on the sales side. It's typically calculated as % of GDV.

**New behavior:** Lever 6 (additive pp) adjusts `derived_params.bumi_contribution_pct_of_gdv`. So +1pp on lever 6 increases Item 20 (Bumi Contribution) by 1% of net GDV.

The `discount_stack` in `sales[]` now has FOUR fields (early_bird, staff, promotion, others = 23% total), NOT five. Bumi is gone from there.

---

## 4. New TDC Calculation

```javascript
function calculateTDC(adjusted, baseline, net_gdv_thousand) {
  // 1. Land items (Item 4.x)
  const land_input_total = baseline.cost_items
    .filter(i => i.item_no.startsWith("4.") && i.calc === "input")
    .reduce((s, i) => s + i.amount_thousand, 0);
  
  // 2. Land holding interest (Item 4.3)
  const land_holding_interest = land_input_total
    * (adjusted.financing.interest_rate_pct / 100)
    * (adjusted.financing.development_period_months / 12)
    * 0.5;
  
  // 3. Construction (Item 5.x) — sub-items scale with lever 2
  const baseline_construction_total = (baseline.derived_params.construction_total_gfa_sf
    * baseline.derived_params.construction_cost_per_sf_gfa) / 1000;
  const adjusted_construction_total = (adjusted.derived_params.construction_total_gfa_sf
    * adjusted.derived_params.construction_cost_per_sf_gfa) / 1000;
  const construction_scale = adjusted_construction_total / baseline_construction_total;
  // Apply this scale to sum of leaves under "5"
  const baseline_construction_sum = baseline.cost_items
    .filter(i => (i.item_no === "5" || i.item_no.startsWith("5.")) && i.calc === "input")
    .reduce((s, i) => s + i.amount_thousand, 0);
  const adjusted_construction_sum = baseline_construction_sum * construction_scale;
  
  // 4. Fixed items (Items 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 19)
  const fixed_input_items = baseline.cost_items
    .filter(i => 
      i.calc === "input" &&
      !i.item_no.startsWith("4") &&  // exclude land (handled above)
      !i.item_no.startsWith("5") &&  // exclude construction (handled above)
      i.item_no !== "10"             // exclude PM fees (handled below)
    )
    .reduce((s, i) => s + i.amount_thousand, 0);
  
  // 5. Project Management Fees (Item 10) — could be derived from construction in future, but fixed for v1
  const pm_fees = baseline.cost_items.find(i => i.item_no === "10").amount_thousand;
  
  // 6. Sales & Marketing — % of GDV (Items 17.1, 18, 20, 21)
  const advertising = net_gdv_thousand * (adjusted.derived_params.advertising_promotion_pct_of_gdv / 100);
  const commission = net_gdv_thousand * (adjusted.derived_params.agent_commission_pct_of_gdv / 100);
  const bumi_contribution = net_gdv_thousand * (adjusted.derived_params.bumi_contribution_pct_of_gdv / 100);
  const admin_fees = net_gdv_thousand * (adjusted.derived_params.admin_fees_pct_of_gdv / 100);
  
  // 7. Construction interest (Item X) — virtual item
  const construction_borrowing = adjusted_construction_total * (adjusted.financing.bank_borrowing_pct / 100);
  const construction_interest = construction_borrowing
    * (adjusted.financing.interest_rate_pct / 100)
    * (adjusted.financing.sales_period_months / 12)
    * 0.5;
  
  const tdc = 
    land_input_total +
    land_holding_interest +
    adjusted_construction_sum +
    fixed_input_items +
    pm_fees +
    advertising +
    commission +
    bumi_contribution +
    admin_fees +
    construction_interest;
  
  return {
    tdc,
    breakdown: {
      land_input_total,
      land_holding_interest,
      adjusted_construction_sum,
      fixed_input_items,
      pm_fees,
      advertising,
      commission,
      bumi_contribution,
      admin_fees,
      construction_interest
    }
  };
}
```

---

## 5. Expected Baseline KPIs (with this corrected data)

When all levers are 0, the simulator should produce approximately these:

| KPI | Value | Source |
|---|---|---|
| Gross GDV | RM 1,619,690 thousand | EXACT (from real Sales Summary) |
| Net GDV | RM 1,247,161 thousand | EXACT (Gross × 0.77) |
| Total Land (Item 4) | RM ~75,092 thousand | 72,092 + 1,000 + 500 + 0 + 1,500 + land holding interest |
| Total Construction (Item 5) | RM ~127,311 thousand | 741 + 5,333 + 500 + 104,237 + 5,500 + 11,000 (sub-items sum, indicative) |
| TDC (estimate) | RM ~280,000-320,000 thousand | All items above + S&M (5-8% of GDV) + interest |
| Net Profit | RM ~927,000-967,000 thousand | GDV - TDC |
| Margin % | ~74-78% | (Net Profit / Net GDV) |

**Wait — that margin is way too high for Malaysian property.** Typical net margins are 15-25%. This means **our [EST] cost estimates are way too low.** Real TDC for an RM 1.2B GDV project should be ~RM 950M-1B (margin 17-22%).

The [EST] numbers I gave above are placeholders. To get a sensible baseline:

### OPTION A (recommended): Calibrate to a target margin

Pick a target net margin (e.g. 20%) and scale up the [EST] cost items proportionally so:
- TDC = Net GDV × 0.80 ≈ RM 998M
- The REAL items (4.1, 5.x construction, 6.6 soil, 10 PM fees) stay fixed
- The [EST] items get inflated by ~3.5x to hit the target

I'll let Claude Code compute this calibration in `baseline.js`.

### OPTION B (rejected): Pretend we have real data

Don't do this. Better to label clearly.

### Recommendation

Do OPTION A but **make the calibration explicit in code**:

```javascript
// In baseline.js, after defining cost_items with raw [EST] values:
const TARGET_NET_MARGIN_PCT = 20;  // Industry-typical for Malaysian residential

// Calibration runs once at load — scales [EST] items to hit target margin
calibrateEstimatedCosts(BASELINE_DATA, TARGET_NET_MARGIN_PCT);
```

And document this clearly in CLAUDE.md as Gotcha #15. Pitch deck should say "indicative".

---

## 6. New Reconciliation Strategy

```javascript
const RECONCILIATION_TARGETS = {
  // GDV: exact (real source data)
  gross_gdv_thousand: 1619690,
  net_gdv_thousand:   1247161,
  gdv_tolerance_thousand: 100,
  
  // Margin: target band (we calibrate to this)
  margin_pct_target: 20,
  margin_pct_tolerance: 0.5,  // ±0.5pp after calibration
  
  // Internal consistency
  tdc_vs_leaves_tolerance_thousand: 10,
  
  // Sensitivity (functional, not absolute)
  selling_price_plus_10_min_profit_lift_pct: 30,    // +10% price should lift profit by ≥30%
  construction_minus_10_min_profit_lift_pct: 35,   // -10% const cost should lift profit by ≥35%
  
  // Boundary
  no_negative_gdv_at_extremes: true,
  no_nan_at_extremes: true
};
```

Pass criteria:
- ✅ GDV must match exact within ±RM 100K
- ✅ Margin within ±0.5pp of target after calibration
- ✅ Sum of leaves === TDC
- ✅ Sensitivity checks pass
- ✅ No NaN/negative at extremes

Test 1 should now PASS (after applying corrected data + calibration).

---

## 7. Construction Interest Formula

You flagged a formula inconsistency. Confirmed: use the §6.3 formula:

```
construction_interest = 
  construction_total × bank_borrowing_pct × interest_rate × (sales_period_months / 12) × 0.5
```

The `× 0.5` represents average outstanding balance (linear drawdown approximation). This is rough but defensible for v1 — comment in code as `// Simplified: assumes linear borrowing drawdown. Real model needs monthly amortization (v1.x).`

The SPEC.md §7 mockup values were illustrative — your formula is correct.

---

## 8. Action Items for Claude Code

In order:

1. **Update `baseline.js`** with corrected sales data (Section 1) and complete cost_items tree (Section 3 — note: that's ~45 items, not the 18 in original SPEC)
2. **Add `calibrateEstimatedCosts()`** function that scales [EST] items to hit 20% margin baseline (Section 5 OPTION A). Document target margin clearly.
3. **Update `calculations.js`** with new TDC formula (Section 4) — note Item 20 Bumi is now derived from GDV%, not from discount_stack
4. **Update `RECONCILIATION_TARGETS`** with new structure (Section 6)
5. **Update lever 5 logic** to split delta between advertising + commission (Section 3)
6. **Update lever 6 logic** to adjust `bumi_contribution_pct_of_gdv` instead of `discount_stack.bumi_pct` (Section 3)
7. **Remove `bumi_pct` from `discount_stack` entirely** — discount stack is now 4 fields (early_bird, staff, promotion, others)
8. **Re-run all tests** — Test 1 should now PASS for GDV. TDC test should be margin-based (Section 6), and PASS after calibration.
9. **Update `BLOCKERS.md`** to reflect resolved status. Replace it with a `CALIBRATION_NOTES.md` documenting which baseline values are real vs estimated.
10. **In Cost Detail tab UI**, add a small `[INDICATIVE]` tag next to estimated items (visible to user — gold text or small label). Real items don't get the tag. CSV export's "Action" column should include "(indicative — confirm with QS)" for [EST] items.

After this is done, the v1 simulator should:
- Display real GDV (CFO can verify against client's Excel)
- Display indicative-but-plausible TDC structure
- Respond to all 6 levers correctly
- Pass all reconciliation tests
- Be ready for pitch demo

---

## 9. What I'd like to see back from you

After implementation:

1. Confirmation that Test 1 (GDV) passes exactly
2. Final baseline KPI values (GDV, TDC, Net Profit, Margin)
3. List of [EST] items and their final calibrated values
4. Any new questions or issues you found
5. File size of dist/index.html (target < 200KB)

Don't start UI work until baseline + calculations are verified. We'll do UI in a separate pass.
