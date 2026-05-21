# NCT Feasibility Simulator — Emira Shah Alam

Single-file HTML what-if simulator for NCT Group property feasibility meetings.
Double-click `dist/index.html` — works offline, no install needed.

---

## Current Status

**Build is blocked** — reconciliation tests fail. See `BLOCKERS.md` for the two items
that need NCT QS team input before the build can proceed:
1. Sales data (unit prices/counts) does not produce the target GDV of RM 1,611M
2. Cost items 9–16 from the F_L2 sheet are missing (~RM 931M of TDC)

The calculation engine and test framework are complete. Once correct data is supplied,
the build will unblock.

---

## How to build

Requires: Node.js (for reconciliation tests). No other tooling.

```bash
bash build.sh
```

This will:
1. Run reconciliation tests (blocks build if they fail)
2. Concatenate all src/ files into `dist/index.html`
3. Check file size stays under 200 KB

---

## How to update baseline data

When NCT QS provides updated project numbers:

1. Open `src/data/baseline.js`
2. Update `BASELINE_DATA.sales` (selling prices, unit counts, discount stack)
3. Update `BASELINE_DATA.cost_items` (add/change cost line items)
4. Update `BASELINE_DATA.derived_params` and `BASELINE_DATA.financing` as needed
5. Update `meta.refreshed_at` and `meta.baseline_version`
6. Run `bash build.sh` — reconciliation tests will validate the new numbers
7. Deploy `dist/index.html` to SharePoint document library

For a different project (not Emira), update `meta.project_id` and `meta.project_name`
and provide all new cost and sales data.

---

## Project structure

```
src/
  data/
    baseline.js          ← BASELINE_DATA constant + ZERO_LEVERS
  lib/
    calculations.js      ← pure functions: applyLevers, calculateGDV, expandCostItems, calculateKPIs
    formatters.js        ← RM formatting, delta display
    data-loader.js       ← pluggable data source (v1: returns BASELINE_DATA; v2+: fetch)
  ui/
    tabs.js              ← tab switching (Simulator / Cost Detail)
    levers.js            ← lever rendering + slider binding
    kpis.js              ← KPI card rendering + animation
    cost-detail.js       ← read-only F_L2 table renderer
    summary.js           ← scenario summary sentence
    export.js            ← CSV + JSON dual-download
  tests/
    reconciliation.js    ← runs baseline vs Fabric targets; blocks build on failure
  index.html             ← HTML shell + tab layout
  styles.css             ← all styles
dist/
  index.html             ← final deliverable (do not edit directly)
build.sh                 ← build script
SPEC.md                  ← functional specification (source of truth for formulas)
CLAUDE.md                ← coding conventions and gotchas
BLOCKERS.md              ← unresolved issues blocking build
```

---

## How to deploy to SharePoint

1. Run `bash build.sh` successfully
2. Open SharePoint document library: [location TBD by NCT IT]
3. Upload `dist/index.html`
4. Share the link with CFO/IC team

The file has zero runtime dependencies — it works from any location, including
local disk, SharePoint, or email attachment. No server needed.

---

## Manual test checklist (15-step)

Perform before each release. Takes ~12 minutes.

1. Open `dist/index.html` by double-click with WiFi off — full UI renders, no errors?
2. Default tab is Simulator. KPIs show baseline values matching Fabric report?
3. Drag Selling Price slider — KPIs animate smoothly, no lag?
4. Switch to Cost Detail tab — shows baseline values, no delta markers yet?
5. Switch back to Simulator. Set Construction Cost to -3%.
6. Switch to Cost Detail tab — all 5.x items show ~-3% delta?
7. Click Reset — all sliders return to 0, Cost Detail returns to baseline?
8. Set a few levers, click Export. Two files download (CSV and JSON)?
9. Open CSV in Excel — opens correctly, no garbled characters, Action column populated?
10. Open JSON in text editor — valid JSON, contains levers + kpis + cost_detail?
11. Set all levers to extremes — no console errors, no NaN, no negative GDV?
12. Try clicking a number in Cost Detail — nothing happens (read-only confirmed)?
13. Print preview of both tabs — readable on A4 landscape?
14. Open in Edge; open in Safari — all features work?
15. Check file size: under 200 KB?

Record pass/fail for each step. Do not ship if any step fails.

---

## v2+ roadmap notes

Future upgrades are designed to require minimal code changes:

- **v1.2 localStorage save:** add save/load to `src/ui/export.js`
- **v2.0 Dynamic baseline (SharePoint JSON):** change only `src/lib/data-loader.js`
- **v3.0 Direct Fabric REST + OAuth:** change only `src/lib/data-loader.js`

The calculation functions in `calculations.js` are pure (input → output, no DOM),
making them portable to Fabric User Data Functions (Fabric UDF supports JS).
