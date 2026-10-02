import {serviceOwner} from '@/lib/service-auth';
import {cleanupExpired} from '@/lib/retention';
export async function POST(req:Request){
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Forbidden'},{status:403});
 const owner=await serviceOwner(req);if(!owner)return Response.json({error:'Unauthorized'},{status:401});
 try{return Response.json(await cleanupExpired(owner),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Cleanup failed'},{status:503})}
}
