import { monthsByLang } from './js/state.js';
import { buildMonthSVG } from './js/build.js';
import { state } from './js/state.js';
window.monthsByLang = monthsByLang;
window.buildMonthForExport = (y,m)=>buildMonthSVG(y,m,{exportMode:true}).outerHTML;
