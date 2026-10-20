import type {RecordItem} from './model';
export function interestScore(data:RecordItem['data']):number|null{
 return typeof data.interestScore==='number'&&Number.isInteger(data.interestScore)&&data.interestScore>=0&&data.interestScore<=100?data.interestScore:null;
}
export function sortByInterest(companies:RecordItem[]){
 return sortCompanies(companies,'score');
}

export function sortCompanies(companies:RecordItem[],order='score'){
 return [...companies].sort((a,b)=>{
  const closed=Number(a.data.status==='見送り・辞退')-Number(b.data.status==='見送り・辞退');if(closed)return closed;
  const primary=order==='name'?a.data.name.localeCompare(b.data.name,'ja'):order==='priority'?['高','中','低'].indexOf(a.data.priority)-['高','中','低'].indexOf(b.data.priority):(interestScore(b.data)??-1)-(interestScore(a.data)??-1);
  return primary||a.data.name.localeCompare(b.data.name,'ja')||a.id.localeCompare(b.id);
 });
}
export function visibleCompanies(companies:RecordItem[],showClosed=false){return companies.filter(c=>showClosed||c.data.status!=='見送り・辞退')}
