// 就活コンパス — Scriptable用。鍵はコードに書かず、初回実行時に入力します。
// ホーム画面の小・中・大サイズに対応。日時は日本時間です。
const ENDPOINT = 'https://shukatsu-compass-widget.314159265yy3y.workers.dev/v1/widget';
const APP = 'https://shukatsu-compass-yamas.polite-spool-1598.chatgpt.site';
const KEY = 'shukatsu-compass-widget-v1';
const fm = FileManager.local();
const cachePath = fm.joinPath(fm.cacheDirectory(), KEY + '.json');
function clearCache() { if (fm.fileExists(cachePath)) fm.remove(cachePath); }
function validFeed(b) { return b && b.version === 1 && Number.isFinite(Date.parse(b.generatedAt)) && Array.isArray(b.events) && Array.isArray(b.tasks); }
function cached() {
  try {
    const b = JSON.parse(fm.readString(cachePath));
    const age = Date.now() - Date.parse(b.generatedAt);
    return validFeed(b) && age >= 0 && age < 24 * 3600000 ? b : null;
  } catch (_) { return null; }
}
async function configure() {
  const a = new Alert();
  a.title = '就活コンパスに接続';
  a.message = 'アプリの「iPhoneウィジェット」で発行した接続キーを貼り付けてください。';
  a.addSecureTextField('cw1_から始まる接続キー', '');
  a.addAction('保存'); a.addCancelAction('キャンセル');
  if (await a.presentAlert() < 0) return false;
  const token = a.textFieldValue(0).trim();
  if (!/^cw1_[a-f0-9]{64}$/.test(token)) {
    const e = new Alert(); e.title = 'キーを確認してください'; e.message = '接続キーを省略せずに貼り付けてください。'; e.addAction('閉じる'); await e.presentAlert(); return false;
  }
  clearCache(); Keychain.set(KEY, token); return true;
}
async function loadFeed() {
  if (!Keychain.contains(KEY)) return {message: 'Scriptableで開いて接続キーを設定してください。'};
  const request = new Request(ENDPOINT);
  request.headers = {Authorization: 'Bearer ' + Keychain.get(KEY)};
  request.timeoutInterval = 15;
  request.onRedirect = () => null;
  try {
    const body = await request.loadJSON();
    if (request.response.statusCode === 401) { clearCache(); return {message: '接続が停止されています。アプリでキーを確認してください。'}; }
    if (request.response.statusCode !== 200 || !validFeed(body)) throw new Error('unavailable');
    try { fm.writeString(cachePath, JSON.stringify(body)); } catch (_) {}
    return {feed: body, stale: false};
  } catch (_) {
    if (request.response && request.response.statusCode === 401) { clearCache(); return {message: '接続キーを設定し直してください。'}; }
    const b = cached();
    return b ? {feed: b, stale: true} : {message: '更新できませんでした。通信を確認し、タップしてアプリを開いてください。'};
  }
}
function parts(value) {
  const d = new Date(Date.parse(value) + 9 * 3600000);
  return {day: (d.getUTCMonth()+1)+'/'+d.getUTCDate(), time: String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0')};
}
function text(container, value, size, color, bold) {
  const t = container.addText(value); t.font = bold ? Font.semiboldSystemFont(size) : Font.systemFont(size);
  t.textColor = color; t.lineLimit = 1; t.minimumScaleFactor = 0.85; return t;
}
function render(result) {
  const w = new ListWidget();
  w.backgroundColor = Color.dynamic(new Color('#f3f7ff'), new Color('#162238'));
  w.setPadding(12,14,10,14); w.url = APP+'/?view=event';
  w.refreshAfterDate = new Date(Date.now()+15*60000);
  const ink = Color.dynamic(new Color('#19385e'), new Color('#e4edff'));
  const muted = Color.dynamic(new Color('#607795'), new Color('#a2b4cf'));
  const accent = Color.dynamic(new Color('#3e64df'), new Color('#98b0ff'));
  const red = Color.dynamic(new Color('#b44444'), new Color('#ffb1b1'));
  const family = config.widgetFamily || 'medium';
  const small = family === 'small', large = family === 'large';
  const head = w.addStack(); text(head,'就活コンパス',13,ink,true); head.addSpacer();
  if (!small) text(head,parts(new Date().toISOString()).day,11,muted,false);
  w.addSpacer(7);
  if (!result.feed) {
    const t = w.addText(result.message); t.font = Font.systemFont(12); t.textColor = muted; t.lineLimit = 5;
  } else {
    const b = result.feed, events = b.events.filter(e=>Date.parse(e.end)>Date.now());
    const limit = large ? 4 : small ? 1 : 2;
    const row = small ? w : w.addStack();
    function column(title, items, isTask) {
      const c = small ? row : row.addStack(); if (!small) c.layoutVertically();
      text(c,title,10,accent,true); c.addSpacer(4);
      if (!items.length) text(c,'対象なし',11,muted,false);
      for (const item of items.slice(0,limit)) {
        let label;
        if (isTask) {
          const overdue=Date.parse(item.dueDate+'T'+(item.dueTime||'23:59')+':'+(item.dueTime?'00':'59')+'+09:00')<Date.now();
          label=(overdue?'期限超過 · ':'')+item.dueDate.slice(5).replace('-','/')+(item.dueTime?' '+item.dueTime:'');
          text(c,label,10,overdue?red:muted,false);
        } else {
          const p=parts(item.start); label=(item.tentative?'(仮) ':'')+p.day+' '+(item.allDay?'終日':p.time);
          text(c,label,10,muted,false);
        }
        text(c,item.title,12,ink,true);
        if (large && item.relatedName) text(c,item.relatedName,10,muted,false);
        c.addSpacer(5);
      }
    }
    column('これからの予定',events,false);
    if (!small) row.addSpacer(12); else w.addSpacer(2);
    column('期限・やること',b.tasks,true);
    w.addSpacer();
    const p=parts(b.generatedAt);
    text(w,(result.stale?'未更新 · ':'更新 ')+p.day+' '+p.time,9,result.stale?red:muted,false);
  }
  return w;
}
async function main() {
  if (config.runsInApp) {
    if (!Keychain.contains(KEY)) { if (!await configure()) return; }
    else {
      const a = new Alert(); a.title = '就活コンパス'; a.addAction('更新してプレビュー'); a.addAction('接続キーを入れ直す'); a.addDestructiveAction('この端末のキーと一時データを削除'); a.addCancelAction('キャンセル');
      const choice=await a.presentAlert(); if (choice<0) return;
      if (choice===1 && !await configure()) return;
      if (choice===2) { Keychain.remove(KEY); clearCache(); return; }
    }
  }
  const widget=render(await loadFeed()); Script.setWidget(widget);
  if (config.runsInApp) await widget.presentMedium();
}
await main();
Script.complete();
