# 相談成果物ストレージ（Submission Storage）

相談パイプラインが生成する成果物（`submission.json` / `brief.json` /
`approval-package.json` / `omc-plan.json` / `execution-handoff.json` /
`execution-prompt.md`）を、環境に応じて恒久保存する仕組みです。
メールリレー（`docs/mail-relay.md`）と同じ「固定ルート → 上流リレー」の
二段構えを採用しています。

## なぜ必要か

Vercel / serverless では、書き込み可能な `/tmp` が**インスタンス単位・エフェメラル**
です。あるリクエストで書いた承認パッケージが、別リクエスト（別インスタンス）では
読めず、レビュー／承認／計画承認（review / approve / plan-approve）が壊れます。

そこで成果物を**社内 WSL のリレーストレージへ HTTP 経由で恒久保存**し、
どのインスタンスでも同じ内容を読めるようにします。

## 保存する成果物（6 種）

ストレージアダプタが扱うのは次の 6 ファイルだけです（ホワイトリスト制。
これ以外はアダプタでもプロキシルートでも拒否します）。

| ファイル | 役割 | 主な書き出し元 |
| --- | --- | --- |
| `submission.json` | 顧客送信データ（ペイロード + 添付メタ） | `/api/consult` |
| `brief.json` | 構造化ウェブ制作ブリーフ（決定論的） | `/api/consult` |
| `approval-package.json` | 社内レビュー用の統制ドキュメント | `approval-package.ts` |
| `omc-plan.json` | OMC 計画アーティファクト（決定論的） | `approval-package.ts` |
| `execution-handoff.json` | 実行ハンドオフのメタデータ + コマンド | `approval-package.ts` |
| `execution-prompt.md` | 実行ハンドオフのプロンプト本文 | `approval-package.ts` |

> **添付ファイル（本体）の扱い**: 顧客がアップロードしたファイル本体は
> このアダプタを経由**せず**、常に filesystem（ローカルは `data/`、本番は `/tmp`）
> に保存します。本番ではインスタンス再利用で失われる可能性があります（エフェメラル）。
> 一方、添付の **メタデータ**（ファイル名・サイズ・種別など）は `submission.json` /
> `approval-package.json` に保持され、リレー経由で恒久保存されるため、
> レビュー時には常に参照できます。本体の恒久保存は今後の課題です。

## 保存モードの解決（3 モード）

`src/server/submission-storage/index.ts` が環境に応じてモードを解決します。

| モード | 条件 | 保存先 | 恒久性 |
| --- | --- | --- | --- |
| `local` | `VERCEL !== "1"`（ローカル開発） | `data/consult-submissions/` | ◯（手動で消すまで残る） |
| `relay` | 本番 + `SUBMISSION_STORAGE_RELAY_URL`/`SECRET` 設定あり | HTTP リレー（WSL） | ◯（恒久） |
| `ephemeral` | 本番 + リレー未設定 | `/tmp/consult-submissions/` | ✗（インスタンス再利用で消失） |

- ローカル開発は常に `local`（filesystem）で動きます。リレー設定は不要です。
- 本番でリレー環境変数を設定すれば `relay` になり、成果物が恒久保存されます。
- 本番でリレー未設定だと `ephemeral`（`/tmp`）に戻り、インスタンスをまたいだ
  review/approve は壊れます。**本番運用ではリレー設定を必ず入れてください。**

## 保存の流れ（本番・relay モード）

固定の公開ルート（Vercel）と上流ストレージ（WSL）の二段構えです。
上流の URL は変わりうるため、アダプタは固定 URL を叩き、
その固定ルートが上流へ転送します。

```text
Vercel (Next.js) — /api/consult, /api/consult/approve, ...
   │  成果物を書く: writeArtifact(id, "approval-package.json", ...)
   ▼
Relay プロバイダ（src/server/submission-storage/providers/relay.ts）
   │  SUBMISSION_STORAGE_RELAY_SECRET で Bearer 認証しつつ
   │  SUBMISSION_STORAGE_RELAY_URL へ PUT / GET
   ▼
/api/submission-storage/[submissionId]/[fileName]（固定の公開ルート・Vercel 上）
   │  SUBMISSION_STORAGE_RELAY_SECRET で Bearer 認証
   │  submissionId / fileName を検証（ホワイトリスト・トラバーサル対策）
   │  ボディをそのまま SUBMISSION_STORAGE_RELAY_UPSTREAM_URL へ転送
   ▼
社内 WSL リレーストレージ（任意のキーバリュー実装）
   │  {UPSTREAM}/{submissionId}/{fileName} を GET/PUT/DELETE
   ▼
別リクエスト（別インスタンス）の review/approve/plan-approve が同じ成果物を読める
```

- `SUBMISSION_STORAGE_RELAY_URL` には固定の公開ルート
  `https://kanei-web-service.vercel.app/api/submission-storage` を指定します。
- `SUBMISSION_STORAGE_RELAY_UPSTREAM_URL` には「現在の WSL トンネル URL」または
  「将来の固定上流」を指定します。トンネル URL が変わった場合はここだけ差し替えます。
- `SUBMISSION_STORAGE_RELAY_SECRET` は `/api/submission-storage` の認証と
  上流ストレージで同じ値を使います。

## 上流ストレージの REST 契約（最小要件）

`/api/submission-storage` が転送する先は、次のキーバリュー操作を受け付けること。

| メソッド | パス | 動作 |
| --- | --- | --- |
| `GET` | `/{submissionId}/{fileName}` | 本文（UTF-8）を返す。不在時は `404` |
| `PUT` | `/{submissionId}/{fileName}` | ボディ（UTF-8）を保存して `2xx` |
| `POST` | `/{submissionId}/{fileName}` | `PUT` と同等（書き込みの別名） |
| `DELETE` | `/{submissionId}/{fileName}` | 削除して `2xx` |

- 認証は `Authorization: Bearer <SUBMISSION_STORAGE_RELAY_SECRET>`（固定ルートが
  受けた同じヘッダーを上流へそのまま転送します）。
- `submissionId` は `^[A-Za-z0-9._-]+$`、`fileName` は上記 6 種のいずれかです。
  それ以外は固定ルートが `400` で拒否します。

## 固定公開ルートの単体確認

`/api/submission-storage` 単体は、上流 URL が設定されていれば curl で検証できます。

```bash
# 書き込み（PUT）
curl -sS -X PUT \
  'https://kanei-web-service.vercel.app/api/submission-storage/<submissionId>/approval-package.json' \
  -H 'Authorization: Bearer ***' \
  -H 'Content-Type: application/json' \
  --data '{"submissionId":"<submissionId>","status":"awaiting_representative_approval"}'

# 読み取り（GET）
curl -sS \
  'https://kanei-web-service.vercel.app/api/submission-storage/<submissionId>/approval-package.json' \
  -H 'Authorization: Bearer ***'
```

- 認証失敗は `401`、`SUBMISSION_STORAGE_RELAY_UPSTREAM_URL` 未設定は `502`、
  上流との通信失敗は `502` を返します。
- 上流からの応答は HTTP ステータス・ボディともにそのまま透過します。

## 環境変数（Vercel 側）

| 変数 | 必須 | 説明 |
| --- | --- | --- |
| `SUBMISSION_STORAGE_RELAY_URL` | relay 使用時 | 固定の公開ルート `https://kanei-web-service.vercel.app/api/submission-storage` |
| `SUBMISSION_STORAGE_RELAY_UPSTREAM_URL` | relay 使用時 | 固定ルートが転送する上流ベース URL |
| `SUBMISSION_STORAGE_RELAY_SECRET` | relay 使用時 | 固定ルート / 上流ストレージの共有シークレット |

`.env.example` にコメント付きプレースホルダがあります。

> ローカル開発では何も設定しなくても `local`（filesystem）で動きます。

## メールリレーとの関係

本仕組みはメールリレー（`docs/mail-relay.md`）と同じ二段構え・同じ認証パターンですが、
**別のルート・別のシークレット**です。

- メール: `/api/mail-relay` + `MAIL_RELAY_*`
- 成果物: `/api/submission-storage` + `SUBMISSION_STORAGE_RELAY_*`

どちらも上流を社内 WSL に置き、トンネル URL の変更は上流 URL の差し替えだけで
吸収できるようにしています。シークレット値は用途ごとに独立させることを推奨します。

## 相談パイプラインとの関係

`/api/consult` と `src/lib/approval-package.ts` は、成果物の読み書きをすべて
このストレージアダプタ経由で行います（`writeArtifact` / `readArtifact`）。
そのため、本番で `relay` モードになっていれば、受領から承認・計画承認・実行
ハンドオフまで、別インスタンスでも一貫して同じ成果物を読み書きできます。

- `submission.json` / `brief.json`: `/api/consult` が受領時に書き出す。
- `approval-package.json`: 受領時と各ゲート遷移（approve / plan-approve / reject）で更新。
- `omc-plan.json`: 第 1 ゲート（インテイク承認）で生成。
- `execution-handoff.json` / `execution-prompt.md`: 第 2 ゲート（計画承認）で生成。

> review ページ（`/review/[submissionId]`）は `readApprovalPackage` と
> `readExecutionPromptMarkdown` を経由してアダプタから読むため、
> モードが `relay` なら本番でも正しく表示・承認できます。
