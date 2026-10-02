// Calendar-month retention in Japan time. Invalid timestamps are retained for safety.
export function expiresAt(value:string){
 const instant=Date.parse(value);if(!Number.isFinite(instant))return NaN;
 const local=new Date(instant+9*3600000),day=local.getUTCDate();
 local.setUTCDate(1);local.setUTCMonth(local.getUTCMonth()+1);
 const last=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth()+1,0)).getUTCDate();local.setUTCDate(Math.min(day,last));
 return local.getTime()-9*3600000;
}
export function isExpired(value:string,now=Date.now()){return expiresAt(value)<=now}
// Equivalent SQLite expression; column names are fixed by the application, never user input.
export function expirationSql(column:string){
 const local=`datetime(${column}, '+9 hours')`;
 return `julianday(strftime('%Y-%m-', ${local}, 'start of month', '+1 month') || printf('%02d', min(CAST(strftime('%d', ${local}) AS INTEGER), CAST(strftime('%d', ${local}, 'start of month', '+2 months', '-1 day') AS INTEGER))) || 'T' || strftime('%H:%M:%f', ${local}), '-9 hours')`;
}
