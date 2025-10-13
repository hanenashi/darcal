/* ===== constants & utils ===== */
const PX_PER_MM = 96 / 25.4;
const mm = v => v * PX_PER_MM;
const ptToPx = pt => pt * (96 / 72);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const r1 = v => Math.round(v * 10) / 10;

function isLeap(y){ return (y%4===0 && y%100!==0) || (y%400===0); }
function daysInMonth(y,m){ return [31,isLeap(y)?29:28,31,30,31,30,31,31,30,31,30,31][m]; }
function firstWeekday(y,m, firstDay){ const d = new Date(y,m,1).getDay(); return (d - firstDay + 7) % 7; }

/* ===== language ===== */
const MONTH_EN=["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_CZ=["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];
const MONTH_JA=["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const WD_EN_S=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], WD_EN_F=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const WD_CZ_S=["Ne","Po","Út","St","Čt","Pá","So"],       WD_CZ_F=["Neděle","Pondělí","Úterý","Středa","Čtvrtek","Pátek","Sobota"];
const WD_JA_S=["日","月","火","水","木","金","土"],         WD_JA_F=["日曜日","月曜日","火曜日","水曜日","木曜日","金曜日","土曜日"];

function monthsByLang(lang){ return lang==="ENG"?MONTH_EN: lang==="CZE"?MONTH_CZ: MONTH_JA; }
function weekdaysByLang(lang, full){
  return (lang==="ENG" ? (full?WD_EN_F:WD_EN_S)
       : lang==="CZE" ? (full?WD_CZ_F:WD_CZ_S)
       :                 (full?WD_JA_F:WD_JA_S)).slice();
}

/* ===== state ===== */
const state = {
  lang:"ENG", fullNames:false,
  pageW:210, pageH:297, preset:"A4P",
  year:(new Date()).getFullYear(), month:(new Date()).getMonth(), firstDay:0,
  calX:15, calY:150, calW:180, calH:120, showGuides:true,
  hdrText:"{MONTH} {YEAR}", hdrFont:"Inter, Arial", hdrSizePt:18, hdrAlign:"left", hdrGap:6,
  cellStrokePt:0.6, cellRadius:2, gutX:2, gutY:2,
  tableLines:false, hideEmpty:false, showAdj:false, adjAlpha:55,
  dayFont:"Inter, Arial", daySizePt:9, dayOffX:-1.5, dayOffY:1.5, dayAnchor:"top-right"
};

/* ===== DOM refs ===== */
const $ = id => document.getElementById(id);
const previewHost = $("preview");
let hud = $("hud");

/* ===== binding (live apply) ===== */
function bindNum(id,key){ const e=$(id); const fn=()=>{ state[key]=parseFloat(e.value)||0; render(); }; e.addEventListener("input",fn); state[key]=parseFloat(e.value)||state[key]; }
function bindTxt(id,key){ const e=$(id); const fn=()=>{ state[key]=e.value; render(); }; e.addEventListener("input",fn); state[key]=e.value; }
function bindSel(id,key,intMode=false){ const e=$(id); const fn=()=>{ state[key]=intMode?parseInt(e.value):e.value; render(); }; e.addEventListener("change",fn); state[key]=intMode?parseInt(e.value):e.value; }
function bindChk(id,key){ const e=$(id); const fn=()=>{ state[key]=e.checked; render(); }; e.addEventListener("change",fn); state[key]=e.checked; }

/* ===== init UI ===== */
(function wireUI(){
  // Language
  bindSel("lang","lang"); bindChk("fullNames","fullNames");

  // Page preset ↔ size
  bindSel("pagePreset","preset");
  $("pagePreset").addEventListener("change", ()=>{
    const map={A4P:[210,297],A4L:[297,210],A5P:[148,210],A5L:[210,148],B5P:[176,250],B5L:[250,176],B4P:[250,353],B4L:[353,250]};
    const p=$("pagePreset").value; if(map[p]){ $("pageW").value=map[p][0]; $("pageH").value=map[p][1]; state.pageW=map[p][0]; state.pageH=map[p][1]; render(); }
  });
  bindNum("pageW","pageW"); bindNum("pageH","pageH");

  // Block
  ["calX","calY","calW","calH"].forEach(k=>bindNum(k,k));
  bindChk("showGuides","showGuides");

  // Locale
  bindNum("year","year"); bindSel("month","month",true); bindSel("firstDay","firstDay",true);

  // Right topbar controls
  const mt = $("monthTop");
  mt.innerHTML = Array.from({length:12},(_,i)=>`<option value="${i}">${i+1}</option>`).join("");
  mt.value = state.month;
  $("yearTop").value = state.year;

  mt.addEventListener("change", ()=>{ state.month=parseInt(mt.value); $("month").value=state.month; render(); });
  $("yearTop").addEventListener("input", ()=>{ state.year=parseInt($("yearTop").value)||state.year; $("year").value=state.year; render(); });
  $("prevM").onclick = ()=>{ state.month=(state.month+11)%12; mt.value=state.month; $("month").value=state.month; render(); };
  $("nextM").onclick = ()=>{ state.month=(state.month+1)%12; mt.value=state.month; $("month").value=state.month; render(); };

  // Header
  bindTxt("hdrText","hdrText"); bindTxt("hdrFont","hdrFont");
  bindNum("hdrSize","hdrSizePt"); bindSel("hdrAlign","hdrAlign"); bindNum("hdrGap","hdrGap");

  // Grid
  bindNum("cellStrokePt","cellStrokePt"); bindNum("cellRadius","cellRadius");
  bindNum("gutX","gutX"); bindNum("gutY","gutY");
  bindChk("tableLines","tableLines"); bindChk("hideEmpty","hideEmpty");
  bindChk("showAdj","showAdj"); bindNum("adjAlpha","adjAlpha");

  // Day numbers
  bindTxt("dayFont","dayFont"); bindNum("daySizePt","daySizePt");
  bindNum("dayOffX","dayOffX"); bindNum("dayOffY","dayOffY"); bindSel("dayAnchor","dayAnchor");

  // Generate
  $("generate").onclick = ()=> openPreviewAndZip();

  // Splitter
  setupSplitter();
})();

/* ===== weekdays helper ===== */
function weekdayRow(){
  const base = weekdaysByLang(state.lang, state.fullNames);
  if (state.firstDay===0) return base;
  const copy = base.slice(); copy.push(copy.shift()); return copy; // rotate Sun->end
}

/* ===== SVG builder ===== */
function buildMonthSVG(y, mIdx, {exportMode=false}={}){
  const svgns="http://www.w3.org/2000/svg";
  const svg=document.createElementNS(svgns,"svg");
  svg.setAttribute("xmlns","http://www.w3.org/2000/svg");
  svg.setAttribute("width", state.pageW+"mm");
  svg.setAttribute("height", state.pageH+"mm");
  svg.setAttribute("viewBox", `0 0 ${mm(state.pageW)} ${mm(state.pageH)}`);

  // page bg
  const page=document.createElementNS(svgns,"rect");
  page.setAttribute("x",0); page.setAttribute("y",0);
  page.setAttribute("width",mm(state.pageW)); page.setAttribute("height",mm(state.pageH));
  page.setAttribute("fill","#fff"); svg.appendChild(page);

  // translated group
  const g=document.createElementNS(svgns,"g");
  g.setAttribute("transform", `translate(${mm(state.calX)}, ${mm(state.calY)})`);
  svg.appendChild(g);

  // header
  const months=monthsByLang(state.lang);
  const title=(state.hdrText||"").replace("{MONTH}", months[mIdx]).replace("{YEAR}", String(y));
  const hdr=document.createElementNS(svgns,"text");
  hdr.setAttribute("font-family", state.hdrFont);
  hdr.setAttribute("font-size", ptToPx(state.hdrSizePt));
  hdr.setAttribute("dominant-baseline","hanging");
  hdr.setAttribute("fill","#000");
  let tx=0, ta="start"; if (state.hdrAlign==="center"){tx=mm(state.calW)/2; ta="middle";} else if (state.hdrAlign==="right"){tx=mm(state.calW); ta="end";}
  hdr.setAttribute("x",tx); hdr.setAttribute("y",0); hdr.setAttribute("text-anchor",ta);
  hdr.textContent=title; g.appendChild(hdr);

  const hdrGapPx=mm(state.hdrGap);
  const gridY0 = ptToPx(state.hdrSizePt) + hdrGapPx;

  // geometry
  const cols=7, rows=6;
  const gutX=mm(state.gutX), gutY=mm(state.gutY);
  const gridW=mm(state.calW), gridH=mm(state.calH)-gridY0;
  const cellW=(gridW - gutX*(cols-1))/cols;
  const cellH=(gridH - gutY*(rows-1))/rows;

  // weekday row
  weekdayRow().forEach((d,i)=>{
    const t=document.createElementNS(svgns,"text");
    t.setAttribute("x", i*(cellW+gutX)+cellW/2);
    t.setAttribute("y", gridY0 - (gutY>2?gutY/2:2));
    t.setAttribute("font-family", state.dayFont);
    t.setAttribute("font-size", ptToPx(state.fullNames?9.5:8));
    t.setAttribute("fill","#333");
    t.setAttribute("text-anchor","middle");
    t.textContent=d; g.appendChild(t);
  });

  // month math
  const startOff=firstWeekday(y,mIdx,state.firstDay);
  const days=daysInMonth(y,mIdx);
  const daysPrev=daysInMonth(y-(mIdx===0?1:0),(mIdx+11)%12);
  let n=1, trailing=1;

  // table lines
  if (state.tableLines){
    const border=document.createElementNS(svgns,"rect");
    border.setAttribute("x",0); border.setAttribute("y",gridY0);
    border.setAttribute("width",gridW); border.setAttribute("height",gridH);
    border.setAttribute("fill","none");
    border.setAttribute("stroke","#000");
    border.setAttribute("stroke-width", ptToPx(state.cellStrokePt));
    g.appendChild(border);
    for (let c=1;c<cols;c++){
      const x=c*(cellW+gutX)-gutX/2;
      const v=document.createElementNS(svgns,"line");
      v.setAttribute("x1",x); v.setAttribute("y1",gridY0); v.setAttribute("x2",x); v.setAttribute("y2",gridY0+gridH);
      v.setAttribute("stroke","#000"); v.setAttribute("stroke-width", ptToPx(state.cellStrokePt));
      g.appendChild(v);
    }
    for (let r=1;r<rows;r++){
      const yLine=gridY0 + r*(cellH+gutY) - gutY/2;
      const h=document.createElementNS(svgns,"line");
      h.setAttribute("x1",0); h.setAttribute("y1",yLine); h.setAttribute("x2",gridW); h.setAttribute("y2",yLine);
      h.setAttribute("stroke","#000"); h.setAttribute("stroke-width", ptToPx(state.cellStrokePt));
      g.appendChild(h);
    }
  }

  // cells + labels
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      const idx=r*cols+c, x=c*(cellW+gutX), y=gridY0 + r*(cellH+gutY);
      let active=false, label="", adj=false;
      if (idx<startOff){
        if (!(state.hideEmpty && !state.showAdj)) {
          if (state.showAdj){ label = String(daysPrev - (startOff-1 - idx)); adj=true; }
        }
      } else if (n<=days){ active=true; label=String(n++); }
      else {
        if (!(state.hideEmpty && !state.showAdj)) {
          if (state.showAdj){ label = String(trailing++); adj=true; }
        }
      }

      if (!state.tableLines && (!state.hideEmpty || active || state.showAdj)){
        const rect=document.createElementNS(svgns,"rect");
        rect.setAttribute("x",x); rect.setAttribute("y",y);
        rect.setAttribute("width",cellW); rect.setAttribute("height",cellH);
        rect.setAttribute("rx", mm(state.cellRadius));
        rect.setAttribute("fill", active? "#fff" : "#f6f6f6");
        rect.setAttribute("stroke", state.cellStrokePt>0? "#000":"none");
        rect.setAttribute("stroke-width", ptToPx(state.cellStrokePt));
        g.appendChild(rect);
      }

      if (label){
        const dn=document.createElementNS(svgns,"text");
        dn.setAttribute("font-family", state.dayFont);
        dn.setAttribute("font-size", ptToPx(state.daySizePt));
        dn.setAttribute("fill", adj? `rgba(0,0,0,${clamp(state.adjAlpha,10,90)/100})` : "#000");
        const dx=mm(state.dayOffX), dy=mm(state.dayOffY);
        let ax, ay, anch=state.dayAnchor;
        if (anch==="top-right"){ ax=x+cellW+dx; ay=y+dy; dn.setAttribute("text-anchor","end"); dn.setAttribute("dominant-baseline","hanging"); }
        else if (anch==="top-left"){ ax=x+dx; ay=y+dy; dn.setAttribute("text-anchor","start"); dn.setAttribute("dominant-baseline","hanging"); }
        else if (anch==="center"){ ax=x+cellW/2+dx; ay=y+cellH/2+dy; dn.setAttribute("text-anchor","middle"); dn.setAttribute("dominant-baseline","middle"); }
        else { ax=x+cellW+dx; ay=y+cellH+dy; dn.setAttribute("text-anchor","end"); dn.setAttribute("dominant-baseline","ideographic"); }
        dn.setAttribute("x",ax); dn.setAttribute("y",ay); dn.textContent=label; g.appendChild(dn);
      }
    }
  }

  // draggable overlay (preview only)
  if (state.showGuides && !exportMode){
    const ov=document.createElementNS(svgns,"g");
    ov.setAttribute("transform", `translate(${mm(state.calX)}, ${mm(state.calY)})`);

    // big transparent hit-rect for moving anywhere inside
    const hit=document.createElementNS(svgns,"rect");
    hit.setAttribute("x",-mm(4)); hit.setAttribute("y",-mm(4));
    hit.setAttribute("width", mm(state.calW)+mm(8)); hit.setAttribute("height", mm(state.calH)+mm(8));
    hit.setAttribute("fill","rgba(0,0,0,0)");
    hit.style.cursor="move"; hit.dataset.role="move";
    ov.appendChild(hit);

    const moveRect=document.createElementNS(svgns,"rect");
    moveRect.setAttribute("x",0); moveRect.setAttribute("y",0);
    moveRect.setAttribute("width",mm(state.calW)); moveRect.setAttribute("height",mm(state.calH));
    moveRect.setAttribute("class","guide"); moveRect.dataset.role="move"; moveRect.style.cursor="move";
    ov.appendChild(moveRect);

    const size=mm(4.5);
    const pos=[["nw",0,0],["n",mm(state.calW)/2,0],["ne",mm(state.calW),0],
      ["w",0,mm(state.calH)/2],["e",mm(state.calW),mm(state.calH)/2],
      ["sw",0,mm(state.calH)],["s",mm(state.calW)/2,mm(state.calH)],["se",mm(state.calW),mm(state.calH)]];
    pos.forEach(([name,x,y])=>{
      const h=document.createElementNS(svgns,"rect");
      h.setAttribute("x",x-size/2); h.setAttribute("y",y-size/2);
      h.setAttribute("width",size); h.setAttribute("height",size); h.setAttribute("rx",mm(0.8));
      h.setAttribute("class","handle"); h.dataset.role=name;
      h.style.cursor=({"nw":"nwse-resize","se":"nwse-resize","ne":"nesw-resize","sw":"nesw-resize","n":"ns-resize","s":"ns-resize","w":"ew-resize","e":"ew-resize"})[name];
      ov.appendChild(h);
    });
    svg.appendChild(ov);
    wireDrag(svg, ov);
  }

  return svg;
}

/* ===== render ===== */
function render(){
  previewHost.innerHTML = '<div id="hud" class="hud" style="display:none"></div>';
  hud = $("hud");

  const svg = buildMonthSVG(state.year, state.month, {exportMode:false});
  svg.style.maxWidth="100%"; svg.style.height="auto";
  previewHost.appendChild(svg);
}

/* ===== drag logic ===== */
function wireDrag(svg, ov){
  let active = null;

  const onDown = (e) => {
    const role = (e.target && e.target.dataset) ? e.target.dataset.role : null;
    if (!role) return;
    e.preventDefault();
    svg.setPointerCapture(e.pointerId);
    active = {
      role,
      mx: e.clientX, my: e.clientY,
      start: { x: state.calX, y: state.calY, w: state.calW, h: state.calH }
    };
    hud.style.display = "block";
  };

  const onMove = (e) => {
    if (!active) return;
    const dxmm = (e.clientX - active.mx) / PX_PER_MM;
    const dymm = (e.clientY - active.my) / PX_PER_MM;
    let {x,y,w,h} = active.start;
    const minW=10, minH=10;

    if (active.role==="move"){ x+=dxmm; y+=dymm; }
    else if (active.role==="e"){ w=clamp(w+dxmm,minW,9999); }
    else if (active.role==="w"){ x+=dxmm; w=clamp(w-dxmm,minW,9999); }
    else if (active.role==="s"){ h=clamp(h+dymm,minH,9999); }
    else if (active.role==="n"){ y+=dymm; h=clamp(h-dymm,minH,9999); }
    else if (active.role==="se"){ w=clamp(w+dxmm,minW,9999); h=clamp(h+dymm,minH,9999); }
    else if (active.role==="ne"){ w=clamp(w+dxmm,minW,9999); y+=dymm; h=clamp(h-dymm,minH,9999); }
    else if (active.role==="sw"){ x+=dxmm; w=clamp(w-dxmm,minW,9999); h=clamp(h+dymm,minH,9999); }
    else if (active.role==="nw"){ x+=dxmm; y+=dymm; w=clamp(w-dxmm,minW,9999); h=clamp(h-dymm,minH,9999); }

    x = clamp(x, 0, state.pageW - w);
    y = clamp(y, 0, state.pageH - h);

    state.calX = r1(x); state.calY = r1(y); state.calW = r1(w); state.calH = r1(h);
    $("calX").value=state.calX; $("calY").value=state.calY; $("calW").value=state.calW; $("calH").value=state.calH;

    // fast overlay update
    ov.setAttribute("transform", `translate(${mm(state.calX)}, ${mm(state.calY)})`);
    ov.querySelector('rect.guide').setAttribute("width", mm(state.calW));
    ov.querySelector('rect.guide').setAttribute("height", mm(state.calH));
    const wpx=mm(state.calW), hpx=mm(state.calH), size=mm(4.5);
    ov.querySelectorAll('.handle').forEach(hh=>{
      const role=hh.dataset.role; let hx=0,hy=0;
      if (role.includes("e")) hx=wpx; if (role.includes("w")) hx=0;
      if (role==="n"||role==="s") hx=wpx/2;
      if (role.includes("s")) hy=hpx; if (role.includes("n")) hy=0;
      if (role==="w"||role==="e") hy=hpx/2;
      hh.setAttribute("x",hx-size/2); hh.setAttribute("y",hy-size/2);
    });

    // HUD
    const vb=previewHost.getBoundingClientRect();
    hud.textContent = `X:${state.calX} Y:${state.calY}  W:${state.calW} H:${state.calH} mm`;
    hud.style.left = (e.clientX - vb.left + previewHost.scrollLeft + 12) + "px";
    hud.style.top  = (e.clientY - vb.top  + previewHost.scrollTop  + 12) + "px";
  };

  const onUp = () => { active=null; hud.style.display="none"; render(); };

  ov.addEventListener("pointerdown", onDown);
  svg.addEventListener("pointermove", onMove);
  svg.addEventListener("pointerup", onUp);
}

/* ===== preview + ZIP ===== */
function serializeSVG(svg){ return `<?xml version="1.0" encoding="UTF-8"?>\n` + new XMLSerializer().serializeToString(svg); }
function buildSVGString(y,m){ return serializeSVG(buildMonthSVG(y,m,{exportMode:true})); }

function openPreviewAndZip(){
  const w = window.open("", "_blank");
  if (!w) { alert("Popup blocked."); return; }
  w.document.title = `Calendar ${state.year} — Preview`;

  const style = w.document.createElement("style");
  style.textContent = 'body{font:14px/1.3 system-ui;background:#111;color:#eee;margin:0}'
    +'.bar{position:sticky;top:0;background:#111;padding:10px;border-bottom:1px solid #333;display:flex;gap:8px;align-items:center}'
    +'button{background:#1b2a45;color:#fff;border:1px solid #2e4a7a;border-radius:6px;padding:6px 10px;cursor:pointer}'
    +'.wrap{padding:10px 12px}.page{background:#fff;margin:12px auto;box-shadow:0 2px 12px rgba(0,0,0,.35);border:1px solid #ddd}';
  w.document.head.appendChild(style);

  const bar=w.document.createElement("div"); bar.className="bar";
  const btn=w.document.createElement("button"); btn.id="dl"; btn.textContent="Download ZIP (12 SVG)";
  bar.appendChild(btn); w.document.body.appendChild(bar);

  const wrap=w.document.createElement("div"); wrap.className="wrap"; wrap.id="wrap"; w.document.body.appendChild(wrap);

  // render pages
  for (let m=0;m<12;m++){
    const svgStr = buildSVGString(state.year,m);
    const div = w.document.createElement("div");
    div.className="page"; div.style.width = (state.pageW*3) + "px";
    div.innerHTML = svgStr; wrap.appendChild(div);
  }

  // load JSZip via script tag; wire click on load
  const script = w.document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
  script.onload = ()=>{
    btn.onclick = async ()=>{
      const zip = new w.JSZip();
      const months = monthsByLang(state.lang);
      for (let m=0;m<12;m++){
        zip.file(`${String(m+1).padStart(2,"0")}_${months[m]}_${state.year}.svg`, buildSVGString(state.year,m));
      }
      const blob = await zip.generateAsync({type:"blob"});
      const url = w.URL.createObjectURL(blob);
      const a = w.document.createElement("a");
      a.href = url; a.download = `Calendar_${state.year}.zip`;
      w.document.body.appendChild(a); a.click(); a.remove(); w.URL.revokeObjectURL(url);
    };
  };
  script.onerror = ()=>{ btn.disabled=true; btn.textContent="ZIP unavailable (CDN blocked)"; };
  w.document.head.appendChild(script);
}

/* ===== splitter ===== */
function setupSplitter(){
  const splitter = document.getElementById("splitter");
  let startX = 0, startW = 0, active = false;

  // restore saved width
  const saved = localStorage.getItem("sidebar-w");
  if (saved) document.documentElement.style.setProperty("--sidebar-w", saved + "px");

  splitter.addEventListener("pointerdown", (e)=>{
    active = true;
    startX = e.clientX;
    const cs = getComputedStyle(document.documentElement);
    startW = parseFloat(cs.getPropertyValue("--sidebar-w"));
    splitter.setPointerCapture(e.pointerId);
    splitter.style.background = "#3a4150";
  });

  const onMove = (e)=>{
    if (!active) return;
    const dx = e.clientX - startX;
    const vw = Math.max(window.innerWidth, 360);
    const maxPx = Math.min(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sidebar-max")), vw * 0.6);
    let w = clamp(startW + dx, parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sidebar-min")), maxPx);
    document.documentElement.style.setProperty("--sidebar-w", w + "px");
  };

  const onUp = ()=>{
    if (!active) return;
    active = false;
    splitter.style.background = "var(--line)";
    const w = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sidebar-w"));
    localStorage.setItem("sidebar-w", String(Math.round(w)));
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

/* ===== kick it off ===== */
render();
