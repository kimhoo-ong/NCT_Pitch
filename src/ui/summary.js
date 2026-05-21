// summary.js — auto-generated scenario sentence under KPI cards

function renderSummary(levers, kpis, baselineKPIs) {
  const container = document.getElementById('summary-container');
  if (!container) return;

  const activeLevers = Object.entries(levers).filter(([, v]) => Math.abs(v) > 1e-9);

  let text;
  if (activeLevers.length === 0) {
    text = 'All levers at baseline. Adjust an assumption to see the impact on margin and profit.';
  } else {
    const parts = activeLevers.map(([key, val]) => {
      const sign = val > 0 ? '+' : '';
      const cfg = (typeof LEVER_CONFIG !== 'undefined' ? LEVER_CONFIG : []).find(c => c.key === key);
      const label = cfg ? cfg.label : key;
      const unit  = cfg ? cfg.unit  : '';
      return `${label} ${sign}${val}${unit}`;
    });

    const marginDelta = kpis.margin_pct - baselineKPIs.margin_pct;
    const profitDelta = kpis.net_profit_thousand - baselineKPIs.net_profit_thousand;

    const marginSign  = marginDelta >= 0 ? '+' : '';
    const profitSign  = profitDelta >= 0 ? '+RM ' : '−RM ';
    const profitAbs   = Math.abs(profitDelta / 1000).toFixed(1);

    text = `At ${parts.join(' and ')}, margin moves from ${baselineKPIs.margin_pct.toFixed(1)}% to ${kpis.margin_pct.toFixed(1)}% (${marginSign}${marginDelta.toFixed(1)}pp). Net profit change: ${profitSign}${profitAbs}M.`;
  }

  container.innerHTML = `
    <div class="section-label" style="margin-bottom:10px;">Scenario</div>
    <div class="summary-text">${text}</div>
    ${activeLevers.length > 0 ? '<div class="summary-hint">→ Switch to Cost Detail tab for the full line-by-line breakdown</div>' : ''}
  `;
}

if (typeof module !== 'undefined') module.exports = { renderSummary };
