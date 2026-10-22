const SITE='https://shukatsu-compass-yamas.polite-spool-1598.chatgpt.site';
const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'};
const error=(status:number,code:string)=>Response.json({error:code},{status,headers});
export default {
 async fetch(req:Request,env:{SITES_SERVICE_TOKEN:string},_ctx?:unknown):Promise<Response>{
  const url=new URL(req.url);
  if(url.pathname!=='/v1/widget'||url.search)return error(404,'NOT_FOUND');
  if(req.method!=='GET')return error(405,'METHOD_NOT_ALLOWED');
  const authorization=req.headers.get('Authorization')||'';
  if(!/^Bearer cw1_[a-f0-9]{64}$/.test(authorization))return error(401,'WIDGET_UNAUTHORIZED');
  if(!env.SITES_SERVICE_TOKEN)return error(503,'WIDGET_UNAVAILABLE');
  try{
   // Fixed destination and freshly constructed headers: never a general-purpose proxy.
   const upstream=await fetch(SITE+'/api/widget/feed',{method:'GET',headers:{'OAI-Sites-Authorization':'Bearer '+env.SITES_SERVICE_TOKEN,'X-Compass-Widget':authorization.slice(7)},redirect:'manual',signal:AbortSignal.timeout(12000)});
   if(upstream.status===401)return error(401,'WIDGET_UNAUTHORIZED');
   if(!upstream.ok||!upstream.headers.get('content-type')?.includes('application/json'))return error(503,'WIDGET_UNAVAILABLE');
   const body:any=await upstream.json();
   if(body.version!==1||typeof body.generatedAt!=='string'||!Array.isArray(body.events)||!Array.isArray(body.tasks))return error(503,'WIDGET_UNAVAILABLE');
   // Defense in depth: even if the upstream changes, don't forward extra fields.
   const events=body.events.slice(0,6).map((e:any)=>({title:e.title,start:e.start,end:e.end,allDay:!!e.allDay,tentative:!!e.tentative,relatedName:e.relatedName}));
   const tasks=body.tasks.slice(0,6).map((t:any)=>({title:t.title,dueDate:t.dueDate,dueTime:t.dueTime,overdue:!!t.overdue,relatedName:t.relatedName}));
   return Response.json({version:1,generatedAt:body.generatedAt,events,tasks},{headers});
  }catch{return error(503,'WIDGET_UNAVAILABLE')}
 }
};
