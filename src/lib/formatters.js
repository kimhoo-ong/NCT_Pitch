// formatters.js — display formatting utilities
// Intl.NumberFormat instances created once and reused (Gotcha 6: new instance per call is slow).
// All formatting functions are pure: no DOM reads, no global state.

// RM currency formatter (millions, 1 decimal): "RM 1,611.0M"
const _fmtMillions = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// RM currency formatter (thousands, 0 decimals): "1,611,000"
const _fmtThousands = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// RM currency formatter (plain number, up to 2 decimals): "682.50"
const _fmtDecimal2 = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Percentage formatter (1 decimal): "22.6%"
const _fmtPct1 = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// Format RM thousands value for KPI display
// amount_thousand: value in RM thousands (e.g. 1611000 = RM 1,611M)
// mode: 'M' (millions, default) | 'K' (thousands)
function formatRM(amount_thousand, mode) {
  if (amount_thousand === null || amount_thousand === undefined) return '—';
  if (mode === 'K') {
    return 'RM ' + _fmtThousands.format(amount_thousand) + 'K';
  }
  return 'RM ' + _fmtMillions.format(amount_thousand / 1000) + 'M';
}

// Format a delta for KPI cards: "+RM 14M" or "-RM 6M" or "(baseline)"
function formatRMDelta(delta_thousand) {
  if (delta_thousand === null || delta_thousand === undefined) return '';
  if (Math.abs(delta_thousand) < 0.5) return '(baseline)';
  const sign = delta_thousand > 0 ? '+' : '';
  return sign + formatRM(delta_thousand);
}

// Format a percentage delta: "+1.2pp" or "-0.8pp"
function formatPctDelta(delta_pct) {
  if (delta_pct === null || delta_pct === undefined) return '';
  if (Math.abs(delta_pct) < 0.05) return '(baseline)';
  const sign = delta_pct > 0 ? '+' : '';
  return sign + _fmtPct1.format(delta_pct) + 'pp';
}

// Format a cost-detail amount in thousands (right-aligned table cell)
function formatCostAmt(amount_thousand) {
  if (amount_thousand === null || amount_thousand === undefined) return '—';
  return _fmtThousands.format(Math.round(amount_thousand));
}

// Format a cost-detail delta: "(=)" | "+1,234" | "-567"
function formatCostDelta(delta_thousand) {
  if (delta_thousand === null || delta_thousand === undefined) return '';
  if (Math.abs(delta_thousand) < 1) return '(=)';
  const sign = delta_thousand > 0 ? '+' : '';
  return sign + _fmtThousands.format(Math.round(delta_thousand));
}

// Format a selling price: "RM 682.50 / SF"
function formatPricePerSF(price) {
  return 'RM ' + _fmtDecimal2.format(price) + ' / SF';
}

// Format a percentage for display: "22.6%"
function formatPct(pct, decimals) {
  const d = decimals ?? 1;
  return pct.toFixed(d) + '%';
}

// Node.js compatibility
if (typeof module !== 'undefined') {
  module.exports = {
    formatRM,
    formatRMDelta,
    formatPctDelta,
    formatCostAmt,
    formatCostDelta,
    formatPricePerSF,
    formatPct,
  };
}
