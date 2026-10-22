# iPhoneウィジェット中継

Scriptableから、非公開Sitesのウィジェット専用読み取りAPIへ接続するWorkerです。PCの常時起動は不要です。

## 構成

- Scriptable → 固定の `GET /v1/widget` → Sites `/api/widget/feed`
- iPhoneの鍵は `cw1_` から始まる256ビット乱数。アプリの認証済み設定画面で発行し、D1にはSHA-256だけ保存します。
- 中継は `SITES_SERVICE_TOKEN` をCloudflareのsecretに保持します。コード・iPhone・URL・ログへ出しません。
- 一般的なプロキシとしては使えません。固定宛先のみ・リダイレクト禁止・GETのみ・返却項目を限定しています。
- ウィジェット設定はChatGPT連携設定とは独立しています。接続は既定で停止中です。

## 更新

リポジトリのルートで `node node_modules/wrangler/bin/wrangler.js deploy --config widget-relay/wrangler.jsonc` を実行します。
初回のみ、`node node_modules/wrangler/bin/wrangler.js secret put SITES_SERVICE_TOKEN --config widget-relay/wrangler.jsonc` の非表示プロンプトで対応するSitesのサービスアクセス鍵を設定します。別サイトの鍵を使わないでください。鍵をコマンド引数やファイルに書かないでください。

Siteのサービスアクセス鍵を変更した場合は、このsecretも更新が必要です。iPhoneの接続キーはアプリ側から再発行／停止できます。Sitesの公開範囲は変更しません。

## iPhoneへの導入

1. アプリの「iPhoneウィジェット」をiPhoneで開き、Scriptable用コードをコピー。
2. Scriptableで新規スクリプトを作り、貼り付けて「就活コンパス」として保存。
3. アプリで接続キーを発行し、Scriptableでの初回実行時に貼り付け。
4. ホーム画面にScriptableの中サイズを追加して、スクリプトに「就活コンパス」を指定。

コードの原本は `public/scriptable/compass.js`。Scriptableはアプリのアップデート時にコードを自動更新しません。変更した際はコピーし直します。

## 制限と確認

- 日時は日本時間。予定は今後7日、タスクは7日以内の期限と期限超過。学校／アルバイトの固定予定は除外。
- 各6件取得、小1件・中2件・大4件ずつ表示。全件はタップ先のアプリで確認します。
- iOSに15分後以降の更新を依頼しますが、更新周期は保証できません。
- 通信失敗時は24時間以内のキャッシュだけを「未更新」と表示。認証拒否時はキャッシュを削除。アプリ上で停止しても、すでにiOSが表示した画像は次回実行まで残り得ます。
- `node verify-widget.mjs` は認証・所有者分離・失効・項目限定・中継・Scriptableの模擬実行を検証します。実際のiPhoneの表示とバックグラウンド更新は端末での確認が必要です。
