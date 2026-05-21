# CLAUDE.md — NCT Feasibility Simulator

> Operational guide for Claude Code working on this project. Read this first before writing any code.

---

## Project Context

This is a single-file HTML what-if simulator for a Malaysian property developer (NCT Group). It sits alongside a Microsoft Fabric + Power BI platform we're building for them. The CFO/CEO/Investment Committee will use this in meetings to explore feasibility scenarios without touching Excel or Power BI.

**Full functional spec is in `SPEC.md`. Read it before coding.**

This `CLAUDE.md` covers: conventions, project structure, gotchas, workflow with the human.

---

## Hard Constraints (do not violate)

### 1. Single file output
The deliverable is **one `.html` file**. All CSS inline in `<style>`, all JS inline in `<script>`, all data embedded as JS constants, all assets either omitted or base64-encoded.

If you find yourself wanting to add a `package.json` or `node_modules`, **stop and re-read this paragraph.** The user must be able to double-click the file in Windows Explorer and have it work, with no internet.

Exception: during development, you may keep files separate for readability. There must be a final **build step or single command** that concatenates everything into one HTML. Document this build step in `README.md`.

### 2. No runtime dependencies
- No CDN scripts
- No Google Fonts
- No `import` from URLs
- No `fetch()` calls in v1
- No localStorage / sessionStorage / IndexedDB writes in v1
- No analytics, no telemetry, no error reporting service

If user runs the file with WiFi off, every feature still works.

### 3. No frameworks
- No React, Vue, Svelte, Angular, Alpine, htmx
- Vanilla JS only
- DOM manipulation via standard APIs
- This is a deliberate choice — the file must be auditable by NCT's IT team, who may not know modern JS frameworks

### 4. ES2020+ is fine
Modern browsers only. You can use:
- Optional chaining, nullish coalescing
- Object spread, destructuring
- Async/await (even though we don't fetch — use for export download flow)
- Template literals
- `Intl.NumberFormat` for currency formatting

### 5. File size budget: 200 KB max
Stay under 200 KB for the final single HTML file. If we approach this, optimize before adding features.

---

## Project Structure

Use this layout during development:

```
nct-simulator/
├── SPEC.md                 # Functional spec — source of truth
├── CLAUDE.md               # This file
├── README.md               # Build instructions, how to update baseline
├── src/
│   ├── index.html          # Shell HTML + tab structure
│   ├── styles.css          # All CSS (both tabs)
│   ├── data/
│   │   └── baseline.js     # BASELINE_DATA constant including full cost_items tree
│   ├── lib/
│   │   ├── calculations.js # Pure functions: applyLevers, calculateGDV, expandCostItems, calculateKPIs
│   │   ├── formatters.js   # RM formatting, number animations, delta strings
│   │   └── data-loader.js  # Pluggable data source (P2 in spec)
│   ├── ui/
│   │   ├── tabs.js         # Tab switching (Simulator / Cost Detail)
│   │   ├── levers.js       # Lever rendering + slider binding
│   │   ├── kpis.js         # KPI card rendering + delta + animation (Simulator tab)
│   │   ├── cost-detail.js  # F_L2-style read-only table renderer (Cost Detail tab)
│   │   ├── summary.js      # Scenario summary sentence generator
│   │   └── export.js       # CSV + JSON dual-download
│   └── tests/
│       └── reconciliation.js  # Baseline matches Fabric values
├── build.sh                # Single-command build → dist/index.html
└── dist/
    └── index.html          # The final deliverable
```

**Why this structure during dev:** Easy to navigate, easy to test individual modules. The build step inlines everything.

**Build command:** Plain shell script using `cat` and simple substitution. No webpack, no rollup, no esbuild. NCT IT must be able to rebuild it without installing tooling.

**Build order matters:** baseline.js first → calculations.js → formatters → data-loader → ui modules → tests → mounted at end of body.

---

## Coding Conventions

### Naming
- Functions: `camelCase`, verb-noun (`calculateGDV`, `formatRM`, `bindSlider`)
- Constants: `UPPER_SNAKE` (`BASELINE_DATA`, `ZERO_LEVERS`)
- DOM IDs: `kebab-case` (`#lever-selling-price`, `#kpi-margin`)
- CSS classes: `kebab-case`, BEM-ish (`lever-card`, `lever-card__slider`, `kpi-hero`)

### Style
- 2-space indent
- Single quotes for strings, except in HTML
- Semicolons (this is finance — be explicit)
- Trailing commas in multi-line objects/arrays
- One concept per function — no 200-line god functions
- Comment WHY, not WHAT (the code shows what)

### Numbers and money
- All money stored internally as RM thousands (i.e. RM 1,611M shown as `1611000`)
- All percentages as numbers, not strings: `5` means 5%, not `"5%"`
- Formatting only at display time via `formatRM(value, options)`
- Use `Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' })` then strip "MYR" for cleaner display

### Calculation logic
- All formulas are **pure functions** — input → output, no DOM, no globals
- Take `baseline` and `levers` as arguments, never read globals
- Return new objects, never mutate inputs
- This makes them unit-testable AND portable to Fabric UDF later

---

## Critical Gotchas

### Gotcha 1 — Bumi discount math
Bumi is applied **per-unit-type** in `discount_stack`, not as a global %. When lever 6 adjusts it, you're adding `levers.bumi_discount` to each unit type's `bumi_pct` field. Don't apply it as a global discount on net GDV — that's wrong and double-counts retail (which has 0% bumi).

### Gotcha 2 — Interest calculation simplification
The spec uses a rough "× 50% × period" approximation for average outstanding balance. This is **deliberately simplified** for v1. Real interest calc needs monthly amortization. Document this clearly in code comments. Reconciliation test must use the same simplified math on the Fabric side.

### Gotcha 3 — Sales period stretching
Lever 3 (Sales Period) doesn't directly change GDV or construction cost. It only changes how long construction interest accrues. Make this explicit in the UI tooltip — CFO will be confused why "+25% sales period" doesn't change GDV.

### Gotcha 4 — Lever units differ
Levers 1, 2, 3 are **multiplier** (-20% means `× 0.80`).
Levers 4, 5, 6 are **additive delta** (+0.5% means `+ 0.5pp`).
This is because interest rate, A&P, Bumi are already percentages — multiplying a percentage is confusing for CFOs ("does +10% on 4.8% mean 5.28% or 14.8%?"). Additive is clearer for these.

**The UI must show this distinction clearly.** Levers 1-3 show "%" delta. Levers 4-6 show "pp" delta (percentage points).

### Gotcha 5 — Number animation must be cancellable
If user drags a slider rapidly, you'll fire 60+ recalculations per second. Each one starts a number-count animation. Without cancellation, you get a queue of animations fighting each other. Use a single `requestAnimationFrame` loop per KPI with a target value that updates immediately, and the loop chases it.

### Gotcha 6 — `Intl.NumberFormat` performance
Creating a new `Intl.NumberFormat` instance per render is slow. Create them once at module load, reuse.

### Gotcha 7 — Reset button must reset visually too
Not just lever values but slider thumb positions. Some browsers don't update slider DOM when you change the underlying value programmatically without dispatching an `input` event.

### Gotcha 8 — Cost Detail tab is READ-ONLY in v1
The Cost Detail tab displays the F_L2 breakdown but **must not be editable**. If users could edit individual cost items, it would create a parallel input mechanism that competes with the Excel + Pipeline source-of-truth model. This is a deliberate product decision, not a technical limitation.

Visual cues to reinforce read-only:
- No `<input>` elements in the cost rows
- No hover-edit affordances
- Cursor stays default (no `cursor: pointer` or `text`)
- If a user clicks a number, nothing happens (no edit popup)

### Gotcha 9 — Construction items scale proportionally
When lever 2 (Construction Cost) changes by -3%, the user expects to see EVERY construction sub-item (5.1, 5.2.1, 5.2.2, 5.3, 5.4, 5.5) drop by 3% in the Cost Detail tab. This is because the lever applies to `construction_cost_per_sf_gfa`, which scales the whole construction bill uniformly.

This is **financially correct** — in real life, when a contractor agrees to a 3% reduction, it applies to the whole contract, not just one sub-item.

In code, multiply each construction leaf's baseline by `construction_scale` (the ratio of adjusted to baseline construction_total). Don't try to be cleverer.

### Gotcha 10 — Derived items in Cost Detail
Item 4.4 (Land Holding Interest), 17.1 (A&P + Commission), 17.3 (Admin Fees), 19 (Construction Interest) are computed, not input. In the Cost Detail tab:
- Show them with a small "(derived)" annotation
- Gray out the text slightly so users don't mistake them for input values they should edit
- The CSV export's "Action" column should say `(no action - auto)` for these

QS won't go change "Land Holding Interest" in Excel because it's a formula, not an input. The CSV must make this obvious.

### Gotcha 11 — Aggregate rows can drift from sum of children
In the live calculation, aggregates (like 5.2 Sub-Structural) are computed as sum-of-children of leaf items. But when lever 2 scales all construction items by 3%, the aggregate's displayed value should ALSO show as scaled (not re-summed from children, which could float-error).

Display rule: aggregates show `sum of their leaf children's adjusted values`, computed after all leaves have been scaled. This guarantees the aggregate displayed value === sum of displayed leaves, with no rounding mismatch in the UI.

### Gotcha 12 — CSV with BOM for Excel
Excel on Windows opens UTF-8 CSV as Latin-1 unless there's a BOM. Prepend `\uFEFF` to the CSV string before creating the Blob. This matters even for pure ASCII content — without BOM, Malaysian users with Malay column headers (or any non-ASCII) will see garbage.

```javascript
const BOM = '\uFEFF';
const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
```

### Gotcha 13 — Two simultaneous downloads
Triggering two `<a download>` clicks in quick succession can be blocked by some browsers (treated as multi-download which requires permission). Solution:
- Trigger first download (CSV)
- `await new Promise(r => setTimeout(r, 100))` 
- Trigger second download (JSON)

OR: stuff both files into a single download by giving the user a choice (CSV or JSON, not both). For v1, do the two-step download with the 100ms gap.

### Gotcha 14 — Tab state vs lever state
Lever changes persist across tab switches. Tabs are purely a view layer — the underlying state lives in a single `state` object (`{levers, baseline}`). Both tabs subscribe to state changes and re-render their portion. Don't put state in DOM data attributes.

### Gotcha 15 — Calibration runs once at load, mutates BASELINE_DATA in place
`calibrateEstimatedCosts(BASELINE_DATA, 20)` is called by `data-loader.js` at startup.
It scales all `is_estimated: true` cost items by a uniform factor (~10x for current data)
so the baseline produces a 20% net margin.

Key rules:
- Cost items with `is_estimated: true` and `amount_thousand === 0` are NOT scaled (0 × anything = 0). This is intentional — zero means "genuinely not applicable" (e.g. GST).
- BASELINE_DATA is mutated in place. `calculateKPIs(BASELINE_DATA, ZERO_LEVERS)` after
  calibration returns the calibrated baseline, not the raw-seed baseline.
- `BASELINE_DATA._calibration` holds the calibration report (scale factor, target TDC, etc.).
  Read this for debugging or displaying provenance information in the UI.
- When all `is_estimated` items become real (client provides values), set `TARGET_NET_MARGIN_PCT`
  to `null` in `baseline.js` and skip calling `calibrateEstimatedCosts` in `data-loader.js`.
- The calibration factor will change whenever real data replaces estimated items — always
  re-run `bash build.sh` after updating `baseline.js`.

### Gotcha 16 — Bumi is a TDC cost item (Item 20), NOT a per-unit discount
The original SPEC had Bumi as `discount_stack.bumi_pct` on each residential unit.
The real F_L2 structure has Bumi as **Item 20: Bumi Contribution** — a cost on the
TDC side, calculated as % of net GDV. Lever 6 adjusts `bumi_contribution_pct_of_gdv`.

Consequence: `discount_stack` now has 4 fields only (early_bird, staff, promotion, others).
There is no `bumi_pct` in `discount_stack`. Do not re-add it.

### Gotcha 17 — Lever 5 splits its delta between two separate GDV% items
Lever 5 (A&P + Commission) adjusts `advertising_promotion_pct_of_gdv` AND
`agent_commission_pct_of_gdv` simultaneously. The lever's delta is split equally:
+1pp on lever 5 → +0.5pp on advertising, +0.5pp on commission.
Both items appear as separate rows (17.1 and 18) in the Cost Detail tab.

---

## Workflow with the human (Kim Hoo)

### What he wants from you
- Working code over conversation
- Show your reasoning when making design tradeoffs
- Ask before adding scope. The spec is intentionally minimal.

### What he doesn't want
- Frameworks "to make it easier"
- Long explanations of obvious code
- Premature optimization
- Speculative features ("we might want to add X someday")

### When to ask vs proceed
**Just do it without asking:**
- Following the spec
- Standard refactors
- Bug fixes
- Test additions

**Stop and ask:**
- Anything that adds a runtime dependency
- Anything that changes the calculation formulas
- UX decisions not in the spec (e.g. "should the reset confirm?")
- Adding scope from the v1.x roadmap into v1

### Reporting progress
After completing a logical chunk, summarize:
- What you built
- What you tested
- What's still TODO from the spec
- Any deviations from spec (with reasoning)
- Open questions

---

## Testing strategy

### Reconciliation tests (mandatory)
File: `src/tests/reconciliation.js`

These verify the simulator's baseline matches what Fabric will compute. Run on every page load in dev mode, log to console:

```javascript
const RECONCILIATION_TARGETS = {
  gdv_thousand: 1611000,    // What Fabric / Power BI reports for Emira baseline
  tdc_thousand: 1247000,
  net_profit_thousand: 364000,
  margin_pct: 22.6,
  tolerance_thousand: 1000,
  tolerance_pct: 0.1
};
```

If any baseline number drifts, **block the build** (exit non-zero in `build.sh`). This is the contract.

### Sensitivity tests
Verify lever effects are roughly proportional:
- Selling price +10% should increase net profit by ~13-18% (because TDC has fixed components)
- Construction cost -10% should increase net profit by ~30-40% (construction is the largest cost)

These act as smoke tests against accidental formula breakage.

### Boundary tests
- All levers at extreme negative → should not produce NaN, negative GDV, or infinite values
- All levers at extreme positive → margin should be capped reasonably (no >100% margin)

### Manual test checklist
Document a 12-minute manual test pass in `README.md`:
1. Open file with WiFi off — works?
2. Default tab is Simulator. KPIs show baseline values.
3. Drag selling price slider — KPIs animate smoothly?
4. Switch to Cost Detail tab — see baseline values, no deltas yet.
5. Switch back to Simulator. Set Construction Cost to -3%.
6. Switch to Cost Detail tab — see all 5.x items scaled by ~3%, deltas shown.
7. Click reset — all sliders return to 0, Cost Detail returns to baseline.
8. Set a few levers, click Export. Two files download: CSV and JSON.
9. Open CSV in Excel — opens correctly, no garbled characters, Action column populated.
10. Open JSON in text editor — valid JSON, contains levers + kpis + cost_detail.
11. Set all levers to extremes — no console errors, no NaN, no negative GDV?
12. Try clicking a number in Cost Detail tab — nothing happens (read-only confirmed)?
13. Print preview of both tabs — readable on A4 landscape?
14. Open in Edge, Safari — all work?
15. Check file size — under 200KB?

---

## Future-proofing for v2+

### The data loader contract
Keep `data-loader.js` as the ONLY place that knows where data comes from. Everything else takes baseline data as an argument.

When v2 swaps to dynamic Fabric REST, **only `data-loader.js` changes**. UI, calculations, formatters all stay the same.

```javascript
// src/lib/data-loader.js
// v1 — static embedded
export async function loadBaseline() {
  return BASELINE_DATA;
}

// v2 (future) — fetch from SharePoint
// export async function loadBaseline() {
//   const res = await fetch('./baseline.json', { cache: 'no-cache' });
//   if (!res.ok) throw new Error('Failed to load baseline');
//   return await res.json();
// }

// v3 (future) — Fabric REST with OAuth
// export async function loadBaseline() {
//   const token = await msal.acquireTokenSilent({ scopes: ['https://api.fabric.microsoft.com/.default'] });
//   const res = await fetch('https://api.fabric.microsoft.com/v1/workspaces/.../...', {
//     headers: { Authorization: `Bearer ${token.accessToken}` }
//   });
//   return await res.json();
// }
```

### The calculations contract
Same idea — calculation functions take baseline as input, never read globals. This means they can be ported to Fabric User Data Functions later (Fabric UDF supports JS) without rewriting.

---

## How to update baseline data (operational note)

When the client provides actual numbers from a new project, update `src/data/baseline.js`. Re-run reconciliation tests. Re-run build. Re-upload `dist/index.html` to SharePoint.

**Future state:** When v2 ships, this becomes "update `baseline.json` in SharePoint, no rebuild needed."

---

## Things that have burned us before

These are real lessons from prior attempts on similar projects. Read carefully.

1. **Inline SVG without viewBox breaks at high DPI.** Always set viewBox.
2. **`input type=range`'s value is a string.** Always `parseFloat()`.
3. **`new Intl.NumberFormat()` is slow.** Cache the instance.
4. **`addEventListener('input')` fires per pixel.** Throttle or use rAF.
5. **Async export download in Safari requires user gesture.** Use `<a download>` click pattern, not blob URL alone.
6. **Print stylesheet must hide sliders, show locked values.** Otherwise printed page shows empty grey bars.
7. **Don't use `document.write()` ever.** It rebuilds the document.

---

## Definition of Done

A v1 PR is ready when:

- [ ] All acceptance criteria in SPEC.md §13 are met
- [ ] Reconciliation tests pass against current baseline
- [ ] Cost Detail tab leaf sum + derived items === TDC (internal consistency test)
- [ ] Both tabs render correctly, switching is instant, state persists across switches
- [ ] Cost Detail tab is confirmed read-only (no editable inputs, no edit affordances)
- [ ] CSV export opens cleanly in Excel with no encoding issues
- [ ] CSV "Action" column populated meaningfully (lever-driven items get "Reduce/Increase by N%"; derived items get "(no action - auto)")
- [ ] JSON export is valid and complete (levers + baseline_kpis + scenario_kpis + cost_detail array)
- [ ] `build.sh` produces a working single-file `dist/index.html`
- [ ] File size under 200 KB
- [ ] Manual test checklist in README.md is complete (15 steps)
- [ ] No console errors or warnings at idle
- [ ] Code is commented where non-obvious (especially calculation simplifications and the construction-scale logic)
- [ ] README.md explains: how to update baseline, how to build, how to deploy to SharePoint
- [ ] No `TODO` comments left in code without an issue number or v1.x tag

---

## Final note

**This simulator's job is to make CFOs trust the numbers in 3 seconds.** Not impress them with features. Every design decision optimizes for that.

If you ever feel tempted to add complexity, ask: "Does this help a 55-year-old CFO understand their project better in a Tuesday morning IC meeting?" If not, cut it.
