# ChatGPT読み取り連携 — 作業引き継ぎ

更新: 2026-10-20

## 目的と確定仕様
- 保存済みの企業・ノート・タスク・予定をChatGPTから読み取り専用で参照。
- Sites標準のMCPを利用。サイトは既存の所有者限定を維持。
- 設定は初期OFF。アプリで有効化・種類選択・企業や個別記録の除外・停止。
- 下書き、ごみ箱、履歴、認証情報は公開しない。エージェントは選択時に名前・連絡先・メモを参照可能。
- 学校・アルバイト・私用を含む予定名を参照可能。個別除外した予定・企業・エージェントの予定だけ時間帯に匿名化。空き時間は9〜20時。
- 既存データ変更経路とMCPを分離。所有者認証と設定を毎回検証。
- 回答は取得時点・出典を示す。本人の感想と事実、推測を混同しない。

## 現在
- GitHub: kanaami314/shukatsu-compass (private), origin/master
- 開始コミット: d8c45e13b502cb826e551edc61b6dbce50c6759b
- Sites source helperで既存ソースを開いた。既存データ変更なし。
- 公式MCP仕様とSitesの自動プラグイン作成仕様を確認済み。

## 実装・確認済み
- 設定テーブル追加（0005_narrow_hex、既存テーブル変更なし）、設定API・左ナビUIを追加。
- /mcp: discover、旧initialize互換、tools/list、4つの読み取りツール。
- 出典閲覧ページ /chatgpt/source/[id]。
- verify-chatgpt.mjs: 認証、所有者分離、設定競合、停止競合、除外連鎖、個人予定の匿名化、ページング、祝日・終日・移動時間、既存レコード非変更すべてPASS。
- TypeScript検査・本番ビルドPASS。
- verify-data-safety.mjsで既存の下書き・競合・履歴・バックアップ保護の回帰テストPASS。
- ローカルUIで設定保存→再読み込みによる保持を確認。
- HTTP経由で4ツールの公開、停止中の取得拒否、出典ページ200を確認。

## 公開・接続結果
- 本番公開成功。アプリ実装コミット: fc3f1b8ed87b23d827a97e4aedf5ed1119893099
- URL: https://shukatsu-compass-yamas.polite-spool-1598.chatgpt.site/?view=ai
- Deployment: appgdep_6ad76c455934819183f5a3cc8fe371fe (succeeded, has_mcp=true)
- Version: appgprj_6aa78d50337c8191a091818da2dbe368~appgver_cf46886266588191aaa507046f6269a2
- GitHub origin/masterへ実装push済み。公開範囲は所有者限定を維持。
- 個人プラグイン一覧から対応プラグインを確認。websiteURLが本番と一致。
- Plugin ID: plugin_asdk_app_sites_6790e1722c488191a8e339fbe793617d
- 表示名: 就活コンパス。suggest_pluginsはAlready installedを返した。
- get_siteのmcp_connectionにURLはあるがplugin_idは未掲載だったため、所有者プラグイン一覧・内容で確認した。

## ユーザー側の次の操作・未検証部分
1. 本番の左ナビ「ChatGPT連携」で参照範囲を選択、許可をONにして保存（初期OFF）。
2. 同じアカウントの新しいChatGPTチャットで就活コンパスを選ぶ。
3. 相談して実データ読み取りを確認。この既存チャットには新ツールがまだ出現せず、ChatGPT経由の実読み取りは未検証。
- サーバー/API/設定UIは検証済み。接続を有効にした場合のエンドツーエンド確認は次回。
- このファイルの公開後追記は記録のみで、上記アプリ実装コミットの動作は変わらない。

## 再開時の注意
- APIキー・Sites一時認証情報をファイルやログに保存しない。
- Sites資格情報は再発行可。source helper使用、GitHub originを保持。
- 既存のdraft/history/backup/records処理は変更しない。
- 公開状態・Git差分・このファイルを確認してから再開する。

## 予定名・エージェント拡張（2026-10-20）
- 全カテゴリの予定名を返す。明示的な個別除外のみ匿名化を維持。
- エージェント種類を追加。名前・連絡先・メモ、紹介元のID/名称を許可範囲内で取得。
- 保存済みの種類選択は維持。既存利用者は連携設定でエージェントをチェックして保存。
- verify-chatgpt.mjs拡張PASS、TypeScript・本番ビルドPASS。公開処理へ。
