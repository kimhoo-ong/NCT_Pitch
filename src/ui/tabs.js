// tabs.js — tab switching (instant, no animation per spec)
// State lives in the global `state` object. Tabs are purely a view layer.

function switchTab(id) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });

  const panel = document.getElementById('panel-' + id);
  const btn   = document.getElementById('tab-' + id);
  if (panel) panel.classList.add('active');
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
  }

  // Re-render cost detail when switching to it, so it reflects latest lever state
  if (id === 'cost-detail') renderCostDetail();
}

if (typeof module !== 'undefined') module.exports = { switchTab };
