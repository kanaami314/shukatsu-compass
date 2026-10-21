import type {RecordItem} from './model';
export const eventTitle=(data:any)=>(data.planning?.status==='tentative'?'(仮) ':'')+data.title;
export const sameEventRelation=(a:any,b:any)=>(a.companyId||'')===(b.companyId||'')&&(a.agentId||'')===(b.agentId||'');
export function candidatePeers(records:RecordItem[],data:any,id?:string){
 const group=data.planning?.groupId||'';
 return (group||data.companyId||data.agentId)?records.filter(r=>r.kind==='event'&&r.id!==id&&sameEventRelation(r.data,data)&&(r.data.planning?.groupId||'')===group&&r.data.planning?.status==='tentative'):[];
}
