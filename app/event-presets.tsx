'use client';
import {useState} from 'react';
const presets=['説明会','一次選考','二次選考','最終選考','一次面接','二次面接','最終面接','適性検査・SPI','カジュアル面談','エージェント面談','内定者面談'];
export default function EventPresets({title,onSelect}:{title:string;onSelect:(title:string)=>void}){
 const [pending,setPending]=useState('');
 function choose(next:string){if(title.trim()&&title!==next){setPending(next);return}onSelect(next);setPending('')}
 return <div className="event-presets"><p>よくある予定から入力</p><div>{presets.map(p=><button type="button" className={'secondary '+(title===p?'selected':'')} key={p} onClick={()=>choose(p)}>{p}</button>)}</div>{pending&&<div className="notice" role="status"><p>入力中の予定名を「{pending}」に置き換えますか？ 日時やメモは変更しません。</p><div className="button-row"><button type="button" className="secondary" onClick={()=>{onSelect(pending);setPending('')}}>予定名を置き換える</button><button type="button" className="text-btn" onClick={()=>setPending('')}>キャンセル</button></div></div>}<small>選択後も予定名は自由に編集できます。</small></div>;
}
