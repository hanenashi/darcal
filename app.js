/* ===== basics ===== */
const PX_PER_MM = 96/25.4, mm=v=>v*PX_PER_MM, ptToPx=pt=>pt*(96/72);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)), r1=v=>Math.round(v*10)/10;
const $=id=>document.getElementById(id);

function isLeap(y){return(y%4===0&&y%100!==0)||(y%400===0)}
function daysInMonth(y,m){return[31,isLeap(y)?29:28,31,30,31,30,31,31,30,31,30,31][m]}
function firstWeekday(y,m,f){const d=new Date(y,m,1).getDay();return(d-f+7)%7}

/* ===== language ===== */
const MONTH_EN=["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_CZ=["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];
const MONTH_JA=["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const WD_EN_S=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], WD_EN_F=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const WD_CZ_S=["Ne","Po","Út","St","Čt","Pá","So"],       WD_CZ_F=["Neděle","Pondělí","Úterý","Středa","Čtvrtek","Pátek","Sobota"];
const WD_JA_S=["日","月","火","水","木","金","土"],         WD_JA_F=["日曜日","月曜日","火曜日","水曜日","木曜日","金曜日","土曜日"];

function monthsByLang(lang){return lang==="ENG"?MONTH_EN:lang==="CZE"?MONTH_CZ:MONTH_JA}
function weekdaysByLang(lang,full){return (lang==="ENG"?(full?WD_EN_F:WD_EN_S):lang==="CZE"?(full?WD_CZ_F:WD_CZ_S):(full?WD_JA_F:WD_JA_S)).slice()}

/* ===== state ===== */
const state={
  lang:"ENG", fullNames:false,
  pageW:210,pageH:297,preset:"A4P",
  year:(new Date()).getFullYear(), month:(new Date()).getMonth(), firstDay:0,
  calX:15,calY:150,calW:180,calH:120,showGuides:true,
  hdrText:"{MONTH} {YEAR}", hdrFont:"Inter, Arial", hdrSizePt:18, hdrAlign:"left", hdrGap:6,
  cellStrokePt:0.6, cellRadius:2, gutX:2, gutY:2,
  tableLines:false, hideEmpty:false, showAdj:false, adjAlpha:55,
  tableStrokePt:0.8,
  dayFont:"Inter, Arial", daySizePt:9, dayOffX:-1.5, dayOffY:1.5, dayAnchor:"top-right",
  wdFont:"Inter, Arial", wdSizePt:8, wdOffX:0, wdOffY:-2,
  view:{scale:1, tx:12, ty:12, min:0.3, max:4},
  win:{x:null,y:null,w:null,h:null}
};

let previewHost, stage, hud;

/* ===== safe binding helpers ===== */
function bindNum(id,key){ const e=$(id); if(!e) return;
  const fn=()=>{ state[key]=parseFloat(e.value)||0; render(); };
  e.addEventListener("input",fn); state[key]=parseFloat(e.value)||state[key];
}
function bindTxt(id,key){ const e=$(id); if(!e) return;
  const fn=()=>{ state[key]=e.value; render(); };
  e.addEventListener("input",fn); state[key]=e.value;
}
function bindSel(id,key,intMode=false){ const e=$(id); if(!e) return;
  const fn=()=>{ state[key]=intMode?parseInt(e.value):e.value; render(); };
  e.addEventListener("change",fn); state[key]=intMode?parseInt(e.value):e.value;
}
function bindChk(id,key){ const e=$(id); if(!e) return;
  const fn=()=>{ state[key]=e.checked; render(); };
  e.addEventListener("change",fn); state[key]=e.checked;
}

/* ===== UI init ===== */
function init(){
  previewHost=$("preview"); hud=$("hud");

  stage=document.createElement("div");
  stage.id="stage";
  previewHost.appendChild(stage);

  // Populate month select
  const ms=$("month"); if(ms){ ms.innerHTML=Array.from({length:12},(_,i)=>`<option value="${i}">${i+1}</option>`).join(""); ms.value=state.month; }
  const yr=$("year"); if(yr){ yr.value=state.year; }

  // Core bindings
  bindSel("lang","lang"); bindChk("fullNames","fullNames");
  bindSel("firstDay","firstDay",true);

  bindSel("pagePreset","preset");
  const pp=$("pagePreset");
  pp && pp.addEventListener("change",()=>{
    const map={A4P:[210,297],A4L:[297,210],A5P:[148,210],A5L:[210,148],B5P:[176,250],B5L:[250,176],B4P:[250,353],B4L:[353,250]};
    const p=pp.value; if(map[p]){ $("pageW").value=map[p][0]; $("pageH").value=map[p][1]; state.pageW=map[p][0]; state.pageH=map[p][1]; render(); }
  });
  bindNum("pageW","pageW"); bindNum("pageH","pageH");

  ["calX","calY","calW","calH"].forEach(k=>bindNum(k,k));
  bindChk("showGuides","showGuides");

  bindNum("year","year");
  bindSel("month","month",true);
  const prevM=$("prevM"), nextM=$("nextM");
  prevM && (prevM.onclick=()=>{ state.month=(state.month+11)%12; $("month").value=state.month; render(); });
  nextM && (nextM.onclick=()=>{ state.month=(state.month+1)%12; $("month").value=state.month; render(); });

  // Header fonts
  setupFontPicker("hdrFontSel","hdrFontCustomRow","hdrFontCustom","hdrFont");
  bindNum("hdrSize","hdrSizePt"); bindSel("hdrAlign","hdrAlign"); bindNum("hdrGap","hdrGap");
  bindTxt("hdrText","hdrText");

  // Grid & cells
  bindNum("cellStrokePt","cellStrokePt"); bindNum("cellRadius","cellRadius");
  bindNum("gutX","gutX"); bindNum("gutY","gutY");
  bindChk("tableLines","tableLines"); bindChk("hideEmpty","hideEmpty");
  bindChk("showAdj","showAdj"); bindNum("adjAlpha","adjAlpha");
  bindNum("tableStrokePt","tableStrokePt");

  // Day fonts
  setupFontPicker("dayFontSel","dayFontCustomRow","dayFontCustom","dayFont");
  bindNum("daySizePt","daySizePt");
  bindNum("dayOffX","dayOffX"); bindNum("dayOffY","dayOffY"); bindSel("dayAnchor","dayAnchor");

  // Weekday names
  setupFontPicker("wdFontSel","wdFontCustomRow","wdFontCustom","wdFont");
  bindNum("wdSizePt","wdSizePt"); bindNum("wdOffX","wdOffX"); bindNum("wdOffY","wdOffY");

  // Generate all
  const gen=$("generate"); gen && (gen.onclick=()=>openPreviewAndZip());

  // Settings window + button
  setupSettingsWindow();
  setupSettingsButtonDrag();

  // Back-compat shim for old FAB (safe no-op if missing)
  setupFabShim();

  // Hotkeys and pan/zoom
  setupHotkeys();
  wirePanZoom();

  render();
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
    render();
  };
  sel.addEventListener("change",apply);
  inp && inp.addEventListener("input",apply);
  if(sel.value!=="__custom__") row.classList.add("hidden");
}

/* ===== weekday helper ===== */
function weekdayRow(){
  const base=weekdaysByLang(state.lang,state.fullNames);
  if(state.firstDay===0) return base;
  const copy=base.slice(); copy.push(copy.shift()); return copy;
}

/* ===== SVG build ===== */
function buildMonthSVG(y,mIdx,{exportMode=false}={}){
  const svgns="http://www.w3.org/2000/svg";
  const svg=document.createElementNS(svgns,"svg");
  svg.setAttribute("xmlns","http://www.w3.org/2000/svg");
  svg.setAttribute("width",state.pageW+"mm"); svg.setAttribute("height",state.pageH+"mm");
  svg.setAttribute("viewBox",`0 0 ${mm(state.pageW)} ${mm(state.pageH)}`);

  const page=document.createElementNS(svgns,"rect");
  page.setAttribute("x",0); page.setAttribute("y",0);
  page.setAttribute("width",mm(state.pageW)); page.setAttribute("height",mm(state.pageH));
  page.setAttribute("fill","#fff"); svg.appendChild(page);

  const g=document.createElementNS(svgns,"g");
  g.setAttribute("transform",`translate(${mm(state.calX)}, ${mm(state.calY)})`);
  svg.appendChild(g);

  const months=monthsByLang(state.lang);
  const title=(state.hdrText||"").replace("{MONTH}",months[mIdx]).replace("{YEAR}",String(y));
  const hdr=document.createElementNS(svgns,"text");
  hdr.setAttribute("font-family",state.hdrFont);
  hdr.setAttribute("font-size",ptToPx(state.hdrSizePt));
  hdr.setAttribute("dominant-baseline","hanging");
  hdr.setAttribute("fill","#000");
  let tx=0, ta="start"; if(state.hdrAlign==="center"){tx=mm(state.calW)/2;ta="middle"} else if(state.hdrAlign==="right"){tx=mm(state.calW);ta="end"}
  hdr.setAttribute("x",tx); hdr.setAttribute("y",0); hdr.setAttribute("text-anchor",ta);
  hdr.textContent=title; g.appendChild(hdr);

  const hdrGapPx=mm(state.hdrGap);
  const gridY0=ptToPx(state.hdrSizePt)+hdrGapPx;

  const cols=7, rows=6;
  const gutX=mm(state.gutX), gutY=mm(state.gutY);
  const gridW=mm(state.calW), gridH=mm(state.calH)-gridY0;
  const cellW=(gridW-gutX*(cols-1))/cols;
  const cellH=(gridH-gutY*(rows-1))/rows;

  /* weekday names */
  const wdY = gridY0 + mm(state.wdOffY);
  weekdayRow().forEach((d,i)=>{
    const t=document.createElementNS(svgns,"text");
    t.setAttribute("x",i*(cellW+gutX)+cellW/2 + mm(state.wdOffX));
    t.setAttribute("y",wdY);
    t.setAttribute("font-family",state.wdFont);
    t.setAttribute("font-size",ptToPx(state.wdSizePt));
    t.setAttribute("fill","#333"); t.setAttribute("text-anchor","middle");
    t.setAttribute("dominant-baseline","alphabetic");
    t.textContent=d; g.appendChild(t);
  });

  const startOff=firstWeekday(y,mIdx,state.firstDay);
  const days=daysInMonth(y,mIdx);
  const daysPrev=daysInMonth(y-(mIdx===0?1:0),(mIdx+11)%12);
  let n=1,trailing=1;

  /* Table vs Card modes */
  if(state.tableLines){
    const strokeW = ptToPx(state.tableStrokePt || state.cellStrokePt);

    if(state.hideEmpty && !state.showAdj){
      // draw only active days as stroked cells (no fill)
      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          const idx=r*cols+c, x=c*(cellW+gutX), y=gridY0+r*(cellH+gutY);
          const inLead = idx<startOff;
          const afterEnd = (idx>=startOff+days);
          const active = !(inLead || afterEnd);
          if(!active) continue;

          const rect=document.createElementNS(svgns,"rect");
          rect.setAttribute("x",x); rect.setAttribute("y",y);
          rect.setAttribute("width",cellW); rect.setAttribute("height",cellH);
          rect.setAttribute("fill","none");
          rect.setAttribute("stroke","#000");
          rect.setAttribute("stroke-width",strokeW);
          g.appendChild(rect);
        }
      }
    }else{
      // classic full grid
      const border=document.createElementNS(svgns,"rect");
      border.setAttribute("x",0); border.setAttribute("y",gridY0);
      border.setAttribute("width",gridW); border.setAttribute("height",gridH);
      border.setAttribute("fill","none"); border.setAttribute("stroke","#000");
      border.setAttribute("stroke-width",strokeW); g.appendChild(border);
      for(let c=1;c<cols;c++){
        const x=c*(cellW+gutX)-gutX/2;
        const v=document.createElementNS(svgns,"line");
        v.setAttribute("x1",x); v.setAttribute("y1",gridY0); v.setAttribute("x2",x); v.setAttribute("y2",gridY0+gridH);
        v.setAttribute("stroke","#000"); v.setAttribute("stroke-width",strokeW); g.appendChild(v);
      }
      for(let r=1;r<rows;r++){
        const yLine=gridY0+r*(cellH+gutY)-gutY/2;
        const h=document.createElementNS(svgns,"line");
        h.setAttribute("x1",0); h.setAttribute("y1",yLine); h.setAttribute("x2",gridW); h.setAttribute("y2",yLine);
        h.setAttribute("stroke","#000"); h.setAttribute("stroke-width",strokeW); g.appendChild(h);
      }
    }
  }

  // cells + labels (shared)
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const idx=r*cols+c, x=c*(cellW+gutX), y=gridY0+r*(cellH+gutY);
      let active=false,label="",adj=false;

      if(idx<startOff){
        if(!(state.hideEmpty&&!state.showAdj)){
          if(state.showAdj){label=String(daysPrev-(startOff-1-idx)); adj=true;}
        }
      } else if(n<=days){
        active=true; label=String(n++);
      } else {
        if(!(state.hideEmpty&&!state.showAdj)){
          if(state.showAdj){label=String(trailing++); adj=true;}
        }
      }

      // non-table mode draws rounded tiles; table mode may already have strokes
      if(!state.tableLines){
        if(!state.hideEmpty || active || state.showAdj){
          const rect=document.createElementNS(svgns,"rect");
          rect.setAttribute("x",x); rect.setAttribute("y",y);
          rect.setAttribute("width",cellW); rect.setAttribute("height",cellH);
          rect.setAttribute("rx",mm(state.cellRadius));
          rect.setAttribute("fill",active?"#fff":"#f6f6f6");
          rect.setAttribute("stroke",state.cellStrokePt>0?"#000":"none");
          rect.setAttribute("stroke-width",ptToPx(state.cellStrokePt));
          g.appendChild(rect);
        }
      }

      if(label){
        const dn=document.createElementNS(svgns,"text");
        dn.setAttribute("font-family",state.dayFont);
        dn.setAttribute("font-size",ptToPx(state.daySizePt));
        dn.setAttribute("fill",adj?`rgba(0,0,0,${clamp(state.adjAlpha,10,90)/100})`:"#000");
        const dx=mm(state.dayOffX), dy=mm(state.dayOffY);
        let ax,ay,anch=state.dayAnchor;
        if(anch==="top-right"){ax=x+cellW+dx;ay=y+dy;dn.setAttribute("text-anchor","end");dn.setAttribute("dominant-baseline","hanging")}
        else if(anch==="top-left"){ax=x+dx;ay=y+dy;dn.setAttribute("text-anchor","start");dn.setAttribute("dominant-baseline","hanging")}
        else if(anch==="center"){ax=x+cellW/2+dx;ay=y+cellH/2+dy;dn.setAttribute("text-anchor","middle");dn.setAttribute("dominant-baseline","middle")}
        else {ax=x+cellW+dx;ay=y+cellH+dy;dn.setAttribute("text-anchor","end");dn.setAttribute("dominant-baseline","ideographic")}
        dn.setAttribute("x",ax); dn.setAttribute("y",ay); dn.textContent=label; g.appendChild(dn);
      }
    }
  }

  // interactive overlay
  if(state.showGuides && !exportMode){
    const ov=document.createElementNS(svgns,"g");
    ov.setAttribute("transform",`translate(${mm(state.calX)}, ${mm(state.calY)})`);

    const hit=document.createElementNS(svgns,"rect");
    hit.setAttribute("x",-mm(4)); hit.setAttribute("y",-mm(4));
    hit.setAttribute("width",mm(state.calW)+mm(8)); hit.setAttribute("height",mm(state.calH)+mm(8));
    hit.setAttribute("fill","rgba(0,0,0,0)"); hit.style.cursor="move"; hit.dataset.role="move";
    ov.appendChild(hit);

    const guide=document.createElementNS(svgns,"rect");
    guide.setAttribute("x",0); guide.setAttribute("y",0);
    guide.setAttribute("width",mm(state.calW)); guide.setAttribute("height",mm(state.calH));
    guide.setAttribute("class","guide"); guide.dataset.role="move"; guide.style.cursor="move";
    ov.appendChild(guide);

    const size=mm(4.5);
    [["nw",0,0],["n",mm(state.calW)/2,0],["ne",mm(state.calW),0],
     ["w",0,mm(state.calH)/2],["e",mm(state.calW),mm(state.calH)/2],
     ["sw",0,mm(state.calH)],["s",mm(state.calW)/2,mm(state.calH)],["se",mm(state.calW),mm(state.calH)]
    ].forEach(([name,x,y])=>{
      const h=document.createElementNS(svgns,"rect");
      h.setAttribute("x",x-size/2); h.setAttribute("y",y-size/2);
      h.setAttribute("width",size); h.setAttribute("height",size); h.setAttribute("rx",mm(0.8));
      h.setAttribute("class","handle"); h.dataset.role=name;
      h.style.cursor=({"nw":"nwse-resize","se":"nwse-resize","ne":"nesw-resize","sw":"nesw-resize","n":"ns-resize","s":"ns-resize","w":"ew-resize","e":"ew-resize"})[name];
      ov.appendChild(h);
    });
    svg.appendChild(ov);
    wireDrag(svg,ov);
  }

  return svg;
}

/* ===== render ===== */
function render(){
  stage.innerHTML="";
  const svg=buildMonthSVG(state.year,state.month,{exportMode:false});
  svg.style.maxWidth="100%"; svg.style.height="auto";
  stage.appendChild(svg);
  applyView();
  syncControlValuesIfOpen();
}

function syncControlValuesIfOpen(){
  const sheet=$("sheet");
  if (sheet && sheet.getAttribute("aria-hidden")==="false"){
    ["calX","calY","calW","calH"].forEach(k=>{ const e=$(k); if(e && document.activeElement!==e) e.value=state[k]; });
    const yr=$("year"); if(yr && document.activeElement!==yr) yr.value=state.year;
    const ms=$("month"); if(ms && document.activeElement!==ms) ms.value=state.month;
    const pw=$("pageW"), ph=$("pageH");
    pw && document.activeElement!==pw && (pw.value=state.pageW);
    ph && document.activeElement!==ph && (ph.value=state.pageH);
  }
}

/* ===== drag calendar block ===== */
function wireDrag(svg,ov){
  let active=null;
  const onDown=e=>{
    const role=(e.target&&e.target.dataset)?e.target.dataset.role:null; if(!role)return;
    e.preventDefault();
    if(e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    active={role,mx:e.clientX,my:e.clientY,start:{x:state.calX,y:state.calY,w:state.calW,h:state.calH}};
    hud.style.display="block";
  };
  const onMove=e=>{
    if(!active)return;
    const dxmm=(e.clientX-active.mx)/PX_PER_MM, dymm=(e.clientY-active.my)/PX_PER_MM;
    let {x,y,w,h}=active.start; const minW=10,minH=10;
    if(active.role==="move"){x+=dxmm;y+=dymm}
    else if(active.role==="e"){w=clamp(w+dxmm,minW,9999)}
    else if(active.role==="w"){x+=dxmm;w=clamp(w-dxmm,minW,9999)}
    else if(active.role==="s"){h=clamp(h+dymm,minH,9999)}
    else if(active.role==="n"){y+=dymm;h=clamp(h-dymm,minH,9999)}
    else if(active.role==="se"){w=clamp(w+dxmm,minW,9999);h=clamp(h+dymm,minH,9999)}
    else if(active.role==="ne"){w=clamp(w+dxmm,minW,9999);y+=dymm;h=clamp(h-dymm,minH,9999)}
    else if(active.role==="sw"){x+=dxmm;w=clamp(w-dxmm,minW,9999);h=clamp(h+dymm,minH,9999)}
    else if(active.role==="nw"){x+=dxmm;y+=dymm;w=clamp(w-dxmm,minW,9999);h=clamp(h-dymm,minH,9999)}
    x=clamp(x,0,state.pageW-w); y=clamp(y,0,state.pageH-h);
    state.calX=r1(x); state.calY=r1(y); state.calW=r1(w); state.calH=r1(h);

    ov.setAttribute("transform",`translate(${mm(state.calX)}, ${mm(state.calY)})`);
    const grect=ov.querySelector('rect.guide');
    grect.setAttribute("width",mm(state.calW)); grect.setAttribute("height",mm(state.calH));
    const wpx=mm(state.calW), hpx=mm(state.calH), size=mm(4.5);
    ov.querySelectorAll('.handle').forEach(hh=>{
      const role=hh.dataset.role; let hx=0,hy=0;
      if(role.includes("e"))hx=wpx; if(role.includes("w"))hx=0;
      if(role==="n"||role==="s")hx=wpx/2;
      if(role.includes("s"))hy=hpx; if(role.includes("n"))hy=0;
      if(role==="w"||role==="e")hy=hpx/2;
      hh.setAttribute("x",hx-size/2); hh.setAttribute("y",hy-size/2);
    });

    const vb=previewHost.getBoundingClientRect();
    hud.textContent=`X:${state.calX} Y:${state.calY}  W:${state.calW} H:${state.calH} mm`;
    hud.style.left=(e.clientX - vb.left + 12)+"px";
    hud.style.top =(e.clientY - vb.top  + 12)+"px";

    syncControlValuesIfOpen();
  };
  const end=()=>{active=null;hud.style.display="none";render()};
  ov.addEventListener("pointerdown",onDown, {passive:false});
  svg.addEventListener("pointermove",onMove, {passive:false});
  svg.addEventListener("pointerup",end, {passive:true});
  svg.addEventListener("pointercancel",end, {passive:true});
}

/* ===== pan & zoom ===== */
function wirePanZoom(){
  let isPanning=false, panStart=null;

  previewHost.addEventListener("wheel",(e)=>{
    if(e.ctrlKey) return;
    e.preventDefault();
    const rect=previewHost.getBoundingClientRect();
    const cx=e.clientX-rect.left, cy=e.clientY-rect.top;
    zoomAtPoint(e.deltaY < 0 ? 1.1 : 1/1.1, cx, cy);
  }, {passive:false});

  previewHost.addEventListener("pointerdown",(e)=>{
    if(e.target.closest('svg [data-role]')) return;
    isPanning=true;
    panStart={x:e.clientX, y:e.clientY, tx:state.view.tx, ty:state.view.ty};
    previewHost.setPointerCapture && previewHost.setPointerCapture(e.pointerId);
  });
  previewHost.addEventListener("pointermove",(e)=>{
    if(!isPanning) return;
    const dx=e.clientX - panStart.x, dy=e.clientY - panStart.y;
    state.view.tx = panStart.tx + dx;
    state.view.ty = panStart.ty + dy;
    applyView();
  });
  const endPan=()=>{ isPanning=false; };
  previewHost.addEventListener("pointerup", endPan, {passive:true});
  previewHost.addEventListener("pointercancel", endPan, {passive:true});

  // touch pinch + drag
  let touches=new Map();
  previewHost.addEventListener("touchmove",(e)=>{
    if(e.touches.length===1){
      const t=e.touches[0];
      const prev=touches.get(t.identifier)||{x:t.clientX,y:t.clientY};
      state.view.tx += (t.clientX - prev.x);
      state.view.ty += (t.clientY - prev.y);
      touches.set(t.identifier,{x:t.clientX,y:t.clientY});
      applyView();
    }else if(e.touches.length===2){
      e.preventDefault();
      const [a,b]=e.touches;
      const pa=touches.get(a.identifier)||{x:a.clientX,y:a.clientY};
      const pb=touches.get(b.identifier)||{x:b.clientX,y:b.clientY};
      const prevDist=Math.hypot(pa.x-pb.x, pa.y-pb.y) || 1;
      const newDist=Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY) || 1;
      const rect=previewHost.getBoundingClientRect();
      const midX=((a.clientX+b.clientX)/2) - rect.left;
      const midY=((a.clientY+b.clientY)/2) - rect.top;
      zoomAtPoint(newDist/prevDist, midX, midY);
      touches.set(a.identifier,{x:a.clientX,y:a.clientY});
      touches.set(b.identifier,{x:b.clientX,y:b.clientY});
    }
  }, {passive:false});
  previewHost.addEventListener("touchend",(e)=>{ for(const t of e.changedTouches) touches.delete(t.identifier); }, {passive:true});
}

function screenToWorld(sx, sy){
  const sc=state.view.scale;
  return { x:(sx - state.view.tx)/sc, y:(sy - state.view.ty)/sc };
}
function applyView(){
  const {scale,tx,ty}=state.view;
  stage.style.transform=`translate(${tx}px, ${ty}px) scale(${scale})`;
}
function zoomAtPoint(factor, cx, cy){
  const before = screenToWorld(cx, cy);
  state.view.scale = clamp(state.view.scale * factor, state.view.min, state.view.max);
  const after = screenToWorld(cx, cy);
  state.view.tx += (before.x - after.x) * state.view.scale;
  state.view.ty += (before.y - after.y) * state.view.scale;
  applyView();
}

/* ===== preview + ZIP ===== */
function serializeSVG(svg){return'<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(svg)}
function buildSVGString(y,m){return serializeSVG(buildMonthSVG(y,m,{exportMode:true}))}
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
  for(let m=0;m<12;m++){ const div=w.document.createElement("div"); div.className="page"; div.style.width=(state.pageW*3)+"px"; div.innerHTML=buildSVGString(state.year,m); wrap.appendChild(div); }
  const script=w.document.createElement("script");
  script.src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
  script.onload=()=>{ btn.onclick=async()=>{ const zip=new w.JSZip(), months=monthsByLang(state.lang);
      for(let m=0;m<12;m++) zip.file(`${String(m+1).padStart(2,"0")}_${months[m]}_${state.year}.svg`, buildSVGString(state.year,m));
      const blob=await zip.generateAsync({type:"blob"}); const url=w.URL.createObjectURL(blob);
      const a=w.document.createElement("a"); a.href=url; a.download=`Calendar_${state.year}.zip`; w.document.body.appendChild(a); a.click(); a.remove(); w.URL.revokeObjectURL(url); }; };
  script.onerror=()=>{ btn.disabled=true; btn.textContent="ZIP unavailable (CDN blocked)"; };
  w.document.head.appendChild(script);
}

/* ===== Settings window ===== */
function setupSettingsWindow(){
  const sheet = $("sheet");
  const win   = document.querySelector(".sheet-card");
  const btn   = $("settingsBtn");
  const closeBtn = $("closeSheet");
  const dragHandle = $("sheetDragHandle");
  const reset = $("resetView");

  if (!sheet || !win) return;

  // restore geometry
  try{
    const s = JSON.parse(localStorage.getItem("settings-win")||"{}");
    if (s && s.w && s.h && s.x!=null && s.y!=null){
      win.style.width  = s.w + "px";
      win.style.height = s.h + "px";
      win.style.left   = s.x + "px";
      win.style.top    = s.y + "px";
      win.style.transform = "none";
    }
  }catch{}

  // open/close
  function openSheet(){ sheet.setAttribute("aria-hidden","false"); syncControlValuesIfOpen(); }
  function closeSheet(){ sheet.setAttribute("aria-hidden","true"); }

  btn && btn.addEventListener("click", openSheet);
  closeBtn && closeBtn.addEventListener("click", closeSheet);

  // header drag (but don't start drag when clicking actions/buttons)
  if (dragHandle){
    let dragging=false, sx=0, sy=0, sl=0, st=0;
    dragHandle.addEventListener("pointerdown",(e)=>{
      if (e.target.closest('.sheet-actions') || e.target.tagName==='BUTTON') return;
      const r=win.getBoundingClientRect();
      dragging=true; sx=e.clientX; sy=e.clientY; sl=r.left; st=r.top;
      dragHandle.setPointerCapture && dragHandle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    window.addEventListener("pointermove",(e)=>{
      if(!dragging) return;
      let nl = sl + (e.clientX - sx);
      let nt = st + (e.clientY - sy);
      nl = Math.max(0, Math.min(nl, window.innerWidth  - 80));
      nt = Math.max(0, Math.min(nt, window.innerHeight - 80));
      win.style.left = nl + "px";
      win.style.top  = nt + "px";
      win.style.transform = "none";
    }, {passive:false});
    window.addEventListener("pointerup", ()=>{
      if(!dragging) return; dragging=false; saveWinGeom();
    }, {passive:true});
  }

  // resizers
  const handles = win.querySelectorAll(".win-handle");
  let rs=null;
  handles.forEach(h=>{
    h.addEventListener("pointerdown",(e)=>{
      const role=h.dataset.role;
      const r=win.getBoundingClientRect();
      rs={role, sx:e.clientX, sy:e.clientY, x:r.left, y:r.top, w:r.width, h:r.height};
      h.setPointerCapture && h.setPointerCapture(e.pointerId);
      e.preventDefault();
    }, {passive:false});
  });
  window.addEventListener("pointermove",(e)=>{
    if(!rs) return;
    let {role,sx,sy,x,y,w,h}=rs;
    let dx=e.clientX - sx, dy=e.clientY - sy;
    const minW=320, minH=280;
    if(role.includes("e")) w = Math.max(minW, w + dx);
    if(role.includes("s")) h = Math.max(minH, h + dy);
    if(role.includes("w")){ w = Math.max(minW, w - dx); x = x + dx; }
    if(role.includes("n")){ h = Math.max(minH, h - dy); y = y + dy; }
    win.style.width=w+"px"; win.style.height=h+"px";
    win.style.left=x+"px";  win.style.top=y+"px";
    win.style.transform="none";
  }, {passive:false});
  const endResize=()=>{ if(!rs) return; rs=null; saveWinGeom(); };
  window.addEventListener("pointerup", endResize, {passive:true});
  window.addEventListener("pointercancel", endResize, {passive:true});

  function saveWinGeom(){
    const r=win.getBoundingClientRect();
    localStorage.setItem("settings-win", JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height}));
  }

  // reset view
  reset && reset.addEventListener("click", ()=>{
    state.view={...state.view, scale:1, tx:12, ty:12};
    applyView();
  });
}

/* ===== Draggable Settings button ===== */
function setupSettingsButtonDrag(){
  const btn = $("settingsBtn");
  if(!btn) return;

  // restore pos
  try{
    const s = JSON.parse(localStorage.getItem("settings-btn-pos")||"{}");
    if (s && s.l!=null && s.t!=null){ btn.style.left=s.l+"px"; btn.style.top=s.t+"px"; btn.style.right=""; btn.style.bottom=""; }
  }catch{}

  let dragging=false, sx=0, sy=0, sl=0, st=0, moved=false;
  btn.addEventListener("pointerdown",(e)=>{
    dragging=true; moved=false;
    const r=btn.getBoundingClientRect();
    sx=e.clientX; sy=e.clientY; sl=r.left; st=r.top;
    btn.setPointerCapture && btn.setPointerCapture(e.pointerId);
  });
  window.addEventListener("pointermove",(e)=>{
    if(!dragging) return;
    const dx=e.clientX-sx, dy=e.clientY-sy;
    if(Math.abs(dx)+Math.abs(dy)>3) moved=true;
    const nl=Math.max(8, Math.min(sl+dx, window.innerWidth - btn.offsetWidth - 8));
    const nt=Math.max(8, Math.min(st+dy, window.innerHeight - btn.offsetHeight - 8));
    btn.style.left=nl+"px"; btn.style.top=nt+"px"; btn.style.right=""; btn.style.bottom="";
  }, {passive:false});
  window.addEventListener("pointerup",()=>{
    if(!dragging) return;
    dragging=false;
    const r=btn.getBoundingClientRect();
    localStorage.setItem("settings-btn-pos", JSON.stringify({l:r.left, t:r.top}));
    // treat as click only if not dragged
    if(!moved){
      const sheet=$("sheet");
      sheet && sheet.setAttribute("aria-hidden","false");
      syncControlValuesIfOpen();
    }
  }, {passive:true});
}

/* ===== Back-compat shim for old #fab markup ===== */
function setupFabShim(){
  const fab = document.getElementById("fab");
  if (!fab) return;
  const sheet = document.getElementById("sheet");
  const closeBtn = document.getElementById("closeSheet");
  fab.addEventListener("click", ()=>{
    sheet.setAttribute("aria-hidden","false");
    syncControlValuesIfOpen();
  });
  closeBtn && closeBtn.addEventListener("click", ()=>{
    sheet.setAttribute("aria-hidden","true");
  });
}

/* ===== hotkeys ===== */
function setupHotkeys(){
  document.addEventListener("keydown", (e)=>{
    const tag=(e.target && e.target.tagName)||"";
    const editable = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable);

    if(!editable && (e.key==='+' || e.key==='=')){
      e.preventDefault();
      const rect=previewHost.getBoundingClientRect();
      zoomAtPoint(1.1, rect.width/2, rect.height/2);
      return;
    }
    if(!editable && (e.key==='-' || e.key==='_')){
      e.preventDefault();
      const rect=previewHost.getBoundingClientRect();
      zoomAtPoint(1/1.1, rect.width/2, rect.height/2);
      return;
    }

    if(editable) return;
    if(e.key==='o' || e.key==='O'){
      e.preventDefault();
      const sheet=$("sheet");
      sheet.setAttribute("aria-hidden", sheet.getAttribute("aria-hidden")==="true" ? "false" : "true");
      if(sheet.getAttribute("aria-hidden")==="false") syncControlValuesIfOpen();
    }
    if(e.key==='Escape'){
      const sheet=$("sheet"); sheet.setAttribute("aria-hidden","true");
    }
  });
}

/* ===== boot ===== */
if(document.readyState!=="loading") init(); else document.addEventListener("DOMContentLoaded", init);
