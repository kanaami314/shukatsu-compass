import type {RecordItem} from './model';
export function interestScore(data:RecordItem['data']):number|null{
 return typeof data.interestScore==='number'&&Number.isInteger(data.interestScore)&&data.interestScore>=0&&data.interestScore<=100?data.interestScore:null;
}
export function sortByInterest(companies:RecordItem[]){
 return [...companies].sort((a,b)=>((interestScore(b.data)??-1)-(interestScore(a.data)??-1))||a.data.name.localeCompare(b.data.name,'ja')||a.id.localeCompare(b.id));
}
