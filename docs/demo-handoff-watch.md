# デモ自動生成・自動デプロイの外部連携（handoff-watch）

作成日: 2026-08-09

デモサイトの「自動生成・自動デプロイ」は、**リポジトリ外の外部プロセス**
（`kanei_demo_handoff_watch.py`・WSL 上で稼働）が担っています。このドキュメントは、
その外部プロセスと Next.js アプリの間の**契約（どこを見て・どこを叩くか）**を明文化し、
アプリ側のルートが「正直な設計」になっていることを示すためのものです。

> この仕組みを完全自動化（CI 上で Claude Code を実行する等）するかは別フェーズの判断です。
> 現状は「半自動を明文化し、status を整合させる」のが最小リスクの運用です。

---

## 1. 登場人物と成果物

| 役割 | 実体 | 場所 |
| --- | --- | --- |
| 生成トリガー | `POST /api/admin/submissions/[id]/execute-demo` | リポジトリ内（本アプリ） |
| 完了報告コールバック | `POST /api/demo/[submissionId]/deployed` | リポジトリ内（本アプリ） |
| 生成・デプロイ本体 | `kanei_demo_handoff_watch.py` | **リポジトリ外（WSL）** |
| handoff 成果物（初回） | `execution-handoff.json` / `execution-prompt.md` | ストレージアダプタ経由 |
| handoff 成果物（修正） | `revision-handoff.json` / `demo-feedback.json` | ストレージアダプタ経由 |
| 生成結果（showcase） | `src/components/sections/*-showcase.tsx` | リポジトリ内（git commit） |
| showcase のエントリ | `SHOWCASE_MAP`（`demo/[submissionId]/page.tsx` 等） | リポジトリ内（ハードコード） |

---

## 2. シーケンス（初回生成）

```
admin                  本アプリ                    外部 handoff-watch            Vercel
  │  「デモを生成」       │                              │                          │
  │ ──────────────────▶ │                              │                          │
  │                      │ execute-demo:                │                          │
  │                      │  1. execution-handoff.json   │                          │
  │                      │     が無ければ生成            │                          │
  │                      │  2. status = demo_generating │                          │
  │                      │  3. (local のみ) .py 起動    │                          │
  │ ◀───── 200 (demo_generating, delegated=true) ──────│                          │
  │                      │                              │  handoff 成果物を監視      │
  │                      │                              │  Claude Code で showcase  │
  │                      │                              │   コンポーネントを生成      │
  │                      │                              │  SHOWCASE_MAP に追加       │
  │                      │                              │  git commit & push ─────────▶ デプロイ
  │                      │ ◀──── POST /deployed ────────│                          │
  │                      │  status = demo_deployed      │                          │
  │                      │  sendDemoReadyEmail 送信      │                          │
  │ ◀──── 顧客へデモ完成通知メール ─────────────────────│                          │
```

修正版（revision）は `revision-handoff.json` を監視し、完了報告で
`demo_revised` へ遷移・`sendRevisionCompleteEmail` を送ります。

---

## 3. `execute-demo` の「正直な」挙動

`POST /api/admin/submissions/[id]/execute-demo` は環境で挙動を分けます。

| 環境 | `spawn(.py)` | 役割 |
| --- | --- | --- |
| ローカル（`VERCEL!=1`） | **試みる**（best-effort） | handoff 成果物を整え + status 遷移 + .py 起動 |
| 本番（`VERCEL=1`・serverless） | **しない** | handoff 成果物を整え + status 遷移のみ |

serverless（Vercel）では `node:child_process` の `spawn` は機能しません
（プロセス起動不可・リポジトリ外ファイル不可・インスタンス揮発性）。そのため
本番では「status を `demo_generating` に進めて外部プロセスに委譲する」のが正しい意味です。

レスポンスには以下を含め、起動方法を透明にします:

```json
{
  "ok": true,
  "status": "demo_generating",
  "delegated": true,
  "spawnAttempted": false,
  "serverless": true,
  "message": "デモ生成を外部プロセス（handoff-watch）に委譲しました。…"
}
```

> `prepareHandoff` が `execution-handoff.json`（初回）または `revision-handoff.json`
> （修正）の存在を保証するため、外部プロセスは常に handoff 成果物を読めます。

---

## 4. 完了報告コールバック: `POST /api/demo/[submissionId]/deployed`

外部 handoff-watch が生成・デプロイを完了したときに叩きます。

### 認証

`Authorization: Bearer <token>`。以下のどちらか（先に設定した方）と定時間比較します:

- `DEMO_HANDOFF_CALLBACK_SECRET`（推奨・コールバック専用）
- `ADMIN_SECRET`（未設定時のフォールバック）

### リクエストボディ（全項目任意）

```jsonc
{
  "result": "success",        // "success" | "failure"（既定: success）
  "kind": "initial",          // "initial" | "revision"（省略時は revision-handoff.json の有無で推定）
  "round": 2                  // revision のラウンド数（省略時は revision-handoff.json の round、更に省略時は 1）
}
```

### 挙動

- `result=success`（既定）:
  - `kind=revision` → `demo_generating → demo_revised`、`sendRevisionCompleteEmail` 送信
  - `kind=initial` → `demo_generating → demo_deployed`、`sendDemoReadyEmail` 送信
  - 遷移できない状態（`demo_generating` でない等）のときは `409`。
- `result=failure`:
  - **ステータスを維持したまま `200` を返します**（外部プロセスの無限再試行を防ぐ）。
  - `demo_generation_failed` 相当の復帰ステータスは未導入（TODO）。必要に応じて管理画面から再生成してください。

### レスポンス例

```json
{
  "ok": true,
  "submissionId": "20260808-130735-d901b09c",
  "status": "demo_deployed",
  "kind": "initial",
  "mailResult": { "provider": "log", "status": "logged", "accepted": ["…"] }
}
```

---

## 5. 既知の制約・未解決事項

1. **`kanei_demo_handoff_watch.py` の所在**: リポジトリ外（WSL）。版管理下に置くかは別途判断。
2. **`SHOWCASE_MAP` はハードコード**: `demo/[submissionId]/page.tsx`（と `execution/[...]`）に
   現在2件固定で埋め込み。外部プロセスがコンポーネントを生成 → コミットでエントリ追加している。
   動的レジストリ化（`src/generated/showcase-registry.ts` 等）は別フェーズ。
3. **`demo_generating` 停滞の検知**: 外部プロセスが応答しない場合の自動タイムアウトはない。
   `demo_generation_failed` ステータス + タイムスタンプ監視が理想だが、まずは管理画面からの
   手動リセットで運用（TODO）。
4. **`demo_generating` 中の顧客画面**: `demo/[id]` ページは `demo_deployed` / `demo_revised` の
   み表示。生成中の進捗表示・ポーリングは別途（Phase B の残課題）。
