'use client';
import {useEffect,useRef,useState} from 'react';
import './widget.css';
type State={owner:string;revision:number;enabled:boolean;updatedAt:string|null};
export default function WidgetPanel({owner}:{owner:string}){
 const [state,setState]=useState<State|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[token,setToken]=useState(''),[script,setScript]=useState('');
 const lock=useRef(false);
 async function load(){setBusy(true);setError('');try{const r=await fetch('/api/widget/settings',{cache:'no-store'}),b:any=await r.json();if(!r.ok||b.owner!==owner)throw Error(b.error||'ログイン先を確認してください。');setState({owner:b.owner,revision:b.revision,enabled:b.enabled,updatedAt:b.updatedAt})}catch(e){setError(e instanceof Error?e.message:'読み込めませんでした。');setState(null)}finally{setBusy(false)}}
 useEffect(()=>{setToken('');void load();fetch('/scriptable/compass.js').then(r=>{if(!r.ok)throw Error();return r.text()}).then(t=>{if(t.includes('const ENDPOINT ='))setScript(t)}).catch(()=>{})},[owner]);
 async function change(action:'rotate'|'disable'){
  if(!state||lock.current)return;
  if(state.enabled&&!window.confirm(action==='rotate'?'現在のキーは使えなくなります。新しいキーを発行しますか？':'ウィジェットへのデータ提供を停止しますか？'))return;
  lock.current=true;setBusy(true);setToken('');setError('');setMessage('');
  try{const r=await fetch('/api/widget/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner,revision:state.revision,action})}),b:any=await r.json();if(!r.ok||b.owner!==owner)throw Error(b.error||'保存を確認できませんでした。');setState({owner:b.owner,revision:b.revision,enabled:b.enabled,updatedAt:b.updatedAt});setToken(b.token||'');setMessage(action==='rotate'?'キーを発行しました。下のキーをScriptableへ貼り付けてください。':'接続を停止しました。端末に残った表示は、次回通信時に切り替わります。')}
  catch(e){setError(e instanceof Error?e.message:'保存を確認できませんでした。');setState(null)}finally{setBusy(false);lock.current=false}
 }
 async function copy(value:string,label:string){try{await navigator.clipboard.writeText(value);setMessage(label+'をコピーしました。')}catch{setError('コピーできませんでした。下の内容を長押しして選択・コピーしてください。')}}
 return <section className="panel widget-panel"><div className="panel-heading"><div><h2>次の予定を、ホーム画面に</h2><p>Scriptableと接続して、アプリを開かずに予定と期限を確認。</p></div><span className={'ai-state '+(state?.enabled?'enabled':'')}>{state?(state.enabled?'接続可能':'停止中'):'確認中'}</span></div>
 <div className="widget-body">
 <div className="widget-preview" aria-label="ウィジェットの表示例"><strong>就活コンパス <small>表示イメージ</small></strong><div><section><span>これからの予定</span><small>(仮) 10/26 14:00</small><b>一次面接</b><small>10/27 終日</small><b>予定あり</b></section><section><span>期限・やること</span><small>10/26 18:00</small><b>履歴書の提出</b><small>10/28</small><b>SPIの受験</b></section></div><small>更新 10/23 09:00</small></div>
 <p>今後7日間の予定と、7日以内に期限を迎える未完了タスク（期限超過を含む）を、それぞれ近い順に最大6件取得します。小サイズは各1件、中は各2件、大は各4件を表示します。</p>
 <p className="muted">学校・アルバイトの固定予定は表示しません。予定名・日時・仮/確定、タスク名・期限、関連する企業名またはエージェント名のみを読み取ります。ノート本文・メモ・連絡先・下書きは渡しません。</p>
 {error&&<p className="error" role="alert">{error}</p>}{message&&<p className="notice" role="status">{message}</p>}
 <div className="button-row"><button className="secondary" onClick={()=>void load()} disabled={busy}>最新の状態を確認</button>{state?.enabled&&<button className="secondary" onClick={()=>void change('disable')} disabled={busy}>接続を停止</button>}</div>
 <h3>1. iPhoneのScriptableにコードを追加</h3>
 <p>iPhoneでこの画面を開いてください。Scriptableの「＋」で新しいスクリプトを作り、コードを貼り付け、名前を「就活コンパス」にします。</p>
 <button className="primary" disabled={!script} onClick={()=>void copy(script,'コード')}>Scriptable用コードをコピー</button>
 <details><summary>手動でコピーする場合</summary><textarea aria-label="Scriptable用コード" readOnly value={script||'コードを読み込めませんでした。ページを再読み込みしてください。'} onFocus={e=>e.target.select()}/></details>
 <h3>2. 接続キーを発行して貼り付け</h3>
 <p>下のボタンでキーを発行します。Scriptableで「就活コンパス」を実行し、入力欄に貼り付けてください。キーは発行直後だけ表示します。</p>
 <button className="primary" disabled={busy||!state} onClick={()=>void change('rotate')}>{state?.enabled?'キーを再発行':'接続キーを発行'}</button>
 {token&&<div className="widget-token"><label>接続キー（他の人には渡さないでください）<input type="password" readOnly value={token} onFocus={e=>e.target.select()} autoComplete="off" spellCheck={false}/></label><button className="secondary" onClick={()=>void copy(token,'接続キー')}>接続キーをコピー</button><button className="secondary" onClick={()=>setToken('')}>この画面からキーを消す</button></div>}
 <h3>3. ホーム画面に配置</h3>
 <p>iPhoneのホーム画面を長押し → 編集／ウィジェットを追加 → Scriptable → 中サイズを追加。追加したウィジェットを長押しして編集し、「Script」で「就活コンパス」を選びます。「When Interacting」が表示されたら「Open URL」を選び、下のアプリURLを設定してください。</p>
 <input aria-label="タップしたときに開くアプリURL" readOnly value="https://shukatsu-compass-yamas.polite-spool-1598.chatgpt.site/?view=event" onFocus={e=>e.target.select()}/>
 <p>表示後はパソコンを起動しておく必要はありません。タップするとアプリが開きます。未ログインの場合はChatGPTへのログインが必要です。</p>
 <h3>更新について</h3><p>15分後以降の更新をiOSへ依頼しますが、実際の更新間隔はiOSが決めます。即時反映ではありません。通信できない場合は、24時間以内に取得した情報を「未更新」と明示して表示します。必ず最終更新時刻も確認してください。</p>
 <p className="muted">接続を停止しても、ホーム画面に表示済みの内容を遠隔で直ちに消すことはできません。端末からも消す場合はScriptableでスクリプトを実行し「この端末のキーと一時データを削除」を選び、ウィジェットを取り除いてください。</p>
 </div></section>;
}
