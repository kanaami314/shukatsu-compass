import {Star} from 'lucide-react';
export default function CompanyPriority({data}:{data:{priority:string;assessment?:string}}){
 const stage=data.assessment||'未設定';
 return <span className={'company-priority assessment-'+stage}><span className={'priority priority-'+data.priority}><Star size={14}/>{data.priority}</span><span className="assessment-badge">{stage==='説明会前'?'説明会前 · 仮評価':stage==='説明会後'?'説明会後 · 評価済み':'判断の段階：未設定'}</span></span>
}
