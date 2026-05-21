// data-loader.js — pluggable data source
// v1: applies calibration to embedded BASELINE_DATA, then returns it.
// v2 (future): swap only this file to fetch from SharePoint JSON.
// v3 (future): swap only this file to call Fabric REST API with OAuth.
//
// calibrateEstimatedCosts() scales [EST] cost items to hit TARGET_NET_MARGIN_PCT (20%).
// It mutates BASELINE_DATA in place — call loadBaseline() only once.

let _loaded = false;

async function loadBaseline() {
  if (!_loaded) {
    // calibrateEstimatedCosts and TARGET_NET_MARGIN_PCT are defined in
    // calculations.js and baseline.js respectively (loaded before this file).
    calibrateEstimatedCosts(BASELINE_DATA, TARGET_NET_MARGIN_PCT);
    _loaded = true;
  }
  return BASELINE_DATA;

  // v2 (future) — fetch from SharePoint:
  // const res = await fetch('./baseline.json', { cache: 'no-cache' });
  // if (!res.ok) throw new Error('Failed to load baseline: ' + res.status);
  // const data = await res.json();
  // calibrateEstimatedCosts(data, TARGET_NET_MARGIN_PCT);
  // return data;
}

// Node.js compatibility
if (typeof module !== 'undefined') {
  module.exports = { loadBaseline };
}
