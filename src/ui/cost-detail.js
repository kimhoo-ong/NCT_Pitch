// cost-detail.js — read-only F_L2 table renderer
//
// Gotcha 8: Cost Detail tab is STRICTLY READ-ONLY. No <input> elements, no hover
// affordances, no cursor: pointer/text. Clicking a number does nothing.
//
// Table structure:
//   thead: sticky header row
//   tbody: cost items (headers, aggregates, leaves)
//   tfoot: TDC, GDV, Profit, Margin totals
//
// Indent by level (CSS class indent-1/2/3).
// Derived items show a small "(derived)" badge.
// Estimated items show a gold [i] badge.
// Delta colors: cost↓ = green (good), cost↑ = red (bad). GDV reversed.

function renderCostDetail() {
  _renderAdjustmentPills();
  _renderTable();
}

function _renderAdjustmentPills() {
  const pills = document.getElementById('adjustments-pills');
  if (!pills || typeof state === 'undefined') return;

  const LEVER_LABELS = {
    selling_price:    'Selling',
    construction_cost:'Construction',
    sales_period:     'Sales Period',
    interest_rate:    'Interest Rate',
    ap_commission:    'A&P + Comm',
    bumi_discount:    'Bumi Contrib',
  };

  pills.innerHTML = Object.entries(state.levers).map(([key, val]) => {
    const label = LEVER_LABELS[key] || key;
    const zero  = Math.abs(val) < 1e-9;
    const sign  = val > 0 ? '+' : '';
    const unit  = ['selling_price','construction_cost','sales_period'].includes(key) ? '%' : 'pp';
    return `<span class="adjustment-pill${zero ? ' zero' : ''}">${label}: ${zero ? '0' : sign + val}${unit}</span>`;
  }).join('');
}

function _fmt(n) {
  if (n === null || n === undefined) return '—';
  return Math.round(n).toLocaleString('en-MY');
}

function _fmtDelta(d, isGDV) {
  if (d === null || d === undefined || Math.abs(d) < 1) return '<span class="delta-zero">(=)</span>';
  const rounded = Math.round(d);
  const sign = rounded > 0 ? '+' : '';
  // For GDV line: up = good. For cost lines: up = bad.
  const cls = isGDV
    ? (rounded > 0 ? 'delta-positive' : 'delta-negative')
    : (rounded < 0 ? 'delta-negative' : 'delta-positive');
  return `<span class="${cls}">${sign}${rounded.toLocaleString('en-MY')}</span>`;
}

function _renderTable() {
  const table = document.getElementById('cost-table');
  if (!table || typeof state === 'undefined') return;

  const kpis = calculateKPIs(state.baseline, state.levers);
  const items = kpis.cost_detail;

  // ── thead ──
  const thead = `
    <thead>
      <tr>
        <th style="width:60px;">Item</th>
        <th>Description</th>
        <th style="width:110px;">Baseline<br><span style="font-size:9px;font-weight:400;">(RM '000)</span></th>
        <th style="width:110px;">Scenario<br><span style="font-size:9px;font-weight:400;">(RM '000)</span></th>
        <th style="width:90px;">Δ</th>
      </tr>
    </thead>`;

  // ── tbody ──
  let tbodyRows = '';
  items.forEach(item => {
    const indentClass = `indent-${item.level}`;
    const roleClass   = `row-${item.row_role}`;
    const isHeader    = item.row_role === 'header';
    const isDerived   = item.calc !== 'input' && item.calc !== 'rollup' && item.calc !== null;
    const isEst       = item.is_estimated;
    const isAggregate = item.row_role === 'aggregate';

    if (isHeader) {
      tbodyRows += `
        <tr class="row-header ${indentClass}">
          <td class="td-label" colspan="2" style="padding-left:${(item.level-1)*20}px">
            ${item.item_no} &nbsp; ${item.label}
          </td>
          <td class="num">—</td>
          <td class="num">—</td>
          <td class="num">—</td>
        </tr>`;
      return;
    }

    const baseAmt = item.baseline_amount_thousand;
    const adjAmt  = item.adjusted_amount_thousand;
    const delta   = item.delta_thousand;

    const badges = [
      isDerived ? '<span class="derived-badge">(derived)</span>' : '',
      isEst     ? '<span class="indicative-badge" title="Indicative — confirm with QS">[i]</span>' : '',
      isAggregate && !isDerived ? '<span class="derived-badge">*</span>' : '',
    ].join('');

    tbodyRows += `
      <tr class="${roleClass} ${isDerived ? 'row-derived' : ''} ${indentClass}">
        <td class="td-label" style="color:var(--ink-dim);font-size:11px;">${item.item_no}</td>
        <td class="td-label" style="padding-left:${(item.level-1)*20}px">
          ${item.label}${badges}
        </td>
        <td class="num">${_fmt(baseAmt)}</td>
        <td class="num">${_fmt(adjAmt)}</td>
        <td class="num">${_fmtDelta(delta, false)}</td>
      </tr>`;
  });

  // ── tfoot totals ──
  const gdvBase = state.baseline ? calculateGDV(state.baseline).net_gdv_thousand : 0;
  const tfoot = `
    <tfoot>
      <tr class="row-total">
        <td colspan="2">TOTAL DEVELOPMENT COST</td>
        <td class="num">${_fmt(kpis._baselineTDC)}</td>
        <td class="num">${_fmt(kpis.tdc_thousand)}</td>
        <td class="num">${_fmtDelta(kpis.tdc_thousand - kpis._baselineTDC, false)}</td>
      </tr>
      <tr class="row-net-gdv row-gdv">
        <td colspan="2">TOTAL NET GDV</td>
        <td class="num">${_fmt(gdvBase)}</td>
        <td class="num">${_fmt(kpis.gdv_thousand)}</td>
        <td class="num">${_fmtDelta(kpis.gdv_thousand - gdvBase, true)}</td>
      </tr>
      <tr class="row-profit">
        <td colspan="2">NET PROFIT</td>
        <td class="num">${_fmt(kpis._baselineProfit)}</td>
        <td class="num">${_fmt(kpis.net_profit_thousand)}</td>
        <td class="num">${_fmtDelta(kpis.net_profit_thousand - kpis._baselineProfit, true)}</td>
      </tr>
      <tr class="row-margin">
        <td colspan="2">NET MARGIN</td>
        <td class="num">${kpis._baselineMargin ? kpis._baselineMargin.toFixed(1) + '%' : '—'}</td>
        <td class="num">${kpis.margin_pct.toFixed(1)}%</td>
        <td class="num">${_fmtDelta(kpis._baselineMargin ? (kpis.margin_pct - kpis._baselineMargin) : null, true)}</td>
      </tr>
    </tfoot>`;

  table.innerHTML = thead + '<tbody>' + tbodyRows + '</tbody>' + tfoot;
}

if (typeof module !== 'undefined') module.exports = { renderCostDetail };
