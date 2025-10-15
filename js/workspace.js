// workspace.js
// Pan/zoom workspace, drag/resize calendar block, month cycling, live HUD.
// Emits "darcal:state-sync" with keys to update Settings inputs.

import { state, $, mm, clamp } from './state.js';
import { buildMonthSVG } from './build.js';

// ---- DOM bootstrap ---------------------------------------------------------
function ensureDom() {
  let ws = $("workspace");
  if (!ws) {
    ws = document.createElement("div");
    ws.id = "workspace";
    ws.style.cssText = `
      position:relative; inset:0; width:100%; height:100%;
      background:#0d0f14; overflow:hidden; touch-action:none;`;
    document.body.appendChild(ws);
  }
  let view = $("view");
  if (!view) {
    view = document.createElement("div");
    view.id = "view";
    view.style.cssText = `
      position:absolute; left:0; top:0; transform-origin:0 0; will-change:transform;`;
    ws.appendChild(view);
  }
  let pageHost = $("pageHost");
  if (!pageHost) {
    pageHost = document.createElement("div");
    pageHost.id = "pageHost";
    pageHost.style.cssText = `position:relative; width:${mm(state.pageW)}px; height:${mm(state.pageH)}px;`;
    view.appendChild(pageHost);
  }
  let overlay = $("overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "overlay";
    overlay.style.cssText = `position:absolute; left:0; top:0; width:${mm(state.pageW)}px; height:${mm(state.pageH)}px; pointer-events:none;`;
    view.appendChild(overlay);
  }
  let calFrame = $("calFrame");
  if (!calFrame) {
    calFrame = document.createElement("div");
    calFrame.id = "calFrame";
    calFrame.style.cssText = `
      position:absolute; border:1px dashed #ffd54a; background:transparent;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,.1); pointer-events:auto; touch-action:none;`;
    overlay.appendChild(calFrame);
    addResizeHandles(calFrame);
  }
  let hud = $("dragHud");
  if (!hud) {
    hud = document.createElement("div");
    hud.id = "dragHud";
    hud.style.cssText = `
      position:fixed; left:12px; top:12px; z-index:9999;
      background:#ffeb3b; color:#111; font:12px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      padding:6px 8px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,.35);
      display:none;`;
    document.body.appendChild(hud);
  }
}
function addResizeHandles(frame) {
  const mk = (role, cursor, left, top) => {
    const h = document.createElement("div");
    h.className = "handle";
    h.dataset.role = role;
    h.style.cssText = `
      position:absolute; width:14px; height:14px; margin:-7px 0 0 -7px; background:#ffd54a;
      border:1px solid #775; border-radius:2px; box-shadow:0 1px 2px rgba(0,0,0,.25);
      cursor:${cursor}; touch-action:none;`;
    h.style.left = left;
    h.style.top = top;
    frame.appendChild(h);
  };
  mk("nw-resize", "nwse-resize", "0%", "0%");
  mk("n-resize", "ns-resize", "50%", "0%");
  mk("ne-resize", "nesw-resize", "100%", "0%");
  mk("e-resize", "ew-resize", "100%", "50%");
  mk("se-resize", "nwse-resize", "100%", "100%");
  mk("s-resize", "ns-resize", "50%", "100%");
  mk("sw-resize", "nesw-resize", "0%", "100%");
  mk("w-resize", "ew-resize", "0%", "50%");
}

// ---- Render ---------------------------------------------------------------
export function render() {
  ensureDom();
  const pageHost = $("pageHost");
  const overlay = $("overlay");
  const view = $("view");

  // Update sizes (page may have changed)
  pageHost.style.width = mm(state.pageW) + "px";
  pageHost.style.height = mm(state.pageH) + "px";
  overlay.style.width = mm(state.pageW) + "px";
  overlay.style.height = mm(state.pageH) + "px";

  // Rebuild SVG
  pageHost.innerHTML = "";
  const svg = buildMonthSVG(state.year, state.month, { exportMode: false });
  pageHost.appendChild(svg);

  // Position calendar frame overlay
  updateCalFrame();

  // Apply view transform
  applyView();

  // Live-sync settings inputs for calX/Y/W/H while dragging/resizing (or any render)
  dispatchSync(["calX","calY","calW","calH"]);
}

function updateCalFrame() {
  const calFrame = $("calFrame");
  if (!calFrame) return;
  calFrame.style.left = mm(state.calX) + "px";
  calFrame.style.top  = mm(state.calY) + "px";
  calFrame.style.width  = mm(state.calW) + "px";
  calFrame.style.height = mm(state.calH) + "px";
}

export function centerView() {
  ensureDom();
  const ws = $("workspace");
  const view = $("view");
  const pagePxW = mm(state.pageW);
  const pagePxH = mm(state.pageH);
  const s = clamp(state.view.scale || 1, 0.1, 8);

  const x = Math.round((ws.clientWidth  - pagePxW * s)/2);
  const y = Math.round((ws.clientHeight - pagePxH * s)/2);

  state.view.scale = s;
  state.view.x = x;
  state.view.y = y;
  state.view.userMoved = false;
  applyView();
}

function applyView() {
  const view = $("view");
  if (!view) return;
  const s = clamp(state.view.scale || 1, 0.1, 8);
  view.style.transform = `translate(${Math.round(state.view.x||0)}px, ${Math.round(state.view.y||0)}px) scale(${s})`;
}

// ---- Drag / Resize calendar block ----------------------------------------
const DRAG = { mode: null, sx:0, sy:0, start:{}, scale:1 };
const PX_PER_MM = mm(1);

function startCalMove(e) {
  e.preventDefault();
  e.stopPropagation();
  DRAG.mode = "cal-move";
  DRAG.sx = e.clientX; DRAG.sy = e.clientY;
  DRAG.scale = state.view.scale || 1;
  DRAG.start = { calX: state.calX, calY: state.calY };
  showHud(e);
}
function startCalResize(e, role) {
  e.preventDefault();
  e.stopPropagation();
  DRAG.mode = "cal-resize";
  DRAG.role = role;
  DRAG.sx = e.clientX; DRAG.sy = e.clientY;
  DRAG.scale = state.view.scale || 1;
  DRAG.start = { calX: state.calX, calY: state.calY, calW: state.calW, calH: state.calH };
  showHud(e);
}

function onPointerMove(e) {
  if (!DRAG.mode) return;

  const dx_px = (e.clientX - DRAG.sx);
  const dy_px = (e.clientY - DRAG.sy);
  const dx_mm = dx_px / (PX_PER_MM * DRAG.scale);
  const dy_mm = dy_px / (PX_PER_MM * DRAG.scale);

  if (DRAG.mode === "cal-move") {
    state.calX = DRAG.start.calX + dx_mm;
    state.calY = DRAG.start.calY + dy_mm;
    render();
    dispatchSync(["calX","calY"]);
  } else if (DRAG.mode === "cal-resize") {
    let { calX, calY, calW, calH } = DRAG.start;

    if (DRAG.role.includes("e")) calW = Math.max(1, DRAG.start.calW + dx_mm);
    if (DRAG.role.includes("s")) calH = Math.max(1, DRAG.start.calH + dy_mm);
    if (DRAG.role.includes("w")) { calX = DRAG.start.calX + dx_mm; calW = Math.max(1, DRAG.start.calW - dx_mm); }
    if (DRAG.role.includes("n")) { calY = DRAG.start.calY + dy_mm; calH = Math.max(1, DRAG.start.calH - dy_mm); }

    state.calX = calX; state.calY = calY; state.calW = calW; state.calH = calH;
    render();
    dispatchSync(["calX","calY","calW","calH"]);
  }

  positionHud(e);
  updateHudText();
}

function onPointerUp() {
  if (!DRAG.mode) return;
  DRAG.mode = null;
  hideHud();
}

function bindCalInteractions() {
  const calFrame = $("calFrame");
  if (!calFrame) return;

  // drag by interior
  calFrame.addEventListener("pointerdown", (e)=>{
    // Ignore if a handle
    if (e.target && e.target.classList && e.target.classList.contains("handle")) return;
    startCalMove(e);
  });

  // handles
  calFrame.querySelectorAll(".handle").forEach(h=>{
    h.addEventListener("pointerdown", (e)=> startCalResize(e, h.dataset.role));
  });

  window.addEventListener("pointermove", onPointerMove, { passive:false });
  window.addEventListener("pointerup", onPointerUp, { passive:true });
  window.addEventListener("pointercancel", onPointerUp, { passive:true });
}

// ---- Pan / Zoom workspace -------------------------------------------------
const PAN = { active:false, sx:0, sy:0, x:0, y:0 };

function bindPanZoom() {
  const ws = $("workspace");
  if (!ws) return;

  ws.addEventListener("pointerdown", (e)=>{
    // Start panning only if background is targeted (not the page/overlay)
    const withinView = e.target.closest && e.target.closest("#view");
    const withinPage = e.target.closest && e.target.closest("#pageHost");
    const withinOverlay = e.target.closest && e.target.closest("#overlay");
    if (withinOverlay || withinPage) return; // calendar interactions have priority

    PAN.active = true; PAN.sx = e.clientX; PAN.sy = e.clientY;
    PAN.x = state.view.x || 0; PAN.y = state.view.y || 0;
    ws.setPointerCapture && ws.setPointerCapture(e.pointerId);
  });

  ws.addEventListener("pointermove", (e)=>{
    if (!PAN.active) return;
    const dx = e.clientX - PAN.sx;
    const dy = e.clientY - PAN.sy;
    state.view.x = PAN.x + dx;
    state.view.y = PAN.y + dy;
    state.view.userMoved = true;
    applyView();
    positionHud(e); // move HUD if visible
  });

  const endPan = ()=>{ PAN.active=false; };
  ws.addEventListener("pointerup", endPan, { passive:true });
  ws.addEventListener("pointercancel", endPan, { passive:true });

  // Wheel zoom, centered on cursor
  ws.addEventListener("wheel", (e)=>{
    if (e.ctrlKey) return; // let browser gesture zoom be
    e.preventDefault();
    const s0 = state.view.scale || 1;
    const delta = e.deltaY;
    const k = Math.exp(-delta * 0.0015);
    const s1 = clamp(s0 * k, 0.2, 8);

    // zoom about cursor
    const rect = ws.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const tx = (cx - state.view.x)/s0;
    const ty = (cy - state.view.y)/s0;

    state.view.x = cx - tx * s1;
    state.view.y = cy - ty * s1;
    state.view.scale = s1;
    state.view.userMoved = true;
    applyView();
  }, { passive:false });
}

// ---- HUD (drag info) ------------------------------------------------------
function showHud(e){
  const hud = $("dragHud"); if(!hud) return;
  hud.style.display = "block";
  updateHudText();
  positionHud(e);
}
function hideHud(){ const hud=$("dragHud"); if(hud) hud.style.display="none"; }
function updateHudText(){
  const hud = $("dragHud"); if(!hud) return;
  hud.textContent =
    `x:${state.calX.toFixed(1)} y:${state.calY.toFixed(1)}  w:${state.calW.toFixed(1)} h:${state.calH.toFixed(1)} mm`;
}
function positionHud(e){
  const hud = $("dragHud"); if(!hud) return;
  const isTouch = (e && e.pointerType === "touch");
  const offX = isTouch ? 24 : 12;
  const offY = isTouch ? -72 : 12; // above/right of finger on touch

  let left = (e ? e.clientX : 12) + offX;
  let top  = (e ? e.clientY : 12) + offY;

  const pad = 8;
  const r = hud.getBoundingClientRect();
  left = Math.max(pad, Math.min(left, window.innerWidth  - r.width  - pad));
  top  = Math.max(pad, Math.min(top,  window.innerHeight - r.height - pad));
  hud.style.left = left + "px";
  hud.style.top  = top  + "px";
}

// ---- Month cycling (keyboard) ---------------------------------------------
function changeMonth(delta){
  let m = state.month + delta;
  let y = state.year;
  while (m < 0) { m += 12; y -= 1; }
  while (m > 11){ m -= 12; y += 1; }
  state.month = m; state.year = y;
  render();
  // ask Settings (if present) to reflect month/year inputs
  dispatchSync(["month","year"]);
}

function bindKeys(){
  window.addEventListener("keydown",(e)=>{
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.isComposing) return;

    if (e.key === "ArrowLeft") { changeMonth(-1); e.preventDefault(); }
    else if (e.key === "ArrowRight") { changeMonth(+1); e.preventDefault(); }
    else if (e.key === "PageUp") { changeMonth(e.shiftKey ? -12 : -1); e.preventDefault(); }
    else if (e.key === "PageDown") { changeMonth(e.shiftKey ? +12 : +1); e.preventDefault(); }
    else if (e.key === '+') { state.view.scale = clamp((state.view.scale||1)*1.1, 0.2, 8); applyView(); }
    else if (e.key === '-') { state.view.scale = clamp((state.view.scale||1)/1.1, 0.2, 8); applyView(); }
    else if (e.key === '0') { centerView(); }
  });
}

// ---- Settings sync event ---------------------------------------------------
function dispatchSync(keys){
  try {
    window.dispatchEvent(new CustomEvent("darcal:state-sync", { detail: keys }));
  } catch {}
}

// ---- Public init ----------------------------------------------------------
export function initWorkspace(){
  ensureDom();
  bindPanZoom();
  bindCalInteractions();
  bindKeys();
  // keep the page centered on first load if user hasn't moved yet
  if (!state.view.userMoved) centerView();
  render();
}

// Export helpers for other modules
window.buildMonthForExport = (y,m)=> {
  const svg = buildMonthSVG(y, m, { exportMode:true });
  return svg.outerHTML;
};
