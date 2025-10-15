import { monthsByLang } from './js/state.js';
import { buildMonthSVG } from './js/build.js';
import { state } from './js/state.js';
import { render } from './js/workspace.js';

// Expose helpers for the preview/ZIP window
window.monthsByLang = monthsByLang;
window.buildMonthForExport = (y, m) => buildMonthSVG(y, m, { exportMode: true }).outerHTML;

// 🔧 Dev hooks for console debugging
window.DarcalState  = state;                 // inspect/modify live state
window.DarcalRender = () => {                // force a re-render
  try { render(); } catch (e) { console.error(e); }
};

// Toggle holiday anchor debug dots from console:
//   window.__HOL_DBG = true; DarcalRender();
if (typeof window.__HOL_DBG === "undefined") {
  window.__HOL_DBG = false;
}
