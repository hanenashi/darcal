import { state, $, clamp, PX_PER_MM } from './js/state.js';
import { render, applyView, centerView, zoomAtPoint, initWorkspace } from './js/workspace.js';
import { initSettings, morphOpenFromButton, morphCloseToButton } from './js/settings.js';
import { drawRulers, initRulers } from './js/rulers.js';

/* ===== boot ===== */
function setupHotkeys(){
  document.addEventListener("keydown", (e)=>{
    const tag=(e.target && e.target.tagName)||"";
    const editable = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable);
    if(editable) return;

    if(e.key==='+' || e.key==='='){
      e.preventDefault();
      const rect=document.getElementById('preview').getBoundingClientRect();
      zoomAtPoint(1.1, rect.width/2, rect.height/2);
      state.view.userMoved=true;
      drawRulers();
      return;
    }
    if(e.key==='-' || e.key==='_'){
      e.preventDefault();
      const rect=document.getElementById('preview').getBoundingClientRect();
      zoomAtPoint(1/1.1, rect.width/2, rect.height/2);
      state.view.userMoved=true;
      drawRulers();
      return;
    }
    if(e.key==='o' || e.key==='O'){
      e.preventDefault();
      if (document.getElementById('sheet').getAttribute('aria-hidden')==='true'){
        morphOpenFromButton();
      }else{
        morphCloseToButton();
      }
      return;
    }
    if(e.key==='Escape'){
      morphCloseToButton(); return;
    }
    if(e.key==='r' || e.key==='R'){
      state.rulersOn = !state.rulersOn; document.getElementById('chkRulers').checked = state.rulersOn; drawRulers(); return;
    }
  });
}

function init(){
  initWorkspace();
  initRulers();
  initSettings({ onChange: ()=>{ render(); drawRulers(); }, onOpen:morphOpenFromButton, onClose:morphCloseToButton });
  render();
  centerView();
  drawRulers();
  setupHotkeys();
}

if(document.readyState!=='loading') init(); else document.addEventListener('DOMContentLoaded', init);

import './export-bridge.js';
