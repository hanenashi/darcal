import { state, mm, ptToPx, monthsByLang, weekdaysByLang, daysInMonth, firstWeekday } from './state.js';

export function weekdayRow(){
  const base=weekdaysByLang(state.lang,state.fullNames);
  if(state.firstDay===0) return base;
  const copy=base.slice(); copy.push(copy.shift()); return copy;
}

export function buildMonthSVG(y,mIdx,{exportMode=false}={}){
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

  if(state.tableLines){
    const strokeW = ptToPx(state.tableStrokePt || state.cellStrokePt);
    if(state.hideEmpty && !state.showAdj){
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
        dn.setAttribute("fill",adj?`rgba(0,0,0,${Math.min(0.9,Math.max(0.1,state.adjAlpha/100))})`:"#000");
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

  // Guidelines front (magenta), tied to rulers toggle
  if(state.rulersOn && !exportMode){
    const gGuide=document.createElementNS(svgns,"g");
    gGuide.setAttribute("stroke", "#ff2bbf");
    gGuide.setAttribute("stroke-width", 1);
    [[mm(state.pageW)/2, 0, mm(state.pageW)/2, mm(state.pageH)],
     [0, mm(state.pageH)/2, mm(state.pageW), mm(state.pageH)/2]]
     .forEach(([x1,y1,x2,y2])=>{
       const ln=document.createElementNS(svgns,"line");
       ln.setAttribute("x1",x1); ln.setAttribute("y1",y1); ln.setAttribute("x2",x2); ln.setAttribute("y2",y2);
       gGuide.appendChild(ln);
     });
    const thirds=[[mm(state.pageW)/3,0,mm(state.pageW)/3,mm(state.pageH)],
                  [2*mm(state.pageW)/3,0,2*mm(state.pageW)/3,mm(state.pageH)],
                  [0,mm(state.pageH)/3,mm(state.pageW),mm(state.pageH)/3],
                  [0,2*mm(state.pageH)/3,mm(state.pageW),2*mm(state.pageH)/3]];
    thirds.forEach(([x1,y1,x2,y2])=>{
      const ln=document.createElementNS(svgns,"line");
      ln.setAttribute("x1",x1); ln.setAttribute("y1",y1); ln.setAttribute("x2",x2); ln.setAttribute("y2",y2);
      ln.setAttribute("stroke-dasharray","6 6");
      gGuide.appendChild(ln);
    });
    svg.appendChild(gGuide);
  }
  return svg;
}
