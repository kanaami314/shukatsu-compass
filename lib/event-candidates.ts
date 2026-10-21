import type {RecordItem} from './model';
export const eventTitle=(data:any)=>(data.planning?.status==='tentative'?'(仮) ':'')+data.title;
export function candidatePeers(records:RecordItem[],data:any,id?:string){
 const group=data.planning?.groupId;
 return group?records.filter(r=>r.kind==='event'&&r.id!==id&&r.data.planning?.groupId===group&&r.data.planning?.status==='tentative'):[];
}
