'use client';
import {businessTypes} from '@/lib/model';
export function BusinessBadges({profile}:{profile?:{types:string[];main:string}}){
 if(!profile?.types?.length)return null;
 return <span className="business-badges">{profile.types.map(type=><span key={type} className={'business-badge '+(profile.main===type?'is-main':'')}>{profile.main===type?'主力 · ':''}{type}</span>)}</span>;
}
export function BusinessEditor({value,onChange}:{value?:{types:string[];main:string};onChange:(v:{types:string[];main:string})=>void}){
 const profile=value||{types:[],main:''};
 function toggle(type:string){const types=profile.types.includes(type)?profile.types.filter(t=>t!==type):[...profile.types,type];onChange({types,main:types.includes(profile.main)?profile.main:types[0]||''})}
 return <fieldset className="business-editor"><legend>事業形態（複数選択可）</legend><div className="business-options">{businessTypes.map(type=><label key={type}><input type="checkbox" checked={profile.types.includes(type)} onChange={()=>toggle(type)}/>{type}</label>)}</div><label className="field">主な事業形態<select aria-label="主な事業形態" value={profile.main} onChange={e=>onChange({...profile,main:e.target.value})}><option value="">未設定</option>{profile.types.map(type=><option key={type}>{type}</option>)}</select></label><small>選択した形態のうち、主力の1つを色と「主力」の表示で区別します。</small><BusinessBadges profile={profile}/></fieldset>;
}
