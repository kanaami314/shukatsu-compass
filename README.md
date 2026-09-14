# 就活コンパス

企業・選考状況・志望度・紹介元、説明会の内容と感想、予定と空き時間を管理するWebアプリです。

- 記録はユーザーごとにD1に保存します。
- 日時は日本時間。空き時間は登録された予定を対象に9〜18時から検索します。
- Google Calendar等の外部カレンダーとは未連携です。
- 企業概要はWikipediaから候補を取得し、内容確認後に保存します。掲載がない企業は手入力できます。
- ローカル動作確認用データは公開先に含まれません。

開発: `npm run dev` / 構築: `npm run build`

検証: `node --experimental-strip-types verify-model.mjs` / 起動中のローカルサーバーで `./verify-api.ps1`

D1スキーマの変更時は `npm run db:generate` でマイグレーションを生成します。
