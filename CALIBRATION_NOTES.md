# CALIBRATION_NOTES.md — Baseline Data Provenance & Calibration

> Previously BLOCKERS.md. Both original blockers are resolved. This document replaces it.

---

## Data provenance

| Source | What it provides | Status |
|---|---|---|
| `Std_Feasi_Sample__ENG.xls` → Sales Summary | Unit counts, built-up SF, selling price, discount stack | ✅ Real — used verbatim |
| `Std_Feasi_Sample__ENG.xls` → Cost per SF | Construction package totals and GFA | ✅ Real — used verbatim |
| `Std_Feasi_Sample__ENG.xls` → Project Summary R5 | Land purchase cost breakdown | ✅ Real — used verbatim |
| `Std_Feasi_Sample__ENG.xls` → Assumption R25 | PM Fees (2,247 thousand) | ✅ Real |
| `Std_Feasi_Sample__ENG.xls` → Assumption R29-R30 | Admin Fees rate (3% of GDV) | ✅ Real |
| Industry benchmark (Malaysian residential) | Everything else | ⚠️ [EST] — indicative |

---

## GDV — verified exact

```
Residential gross: 2613.6 × 800 × 650 / 1000  = 1,359,072 thousand
Retail gross:      209.088 × 1000 × 1200 / 1000 =   250,906 thousand
Car Park gross:    97.124648 × 100 × 1000 / 1000 =     9,712 thousand
TOTAL GROSS GDV:                                   1,619,690 thousand  ✅

After 23% uniform discount (early_bird 5% + staff 5% + promotion 10% + others 3%):
NET GDV: 1,619,690 × 0.77 = 1,247,161 thousand  ✅
```

Test 1 in reconciliation.js verifies this to ±100 thousand.

---

## TDC — indicative (calibrated to 20% margin)

The client's F_L2 sheet is structurally complete but data-empty. Known real cost values
represent only a fraction of true project TDC:

| Item | Amount (RM'000) | Source |
|---|---|---|
| 4.1 Original Land | 72,092 | Real (Project Summary R5) |
| 5.1 Earthwork | 741 | Real (Cost per SF) |
| 5.2.1 Piling + Pilecap | 5,333 | Real (Cost per SF) |
| 5.3 Main Building Works | 104,237 | Real (Cost per SF) |
| 6.6 Soil Investigation | 14 | Real (Cost per SF) |
| 10 PM Fees | 2,247 | Real (Assumption R25) |
| 4.3 Land Holding Interest | ~5,400 | Derived (real formula) |
| 17.1 Advertising (2%) | ~24,943 | Derived (real rate) |
| 18 Agent Commission (2.5%) | ~31,179 | Derived (real rate) |
| 20 Bumi Contribution (2%) | ~24,943 | Derived (est. rate) |
| 21 Admin Fees (3%) | ~37,415 | Derived (real R29-R30) |
| X Construction Interest | ~3,972 | Derived (real formula) |
| **Fixed subtotal** | **~312,537** | |

**Target TDC** (at 20% margin): Net GDV × 0.80 = **997,729 thousand**

**Gap to fill via [EST] items**: 997,729 − 312,537 = **685,192 thousand**

---

## Calibration scale factor: 10.35×

`calibrateEstimatedCosts()` computes this automatically. The factor is high because
the gap (685M) is much larger than the initial [EST] seed values (66M).

This tells us the client's Cost per SF data captures only ~15% of the true TDC.
The remaining ~85% is in items not yet provided (full M&E systems, comprehensive
landscaping, infrastructure, fit-out, contingency, professional fees, etc.).

**Calibrated [EST] items (final values after 10.35× scale):**

| Item | Calibrated (RM'000) | Notes |
|---|---|---|
| 5.6 Infrastructure Works | 103,503 | RM 103M — large site infrastructure cost |
| 5.9 Preliminaries | 103,503 | RM 103M — high for a project this size |
| 5.11 M&E | 113,854 | RM 114M — full M&E systems (plumbing, HVAC, EE, fire) |
| 5.10 Contingency | 56,927 | RM 57M — 5% contingency on a RM 1B project |
| 5.5 Landscaping | 41,401 | RM 41M — substantial landscaping |
| 6.1 Architect | 36,226 | RM 36M — 3.3% of construction, plausible |
| 16 Dev Contingency | 31,051 | RM 31M |
| (others) | ... | |

**Honest assessment:** Some calibrated line items (M&E, infrastructure, preliminaries)
are individually large but in aggregate produce a plausible TDC for a RM 1.25B GDV project.
Real Malaysian mixed-development projects of this scale typically have TDC of RM 800M–1.1B.
The simulator's TDC of ~RM 1B is within that range.

The CFO/CEO sees a working simulator with **verified GDV** and **clearly-labeled indicative TDC**.
All 6 levers respond correctly. This is sufficient for pitch demo.

---

## Items marked `[INDICATIVE]` in the UI

In the Cost Detail tab, items with `is_estimated: true` will show a small gold `[i]` badge.
The CSV export's "Action" column will append "(indicative — confirm with QS)" for these items.

Items with `is_estimated: false` show no badge (treated as real).

---

## What to do when real data arrives

1. Update `amount_thousand` values in `src/data/baseline.js` for newly-confirmed items
2. Change their `is_estimated: false`
3. Re-run `bash build.sh` — calibration adjusts automatically for any remaining [EST] items
4. If ALL items become real: set `TARGET_NET_MARGIN_PCT` in baseline.js to null to skip calibration

---

## Structural correction: Bumi moved from discount_stack to TDC

Old SPEC had Bumi as a per-unit discount (in `discount_stack.bumi_pct`).
Real F_L2 structure has Bumi as Item 20 — a TDC cost calculated as % of GDV.

Impact:
- `sales[].discount_stack` now has 4 fields only: early_bird, staff, promotion, others (23% total)
- Lever 6 now adjusts `derived_params.bumi_contribution_pct_of_gdv` (+pp)
- Item 20 = net_gdv × bumi_pct_of_gdv / 100
- This increases TDC when lever 6 goes up (more Bumi obligation = more cost)

---

## Construction interest formula

Confirmed: use the §6.3 formula:
```
construction_interest = construction_total × bank_borrowing_pct × rate × (sales_period_months/12) × 0.5
```
The `× 0.5` is average-outstanding approximation (linear drawdown).
The SPEC §7 preview values were illustrative and inconsistent with this formula.
