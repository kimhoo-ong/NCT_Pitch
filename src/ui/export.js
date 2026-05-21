// export.js — CSV (UTF-8 BOM) + JSON dual-download
//
// Gotcha 12: CSV must have UTF-8 BOM (﻿) so Excel on Windows opens correctly.
// Gotcha 13: Two <a download> clicks in quick succession → browser blocks second.
//   Solution: 100ms gap between downloads (Safari also needs user-gesture pattern).

async function handleExport() {
  const kpis  = calculateKPIs(state.baseline, state.levers);
  const baseK = calculateKPIs(state.baseline, ZERO_LEVERS);
  const meta  = state.baseline.meta;
  const ts    = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
  const fname = `${meta.project_id}_scenario_${ts}`;

  downloadCSV(fname, kpis, baseK, state.levers, state.baseline, meta);
  await new Promise(r => setTimeout(r, 100));  // Gotcha 13
  downloadJSON(fname, kpis, baseK, state.levers, state.baseline, meta);
}

// ── CSV ───────────────────────────────────────────────────────────────────────

function downloadCSV(fname, kpis, baseK, levers, baseline, meta) {
  const rows = [];

  rows.push(['NCT Feasibility Scenario Report']);
  rows.push(['Project', meta.project_name]);
  rows.push(['Baseline', `${meta.baseline_version} (${meta.refreshed_at})`]);
  rows.push(['Generated', new Date().toISOString()]);
  rows.push(['TDC Note', meta.tdc_label || 'Indicative']);
  rows.push([]);

  rows.push(['LEVERS']);
  rows.push(['Lever', 'Baseline', 'Adjustment', 'Result']);

  const leverRows = [
    ['Selling Price',       '(baseline)', `${levers.selling_price > 0 ? '+' : ''}${levers.selling_price}%`, `×${(1 + levers.selling_price / 100).toFixed(2)}`],
    ['Construction Cost',   '(baseline)', `${levers.construction_cost > 0 ? '+' : ''}${levers.construction_cost}%`, `×${(1 + levers.construction_cost / 100).toFixed(2)}`],
    ['Sales Period',        `${baseline.financing.sales_period_months} months`, `${levers.sales_period > 0 ? '+' : ''}${levers.sales_period}%`, `${(baseline.financing.sales_period_months * (1 + levers.sales_period / 100)).toFixed(0)} months`],
    ['Interest Rate',       `${baseline.financing.interest_rate_pct}%`, `${levers.interest_rate > 0 ? '+' : ''}${levers.interest_rate}pp`, `${(baseline.financing.interest_rate_pct + levers.interest_rate).toFixed(1)}%`],
    ['A&P + Commission',    `${(baseline.derived_params.advertising_promotion_pct_of_gdv + baseline.derived_params.agent_commission_pct_of_gdv).toFixed(1)}%`, `${levers.ap_commission > 0 ? '+' : ''}${levers.ap_commission}pp`, `${(baseline.derived_params.advertising_promotion_pct_of_gdv + levers.ap_commission / 2 + baseline.derived_params.agent_commission_pct_of_gdv + levers.ap_commission / 2).toFixed(1)}%`],
    ['Bumi Contribution',   `${baseline.derived_params.bumi_contribution_pct_of_gdv.toFixed(1)}%`, `${levers.bumi_discount > 0 ? '+' : ''}${levers.bumi_discount}pp`, `${(baseline.derived_params.bumi_contribution_pct_of_gdv + levers.bumi_discount).toFixed(1)}%`],
  ];
  rows.push(...leverRows);
  rows.push([]);

  rows.push(["KPI SUMMARY (RM '000)"]);
  rows.push(['KPI', 'Baseline', 'Scenario', 'Delta', 'Delta %']);
  rows.push(['GDV (Net)',   Math.round(baseK.gdv_thousand),        Math.round(kpis.gdv_thousand),        _sign(kpis.gdv_thousand - baseK.gdv_thousand),           _signPct((kpis.gdv_thousand - baseK.gdv_thousand) / baseK.gdv_thousand * 100)]);
  rows.push(['TDC',        Math.round(baseK.tdc_thousand),        Math.round(kpis.tdc_thousand),        _sign(kpis.tdc_thousand - baseK.tdc_thousand),           _signPct((kpis.tdc_thousand - baseK.tdc_thousand) / baseK.tdc_thousand * 100)]);
  rows.push(['Net Profit', Math.round(baseK.net_profit_thousand), Math.round(kpis.net_profit_thousand), _sign(kpis.net_profit_thousand - baseK.net_profit_thousand), _signPct((kpis.net_profit_thousand - baseK.net_profit_thousand) / baseK.net_profit_thousand * 100)]);
  rows.push(['Margin %',   baseK.margin_pct.toFixed(2),          kpis.margin_pct.toFixed(2),          _sign(kpis.margin_pct - baseK.margin_pct) + 'pp', '(pp)']);
  rows.push([]);

  rows.push(["COST DETAIL (RM '000)"]);
  rows.push(['Item No', 'Description', 'Baseline', 'Scenario', 'Delta', 'Action']);

  kpis.cost_detail.forEach(item => {
    if (item.row_role === 'header') {
      rows.push([item.item_no, item.label.toUpperCase(), '', '', '', '']);
      return;
    }

    const baseAmt = item.baseline_amount_thousand !== null ? Math.round(item.baseline_amount_thousand) : '';
    const adjAmt  = item.adjusted_amount_thousand !== null ? Math.round(item.adjusted_amount_thousand) : '';
    const delta   = item.delta_thousand !== null ? Math.round(item.delta_thousand) : '';

    let action = '';
    if (item.calc === 'derived_interest' || item.calc === 'derived_pct_gdv') {
      action = '(no action — auto)';
    } else if (item.calc === 'rollup') {
      action = '';
    } else if (item.is_estimated) {
      // Construction items that scaled
      if (item.item_no.startsWith('5.') && Math.abs(levers.construction_cost) > 1e-9) {
        const pct = levers.construction_cost;
        action = `${pct < 0 ? 'Reduce' : 'Increase'} by ${Math.abs(pct)}% (indicative — confirm with QS)`;
      } else if (item.delta_thousand && Math.abs(item.delta_thousand) > 0.5) {
        action = '(indicative — confirm with QS)';
      }
    } else if (item.item_no.startsWith('5.') && Math.abs(levers.construction_cost) > 1e-9) {
      const pct = levers.construction_cost;
      action = `${pct < 0 ? 'Reduce' : 'Increase'} by ${Math.abs(pct)}%`;
    }

    rows.push([item.item_no, item.label + (item.is_estimated ? ' [INDICATIVE]' : ''), baseAmt, adjAmt, delta, action]);
  });

  const BOM = '﻿';  // Gotcha 12: Excel needs BOM to open UTF-8 correctly
  const csv = BOM + rows.map(r => r.map(_csvCell).join(',')).join('\r\n');
  _triggerDownload(fname + '.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
}

function _sign(n)    { return n >= 0 ? '+' + Math.round(n) : '' + Math.round(n); }
function _signPct(n) { return n >= 0 ? '+' + n.toFixed(1) + '%' : n.toFixed(1) + '%'; }
function _csvCell(v) {
  const s = String(v ?? '');
  return /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// ── JSON ──────────────────────────────────────────────────────────────────────

function downloadJSON(fname, kpis, baseK, levers, baseline, meta) {
  const ts = new Date().toISOString();
  const payload = {
    scenario_id: 'scn_' + ts.replace(/[:.]/g, '-').slice(0, 19),
    project_id:  meta.project_id,
    project_name: meta.project_name,
    baseline_version: meta.baseline_version,
    baseline_refreshed_at: meta.refreshed_at,
    tdc_note: meta.tdc_label || 'Indicative',
    scenario_created_at: ts,
    levers,
    baseline_kpis: {
      gdv_thousand:        Math.round(baseK.gdv_thousand),
      tdc_thousand:        Math.round(baseK.tdc_thousand),
      net_profit_thousand: Math.round(baseK.net_profit_thousand),
      margin_pct:          Math.round(baseK.margin_pct * 10) / 10,
    },
    scenario_kpis: {
      gdv_thousand:        Math.round(kpis.gdv_thousand),
      tdc_thousand:        Math.round(kpis.tdc_thousand),
      net_profit_thousand: Math.round(kpis.net_profit_thousand),
      margin_pct:          Math.round(kpis.margin_pct * 10) / 10,
    },
    cost_detail: kpis.cost_detail
      .filter(i => i.row_role !== 'header')
      .map(i => ({
        item_no:              i.item_no,
        description:          i.label,
        is_estimated:         i.is_estimated,
        baseline_thousand:    i.baseline_amount_thousand !== null ? Math.round(i.baseline_amount_thousand) : null,
        adjusted_thousand:    i.adjusted_amount_thousand !== null ? Math.round(i.adjusted_amount_thousand) : null,
        delta_thousand:       i.delta_thousand !== null ? Math.round(i.delta_thousand) : null,
        calc:                 i.calc,
      })),
  };

  _triggerDownload(
    fname + '.json',
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
  );
}

// ── Download trigger ──────────────────────────────────────────────────────────

// Uses <a download> pattern — Safari requires user-gesture; this is called from a
// button click so the gesture is preserved (Gotcha: blob URL alone doesn't work in Safari).
function _triggerDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

if (typeof module !== 'undefined') module.exports = { handleExport };
