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
- verify-chatgpt.mjs拡張PASS、TypeScript・本番ビルドPASS。本番反映成功。
- 実装コミット: 828a4ae3d651d19283c5a1742dea2e9429f11d16（GitHub同期済み）
- Deployment: appgdep_6ad77aebcbb08191a1d27280cb214548 (succeeded, has_mcp=true)
- Version: appgprj_6aa78d50337c8191a091818da2dbe368~appgver_9e6028fab8448191bf9abdd46bc6f5a8

## 企業一覧・事業形態・予定候補（2026-10-21）
- 見送り・辞退は既定非表示。表示時は末尾、既定ソートはスコア降順（未設定は後）。
- 企業の事業形態を複数選択、主力1つを区別。旧クライアントからの保存でも保持。
- 予定名のプリセットを追加。記入済みタイトルの置換確認あり、日時等は変更しない。
- TypeScript、verify-company-interest、verify-data-safety、verify-chatgpt、本番ビルドPASS。
- ローカル画面で既定フィルタ/ソート、複数形態・主力、予定プリセットと置換確認を検証済み。本番反映成功。
- 実装コミット: 3e9e67ec9845925eaf9ebe5a15b8cc85a5897f07（GitHub同期済み）
- Deployment: appgdep_6ad7fc38a7508191a3dc8b3f8763f056 (succeeded, has_mcp=true)
- Version: appgprj_6aa78d50337c8191a091818da2dbe368~appgver_b5e33d70557c81918c44f97ae8fb1032

## 仮予定・候補確定・下書き破棄（2026-10-21）
- planningで確定/仮を区別。明示的な候補グループ内のみ、確定時に他の仮予定をごみ箱へ移動。
- 確定と候補削除は同一の条件付き更新。競合・履歴保存失敗時は全件保護。復元時は候補グループから外す。
- 仮予定はカレンダーで(仮)・点線表示、空き時間をブロック。共有画像・ChatGPT連携にも反映。
- 閉じる時は継続/下書き保持/今回の下書き削除から選択。保存済みデータや以前の控えは変更しない。
- バックアップ復元は候補グループIDを再割当し、元データとの混同を防止。
- TypeScript、data-safety（候補確定・競合・rollback・復元追加）、chatgpt、share-images、本番ビルドPASS。
- UIで仮予定・グループ作成・閉じる3択を確認。再開時にブラウザツール障害で、破棄後UIの確認は未完了。
- 公開処理中。
- 公開成功: a6056b04fe9278b7f427965c14ebecd7e38a6ae3（GitHub同期済み）
- Deployment: appgdep_6ad843a0c2108191bade8a1eded01ef3 (succeeded)
- Version: appgprj_6aa78d50337c8191a091818da2dbe368~appgver_7e0ea1ebf8508191af078993c7e8f037

## 候補グループの関連先別分離（2026-10-21）
- 選択中の企業・エージェント・個人予定に限定して候補グループを表示。関連先名称を明示。
- 関連先変更時は候補グループ選択を解除。既存データを書き換える移行は不要。
- 確定時の削除・競合ガードも関連先一致を条件とし、旧データの混在グループを安全に分離。
- data-safetyに企業間/エージェント/個人の分離検証を追加しPASS。型検査・本番ビルドPASS。
- ブラウザツールの既知の接続障害のため今回の画面操作確認は未実施。
- 公開成功: 265a0f2d209bca752fb6b814fde9815a05ab21a4（GitHub同期済み）
- Deployment: appgdep_6ad84567e4a48191b3d4283ae2f43a22 (succeeded)
- Version: appgprj_6aa78d50337c8191a091818da2dbe368~appgver_6c72432cc03481919f3d090df56e0f00

## 候補グループの自動判定（2026-10-21）
- 企業/エージェントの仮予定はgroupId未指定なら関連先で自動グループ化。個人予定は未指定では独立。
- 任意の手動グループは折りたたみから指定。既存の手動指定は保持し、自動グループとは分離。
- 保存済みの仮予定を確定した時だけ他候補を取り消す。新しい確定予定の直接登録では候補を取り消さないことをUIに説明。
- 自動グループは仮予定のみ対象。以前の確定予定を保持し、後続選考の新候補も登録可能。
- 復元画面は独立した手動グループを作り、他の候補への影響を回避。
- 型検査・データ保護テスト（自動/手動/個人/次の選考/競合を追加）PASS。ブラウザ操作検証は既知のツール接続障害のため未実施。
- 本番ビルドPASS・公開成功: 690b8075fd01814b6388f0e75dce1ea70a000304（GitHub同期済み）
- Deployment: appgdep_6ad847af8b9c81919d6a10cf14cbbe0d (succeeded)
- Version: appgprj_6aa78d50337c8191a091818da2dbe368~appgver_a07498b537188191ae680feb8dc60507
