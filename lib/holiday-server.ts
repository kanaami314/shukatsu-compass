import bundled from './holiday-dates.json';
import {parseHolidayCsv,setHolidayCalendar} from './holidays';
let cached=bundled,checked=0;
export async function loadHolidayCalendar(){
 if(Date.now()-checked>86400000){try{const r=await fetch(bundled.source,{signal:AbortSignal.timeout(8000)});if(r.ok){const parsed=parseHolidayCsv(new TextDecoder('shift_jis').decode(await r.arrayBuffer()));if(parsed.through>=cached.through)cached=parsed;checked=Date.now()}}catch{checked=Date.now()-86400000+3600000}}
 setHolidayCalendar(cached);return cached;
}
