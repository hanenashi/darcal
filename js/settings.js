import { state, $, clamp } from './state.js';
import { render, centerView } from './workspace.js';
import { drawRulers } from './rulers.js';

let onChangeCb=null;

export function initSettings({onChange, onOpen, onClose}){
  onChangeCb = onChange;
  const ms=$("month"); if(ms){ ms.innerHTML=Array.from({length:12},(_,i)=>`<option value="${i}">${i+1}</option>`).join(""); ms.value=state.month; }
  const yr=$("year"); if(yr){ yr.value=state.year; }

  bindSel("lang","lang"); bindChk("fullNames","fullNames");
  bindSel("firstDay","firstDay",true);

  const pp=$("pagePreset");
  bindSel("pagePreset","preset");
  pp && pp.addEventListener("change",()=>{
    const map={A4P:[210,297],A4L:[297,210],A5P:[148,210],A5L:[210,148],B5P:[176,250],B5L:[250,176],B4P:[250,353],B4L:[353,250]};
    const p=pp.value; if(map[p]){ $("pageW").value=map[p][0]; $("pageH").value=map[p][1]; state.pageW=map[p][0]; state.pageH=map[p][1]; onChangeCb(); }
  });
  bindNum("pageW","pageW"); bindNum("pageH","pageH");

  ["calX","calY","calW","calH"].forEach(k=>bindNum(k,k));
  bindChk("showGuides","showGuides");

  bindNum("year","year"); bindSel("month","month",true);
  $("prevM")?.addEventListener("click",()=>{ state.month=(state.month+11)%12; $("month").value=state.month; onChangeCb(); });
  $("nextM")?.addEventListener("click",()=>{ state.month=(state.month+1)%12; $("month").value=state.month; onChangeCb(); });

  setupFontPicker("hdrFontSel","hdrFontCustomRow","hdrFontCustom","hdrFont");
  bindNum("hdrSize","hdrSizePt"); bindSel("hdrAlign","hdrAlign"); bindNum("hdrGap","hdrGap");
  bindTxt("hdrText","hdrText");

  bindNum("cellStrokePt","cellStrokePt"); bindNum("cellRadius","cellRadius");
  bindNum("gutX","gutX"); bindNum("gutY","gutY");
  bindChk("tableLines","tableLines"); bindChk("hideEmpty","hideEmpty");
  bindChk("showAdj","showAdj"); bindNum("adjAlpha","adjAlpha");
  bindNum("tableStrokePt","tableStrokePt");

  setupFontPicker("dayFontSel","dayFontCustomRow","dayFontCustom","dayFont");
  bindNum("daySizePt","daySizePt");
  bindNum("dayOffX","dayOffX"); bindNum("dayOffY","dayOffY"); bindSel("dayAnchor","dayAnchor");

  setupFontPicker("wdFontSel","wdFontCustomRow","wdFontCustom","wdFont");
  bindNum("wdSizePt","wdSizePt"); bindNum("wdOffX","wdOffX"); bindNum("wdOffY","wdOffY");

  const chkRulers = $("chkRulers"); chkRulers.checked = state.rulersOn;
  chkRulers.addEventListener("change", ()=>{ state.rulersOn = chkRulers.checked; drawRulers(); });

  $("generate")?.addEventListener("click",()=>openPreviewAndZip());

  // Morph open/close
  $("settingsBtn").addEventListener("pointerup", (e)=>{
    if(e.pointerType==='mouse' && e.button!==0) return;
    if ($("sheet").getAttribute("aria-hidden")==="true") onOpen(); else onClose();
  });

  // draggable button (position persistence)
  setupSettingsButtonDrag();

  // draggable header
  setupWindowDrag();

  $("closeSheet").addEventListener("click", ()=> onClose());
  $("resetView").addEventListener("click", ()=>{ state.view.scale=1; state.view.userMoved=false; centerView(); drawRulers(); });
}

/* ===== Morphing (FLIP) ===== */
export function morphOpenFromButton(){
  const btn = $("settingsBtn");
  const card = document.querySelector(".sheet-card");
  const sheet = $("sheet");
  sheet.setAttribute("aria-hidden","false");
  const br = btn.getBoundingClientRect();
  const cr = card.getBoundingClientRect();
  const dx = (br.left + br.width/2) - (cr.left + cr.width/2);
  const dy = (br.top  + br.height/2) - (cr.top  + cr.height/2);
  const sx = Math.max(0.2, br.width  / Math.max(1, cr.width));
  const sy = Math.max(0.2, br.height / Math.max(1, cr.height));
  card.style.transform = `translate(-50%,-50%) translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  card.style.opacity = 0.001;
  requestAnimationFrame(()=>{
    btn.style.opacity = 0;
    card.style.opacity = 1;
    card.style.transform = `translate(-50%,-50%)`;
  });
}

export function morphCloseToButton(){
  const btn = $("settingsBtn");
  const card = document.querySelector(".sheet-card");
  const br = btn.getBoundingClientRect();
  const cr = card.getBoundingClientRect();
  const dx = (br.left + br.width/2) - (cr.left + cr.width/2);
  const dy = (br.top  + br.height/2) - (cr.top  + cr.height/2);
  const sx = Math.max(0.2, br.width  / Math.max(1, cr.width));
  const sy = Math.max(0.2, br.height / Math.max(1, cr.height));
  card.style.opacity = 1;
  card.style.transform = `translate(-50%,-50%)`;
  requestAnimationFrame(()=>{
    card.style.opacity = 0.001;
    card.style.transform = `translate(-50%,-50%) translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    card.addEventListener("transitionend", function done(){
      card.removeEventListener("transitionend", done);
      document.getElementById("sheet").setAttribute("aria-hidden","true");
      btn.style.opacity = 1;
      // restore center after close
      card.style.transform = `translate(-50%,-50%)`;
      card.style.opacity = 0;
    }, {once:true});
  });
}

/* ===== window drag with touch-friendly behavior ===== */
function setupWindowDrag(){
  const win = document.querySelector(".sheet-card");
  const dragHandle = $("sheetDragHandle");
  if(!win || !dragHandle) return;
  let dragging=false, sx=0, sy=0, sl=0, st=0;

  dragHandle.addEventListener("pointerdown",(e)=>{
    if (e.target.closest('.sheet-actions') || e.target.tagName==='BUTTON') return;
    const r=win.getBoundingClientRect();
    dragging=true; sx=e.clientX; sy=e.clientY; sl=r.left; st=r.top;
    dragHandle.setPointerCapture && dragHandle.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, {passive:false});

  window.addEventListener("pointermove",(e)=>{
    if(!dragging) return;
    let nl = sl + (e.clientX - sx);
    let nt = st + (e.clientY - sy);
    nl = Math.max(0, Math.min(nl, window.innerWidth  - 80));
    nt = Math.max(0, Math.min(nt, window.innerHeight - 80));
    win.style.left = nl + "px";
    win.style.top  = nt + "px";
    win.style.transform = "translate(0,0)";
  }, {passive:false});

  const end=()=>{ if(!dragging) return; dragging=false; };
  window.addEventListener("pointerup", end, {passive:true});
  window.addEventListener("pointercancel", end, {passive:true});
}

/* draggable Settings button (fix weird resize-on-drag & persist pos) */
function setupSettingsButtonDrag(){
  const btn = $("settingsBtn"); if(!btn) return;
  try{
    const s = JSON.parse(localStorage.getItem("settings-btn-pos")||"{}");
    if (s && s.l!=null && s.t!=null){ btn.style.left=s.l+"px"; btn.style.top=s.t+"px"; btn.style.right="auto"; btn.style.bottom="auto"; }
  }catch{}
  let dragging=false, sx=0, sy=0, sl=0, st=0, moved=false;
  btn.addEventListener("pointerdown",(e)=>{
    dragging=true; moved=false; btn.classList.add("dragging");
    const r=btn.getBoundingClientRect();
    sx=e.clientX; sy=e.clientY; sl=r.left; st=r.top;
    btn.setPointerCapture && btn.setPointerCapture(e.pointerId);
    btn.style.right="auto"; btn.style.bottom="auto";
  });
  window.addEventListener("pointermove",(e)=>{
    if(!dragging) return;
    const dx=e.clientX-sx, dy=e.clientY-sy;
    if(Math.abs(dx)+Math.abs(dy)>3) moved=true;
    const nl=Math.max(8, Math.min(sl+dx, window.innerWidth - btn.offsetWidth - 8));
    const nt=Math.max(8, Math.min(st+dy, window.innerHeight - btn.offsetHeight - 8));
    btn.style.left=nl+"px"; btn.style.top=nt+"px";
  }, {passive:false});
  window.addEventListener("pointerup",()=>{
    if(!dragging) return;
    dragging=false; btn.classList.remove("dragging");
    const r=btn.getBoundingClientRect();
    localStorage.setItem("settings-btn-pos", JSON.stringify({l:r.left, t:r.top}));
  }, {passive:true});
}

/* ===== bindings ===== */
function bindNum(id,key){ const e=$(id); if(!e) return;
  const fn=()=>{ state[key]=parseFloat(e.value)||0; onChangeCb(); };
  e.addEventListener("input",fn); state[key]=parseFloat(e.value)||state[key];
}
function bindTxt(id,key){ const e=$(id); if(!e) return;
  const fn=()=>{ state[key]=e.value; onChangeCb(); };
  e.addEventListener("input",fn); state[key]=e.value;
}
function bindSel(id,key,intMode=false){ const e=$(id); if(!e) return;
  const fn=()=>{ state[key]=intMode?parseInt(e.value):e.value; onChangeCb(); };
  e.addEventListener("change",fn); state[key]=intMode?parseInt(e.value):e.value;
}
function bindChk(id,key){ const e=$(id); if(!e) return;
  const fn=()=>{ state[key]=e.checked; onChangeCb(); };
  e.addEventListener("change",fn); state[key]=e.checked;
}
function setupFontPicker(selectId,rowId,inputId,stateKey){
  const sel=$(selectId), row=$(rowId), inp=$(inputId);
  if(!sel) return;
  const apply=()=>{
    if(sel.value==="__custom__"){
      row.classList.remove("hidden");
      if(inp && inp.value.trim()) state[stateKey]=inp.value.trim();
    }else{
      row.classList.add("hidden");
      state[stateKey]=sel.value;
    }
    onChangeCb();
  };
  sel.addEventListener("change",apply);
  inp && inp.addEventListener("input",apply);
  if(sel.value!=="__custom__") row.classList.add("hidden");
}

/* ZIP helpers injected in export bridge */
function openPreviewAndZip(){
  const w=window.open("","_blank"); if(!w){alert("Popup blocked.");return}
  w.document.title=`Calendar ${state.year} — Preview`;
  const style=w.document.createElement("style");
  style.textContent='body{font:14px/1.3 system-ui;background:#111;color:#eee;margin:0}'
    +'.bar{position:sticky;top:0;background:#111;padding:10px;border-bottom:1px solid #333;display:flex;gap:8px;align-items:center}'
    +'button{background:#1b2a45;color:#fff;border:1px solid #2e4a7a;border-radius:6px;padding:6px 10px;cursor:pointer}'
    +'.wrap{padding:10px 12px}.page{background:#fff;margin:12px auto;box-shadow:0 2px 12px rgba(0,0,0,.35);border:1px solid #ddd}';
  w.document.head.appendChild(style);
  const bar=w.document.createElement("div"); bar.className="bar";
  const btn=w.document.createElement("button"); btn.id="dl"; btn.textContent="Download ZIP (12 SVG)";
  bar.appendChild(btn); w.document.body.appendChild(bar);
  const wrap=w.document.createElement("div"); wrap.className="wrap"; wrap.id="wrap"; w.document.body.appendChild(wrap);
  for(let m=0;m<12;m++){ const div=w.document.createElement("div"); div.className="page"; div.style.width=(state.pageW*3)+"px";
    div.innerHTML=window.buildMonthForExport(state.year,m); wrap.appendChild(div); }
  const script=w.document.createElement("script");
  script.src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
  script.onload=()=>{ btn.onclick=async()=>{ const zip=new w.JSZip(), months=window.monthsByLang(state.lang);
      for(let m=0;m<12;m++) zip.file(`${String(m+1).padStart(2,"0")}_${months[m]}_${state.year}.svg`, window.buildMonthForExport(state.year,m));
      const blob=await zip.generateAsync({type:"blob"}); const url=w.URL.createObjectURL(blob);
      const a=w.document.createElement("a"); a.href=url; a.download=`Calendar_${state.year}.zip`; w.document.body.appendChild(a); a.click(); a.remove(); w.URL.revokeObjectURL(url); }; };
  script.onerror=()=>{ btn.disabled=true; btn.textContent="ZIP unavailable (CDN blocked)"; };
  w.document.head.appendChild(script);
}
