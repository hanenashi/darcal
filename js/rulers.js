import { state, $, PX_PER_MM } from './state.js';

let previewHost, rulerTop, rulerLeft;

export function initRulers(){
  previewHost=$("preview"); rulerTop=$("rulerTop"); rulerLeft=$("rulerLeft");
}

export function drawRulers(){
  const on = state.rulersOn;
  const corner = $("rulerCorner");
  rulerTop.style.display = on ? "block" : "none";
  rulerLeft.style.display = on ? "block" : "none";
  corner.style.display = on ? "block" : "none";
  if(!on) return;

  const W = previewHost.clientWidth;
  const H = previewHost.clientHeight;
  const topH = 28, leftW = 28;

  rulerTop.width=W-leftW; rulerTop.height=topH;
  rulerLeft.width=leftW; rulerLeft.height=H-topH;
  rulerTop.style.left=leftW+"px"; rulerTop.style.top="0px";
  rulerLeft.style.left="0px"; rulerLeft.style.top=topH+"px";

  const ctxT = rulerTop.getContext("2d");
  const ctxL = rulerLeft.getContext("2d");
  const bg="#0a0c10", line="#343a46", tick="#6b7385", tickMajor="#c7ccda", text="#dfe3ee";

  ctxT.fillStyle = bg; ctxT.fillRect(0,0,rulerTop.width,topH);
  ctxL.fillStyle = bg; ctxL.fillRect(0,0,leftW,H-topH);

  const sc = state.view.scale;
  const tx = state.view.tx, ty = state.view.ty;
  const pxPerMm = sc * PX_PER_MM;

  ctxT.strokeStyle=line; ctxT.beginPath();
  ctxT.moveTo(0,topH-0.5); ctxT.lineTo(rulerTop.width,topH-0.5); ctxT.stroke();

  if(pxPerMm>0){
    const worldLeft = (0 - (tx - leftW))/sc;
    const worldRight = (rulerTop.width - (tx - leftW))/sc;
    let mmStart = Math.floor(worldLeft / PX_PER_MM);
    const mmEnd = Math.ceil(worldRight / PX_PER_MM);

    const minor = Math.max(6, Math.min(10, Math.round(pxPerMm*0.5)));
    for(let mm=mmStart; mm<=mmEnd; mm++){
      const xScreen = (mm*PX_PER_MM*sc) + (tx - leftW);
      const isMajor = (mm % 10 === 0);
      const len = isMajor ? 18 : minor;
      (isMajor? (ctxT.strokeStyle=tickMajor) : (ctxT.strokeStyle=tick));
      ctxT.beginPath();
      ctxT.moveTo(Math.round(xScreen)+0.5, topH);
      ctxT.lineTo(Math.round(xScreen)+0.5, topH - len);
      ctxT.stroke();

      if(isMajor){
        ctxT.fillStyle=text; ctxT.font="10px system-ui, Arial";
        ctxT.textAlign="center"; ctxT.textBaseline="top";
        ctxT.fillText(String(mm), Math.round(xScreen), 2);
      }
    }
  }

  ctxL.strokeStyle=line; ctxL.beginPath();
  ctxL.moveTo(leftW-0.5,0); ctxL.lineTo(leftW-0.5,H-topH); ctxL.stroke();

  if(pxPerMm>0){
    const worldTop = (0 - (ty - topH))/sc;
    const worldBot = ((H-topH) - (ty - topH))/sc;
    let mmStartY = Math.floor(worldTop / PX_PER_MM);
    const mmEndY = Math.ceil(worldBot / PX_PER_MM);

    const minor = Math.max(6, Math.min(10, Math.round(pxPerMm*0.5)));
    for(let mm=mmStartY; mm<=mmEndY; mm++){
      const yScreen = (mm*PX_PER_MM*sc) + (ty - topH);
      const isMajor = (mm % 10 === 0);
      const len = isMajor ? 18 : minor;
      (isMajor? (ctxL.strokeStyle=tickMajor) : (ctxL.strokeStyle=tick));
      ctxL.beginPath();
      ctxL.moveTo(leftW, Math.round(yScreen)+0.5);
      ctxL.lineTo(leftW - len, Math.round(yScreen)+0.5);
      ctxL.stroke();

      if(isMajor){
        ctxL.save();
        ctxL.translate(2, Math.round(yScreen)+2);
        ctxL.rotate(-Math.PI/2);
        ctxL.fillStyle=text; ctxL.font="10px system-ui, Arial";
        ctxL.textAlign="center"; ctxL.textBaseline="top";
        ctxL.fillText(String(mm), 0, 0);
        ctxL.restore();
      }
    }
  }
}
