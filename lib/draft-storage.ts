import type {Kind} from './model';
export type Draft={draftId:string;createId:string;id?:string;kind:Kind;data:any;revision?:number;restore?:boolean;seq:number;updatedAt:string;sourceDraft?:string};
export const draftPrefix=(owner:string)=>'compass:draft:v1:'+encodeURIComponent(owner)+':';
export function writeLocalDraft(storage:Storage,owner:string,draft:Draft){
 const key=draftPrefix(owner)+draft.draftId,value=JSON.stringify(draft);
 storage.setItem(key,value);
 if(storage.getItem(key)!==value)throw new Error('下書きを端末に保存できませんでした。');
}
export function readLocalDrafts(storage:Storage,owner:string){
 const drafts:Draft[]=[];const prefix=draftPrefix(owner);
 for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!key?.startsWith(prefix))continue;const value=JSON.parse(storage.getItem(key)||'null');if(value&&typeof value.draftId==='string'&&value.data&&Number.isInteger(value.seq))drafts.push(value);}
 return drafts;
}
export function mergeDrafts(local:Draft[],remote:Draft[]){const byId=new Map<string,Draft>();for(const d of [...remote,...local]){const old=byId.get(d.draftId);if(!old||d.seq>old.seq)byId.set(d.draftId,d);}return [...byId.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
export function downloadSafetyCopy(value:unknown,name='就活コンパス-バックアップ'){
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name+'-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
