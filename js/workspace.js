import { state, PX_PER_MM, mm, $, clamp } from './state.js';
import { buildMonthSVG } from './build.js';
import { drawRulers } from './rulers.js';

let previewHost, stage, hud;
let blockManipulating=false;

export function initWorkspace(){
  previewHost=$("preview"); hud=$("hud");
  stage=document.createElement("div"); stage.id="stage"; previewHost.appendChild(stage);
  wirePanZoom();
  window.addEventListener("resize", ()=>{ if(!state.view.userMoved) centerView(); drawRulers(); });
}

export function render(){
  stage.innerHTML="";
  const svg=buildMonthSVG(state.year,state.month,{exportMode:false});
  svg.style.maxWidth="100%"; svg.style.height="auto";
  stage.appendChild(svg);

  if(state.showGuides){
    const svgns="http://www.w3.org/2000/svg";
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
      const fat=document.createElementNS(svgns,"rect");
      const pad=mm(6);
      fat.setAttribute("x",x-pad); fat.setAttribute("y",y-pad);
      fat.setAttribute("width",pad*2); fat.setAttribute("height",pad*2);
      fat.setAttribute("fill","rgba(0,0,0,0)");
      fat.dataset.role=name; fat.style.cursor=h.style.cursor;
      ov.appendChild(fat);
    });

    svg.appendChild(ov);
    wireDrag(svg,ov);
  }

  applyView();
}

export function applyView(){
  const {scale,tx,ty}=state.view;
  stage.style.transform=`translate(${tx}px, ${ty}px) scale(${scale})`;
}
export function centerView(){
  const svg = stage.querySelector("svg"); if(!svg) return;
  const rect=svg.getBoundingClientRect();
  const host=previewHost.getBoundingClientRect();
  const sc=state.view.scale;
  state.view.tx = (host.width  - rect.width * sc)/2;
  state.view.ty = (host.height - rect.height* sc)/2;
  applyView();
}

function screenToWorld(sx, sy){
  const sc=state.view.scale;
  return { x:(sx - state.view.tx)/sc, y:(sy - state.view.ty)/sc };
}
export function zoomAtPoint(factor, cx, cy){
  const before = screenToWorld(cx, cy);
  state.view.scale = clamp(state.view.scale * factor, state.view.min, state.view.max);
  const after = screenToWorld(cx, cy);
  state.view.tx += (before.x - after.x) * state.view.scale;
  state.view.ty += (before.y - after.y) * state.view.scale;
  applyView(); drawRulers();
}

function wirePanZoom(){
  let isPanning=false, panStart=null;

  previewHost.addEventListener("wheel",(e)=>{
    if(e.ctrlKey) return;
    e.preventDefault();
    state.view.userMoved=true;
    const rect=previewHost.getBoundingClientRect();
    const cx=e.clientX-rect.left, cy=e.clientY-rect.top;
    zoomAtPoint(e.deltaY < 0 ? 1.1 : 1/1.1, cx, cy);
  }, {passive:false});

  previewHost.addEventListener("pointerdown",(e)=>{
    if(blockManipulating) return;
    if(e.target.closest('svg [data-role]')) return;
    isPanning=true; state.view.userMoved=true;
    panStart={x:e.clientX, y:e.clientY, tx:state.view.tx, ty:state.view.ty};
    previewHost.setPointerCapture && previewHost.setPointerCapture(e.pointerId);
  });
  previewHost.addEventListener("pointermove",(e)=>{
    if(!isPanning) return;
    const dx=e.clientX - panStart.x, dy=e.clientY - panStart.y;
    state.view.tx = panStart.tx + dx;
    state.view.ty = panStart.ty + dy;
    applyView(); drawRulers();
  });
  const endPan=()=>{ isPanning=false; };
  previewHost.addEventListener("pointerup", endPan, {passive:true});
  previewHost.addEventListener("pointercancel", endPan, {passive:true});

  // touch pan & pinch — guarded by blockManipulating
  let touches=new Map();
  previewHost.addEventListener("touchmove",(e)=>{
    if(blockManipulating) return;
    if(e.touches.length===1){
      const t=e.touches[0];
      const prev=touches.get(t.identifier)||{x:t.clientX,y:t.clientY};
      state.view.tx += (t.clientX - prev.x);
      state.view.ty += (t.clientY - prev.y);
      touches.set(t.identifier,{x:t.clientX,y:t.clientY});
      state.view.userMoved=true;
      applyView(); drawRulers();
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
      touches.set(a.identifier, {x:a.clientX,y:a.clientY});
      touches.set(b.identifier, {x:b.clientX,y:b.clientY});
      state.view.userMoved=true;
    }
  }, {passive:false});
  previewHost.addEventListener("touchend",(e)=>{ for(const t of e.changedTouches) touches.delete(t.identifier); }, {passive:true});
}

function wireDrag(svg,ov){
  let active=null;
  const onDown=e=>{
    const role=(e.target&&e.target.dataset)?e.target.dataset.role:null; if(!role)return;
    e.preventDefault();
    blockManipulating = true; // prevent canvas pan during move/resize
    if(e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    active={role,mx:e.clientX,my:e.clientY,start:{x:state.calX,y:state.calY,w:state.calW,h:state.calH}};
    hud.style.display="block";
  };
  const onMove=e=>{
    if(!active)return;
    const dxmm=(e.clientX-active.mx)/PX_PER_MM, dymm=(e.clientY-active.my)/PX_PER_MM;
    let {x,y,w,h}=active.start; const minW=10,minH=10;
    if(active.role==="move"){x+=dxmm;y+=dymm}
    else if(active.role==="e"){w=Math.max(minW, w+dxmm)}
    else if(active.role==="w"){x+=dxmm;w=Math.max(minW, w-dxmm)}
    else if(active.role==="s"){h=Math.max(minH, h+dymm)}
    else if(active.role==="n"){y+=dymm;h=Math.max(minH, h-dymm)}
    else if(active.role==="se"){w=Math.max(minW, w+dxmm);h=Math.max(minH, h+dymm)}
    else if(active.role==="ne"){w=Math.max(minW, w+dxmm);y+=dymm;h=Math.max(minH, h-dymm)}
    else if(active.role==="sw"){x+=dxmm;w=Math.max(minW, w-dxmm);h=Math.max(minH, h+dymm)}
    else if(active.role==="nw"){x+=dxmm;y+=dymm;w=Math.max(minW, w-dxmm);h=Math.max(minH, h-dymm)}
    x=Math.max(0, Math.min(x, state.pageW-w)); y=Math.max(0, Math.min(y, state.pageH-h));
    state.calX=Math.round(x*10)/10; state.calY=Math.round(y*10)/10; state.calW=Math.round(w*10)/10; state.calH=Math.round(h*10)/10;
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
  };
  const end=()=>{active=null; hud.style.display="none"; blockManipulating=false; render();};
  ov.addEventListener("pointerdown",onDown, {passive:false});
  svg.addEventListener("pointermove",onMove, {passive:false});
  svg.addEventListener("pointerup",end, {passive:true});
  svg.addEventListener("pointercancel",end, {passive:true});
}
