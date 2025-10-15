import { state } from './js/state.js';
import { render, applyView, centerView, zoomAtPoint, initWorkspace } from './js/workspace.js';
import { initSettings, openSheetSnap, closeSheetSnap } from './js/settings.js';
import { drawRulers, initRulers } from './js/rulers.js';

function setupHotkeys() {
  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    const editable = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable);
    if (editable) return;

    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      const rect = document.getElementById('preview').getBoundingClientRect();
      zoomAtPoint(1.1, rect.width / 2, rect.height / 2);
      state.view.userMoved = true;
      drawRulers(); return;
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      const rect = document.getElementById('preview').getBoundingClientRect();
      zoomAtPoint(1 / 1.1, rect.width / 2, rect.height / 2);
      state.view.userMoved = true;
      drawRulers(); return;
    }
    if (e.key === 'o' || e.key === 'O') {
      e.preventDefault();
      const isOpen = document.getElementById('sheet').dataset.open === "true";
      if (!isOpen) { openSheetSnap(); } else { closeSheetSnap(); }
      return;
    }
    if (e.key === 'Escape') { closeSheetSnap(); return; }
    if (e.key === 'r' || e.key === 'R') {
      state.rulersOn = !state.rulersOn;
      const chk = document.getElementById('chkRulers'); if (chk) chk.checked = state.rulersOn;
      render(); drawRulers(); return;
    }

    // --- Month cycling ---
    const changeMonth = (delta) => {
      let m = state.month + delta;
      let y = state.year;
      while (m < 0) { m += 12; y -= 1; }
      while (m > 11) { m -= 12; y += 1; }
      state.month = m; state.year = y;
      const ms = document.getElementById('month'); if (ms) ms.value = m;
      const yr = document.getElementById('year'); if (yr) yr.value = y;
      render(); drawRulers();
    };

    if (e.key === 'ArrowLeft') { e.preventDefault(); changeMonth(-1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); changeMonth(+1); return; }
    if (e.key === 'PageUp') { e.preventDefault(); changeMonth(e.shiftKey ? -12 : -1); return; }
    if (e.key === 'PageDown') { e.preventDefault(); changeMonth(e.shiftKey ? +12 : +1); return; }
  });
}

function init() {
  initWorkspace();
  initRulers();
  initSettings({ onChange: () => { render(); drawRulers(); } });
  render();
  centerView();
  drawRulers();
  setupHotkeys();
}
if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);

import './export-bridge.js';
