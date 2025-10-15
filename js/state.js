// Shared state & helpers
export const PX_PER_MM = 96/25.4;
export const mm = v => v*PX_PER_MM;
export const ptToPx = pt => pt*(96/72);
export const clamp = (x,a,b)=>Math.min(b,Math.max(a,x));
export const r1 = v=>Math.round(v*10)/10;
export const $ = id=>document.getElementById(id);

function isLeap(y){return(y%4===0&&y%100!==0)||(y%400===0)}
export function daysInMonth(y,m){return[31,isLeap(y)?29:28,31,30,31,30,31,31,30,31,30,31][m]}
export function firstWeekday(y,m,f){const d=new Date(y,m,1).getDay();return(d-f+7)%7}

const MONTH_EN=["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_CZ=["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];
const MONTH_JA=["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const WD_EN_S=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], WD_EN_F=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const WD_CZ_S=["Ne","Po","Út","St","Čt","Pá","So"],       WD_CZ_F=["Neděle","Pondělí","Úterý","Středa","Čtvrtek","Pátek","Sobota"];
const WD_JA_S=["日","月","火","水","木","金","土"],         WD_JA_F=["日曜日","月曜日","火曜日","水曜日","木曜日","金曜日","土曜日"];

export function monthsByLang(lang){return lang==="ENG"?MONTH_EN:lang==="CZE"?MONTH_CZ:MONTH_JA}
export function weekdaysByLang(lang,full){return (lang==="ENG"?(full?WD_EN_F:WD_EN_S):lang==="CZE"?(full?WD_CZ_F:WD_CZ_S):(full?WD_JA_F:WD_JA_S)).slice()}

export const state={
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
  view:{scale:1, tx:12, ty:12, min:0.3, max:4, userMoved:false},
  rulersOn:false,

  // Holidays
  holidayEnabled:false,
  holidayRegion:"ANY",       // region-agnostic by default
  holidayFont:"Inter, Arial",
  holidaySizePt:7,
  holidayColor:"#c82020",
  holidayOffX:1.5,
  holidayOffY:-1.5,
  holidays:{} // { "REGION": { "YYYY-MM-DD": ["Name"] }, "__ALL__": {...} }
};
