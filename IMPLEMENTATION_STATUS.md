# ChatGPT読み取り連携 — 作業引き継ぎ

更新: 2026-10-20

## 目的と確定仕様
- 保存済みの企業・ノート・タスク・予定をChatGPTから読み取り専用で参照。
- Sites標準のMCPを利用。サイトは既存の所有者限定を維持。
- 設定は初期OFF。アプリで有効化・種類選択・企業や個別記録の除外・停止。
- 下書き、ごみ箱、履歴、認証情報、エージェント連絡先は公開しない。
- 学校・アルバイト・私用・除外企業の予定は時間帯だけ。空き時間は9〜20時。
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

## 残作業
1. Sites公開（所有者限定）、GitHub push。
2. Sitesが作成するプラグインを接続案内し、可能なら実呼び出し。

## 再開時の注意
- APIキー・Sites一時認証情報をファイルやログに保存しない。
- Sites資格情報は再発行可。source helper使用、GitHub originを保持。
- 既存のdraft/history/backup/records処理は変更しない。
- 公開状態・Git差分・このファイルを確認してから再開する。
