import {env} from 'cloudflare:workers';
export async function serviceOwner(req:Request):Promise<string|null>{
 const expected=env.COMPASS_SERVICE_TOKEN,provided=req.headers.get('X-Compass-Service');
 if(!expected||!provided||!env.COMPASS_BACKUP_OWNER)return null;
 const digest=async(v:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));
 const [a,b]=await Promise.all([digest(expected),digest(provided)]);let different=0;for(let i=0;i<a.length;i++)different|=a[i]^b[i];
 return different?null:env.COMPASS_BACKUP_OWNER;
}
