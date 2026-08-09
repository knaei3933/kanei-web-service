# フルホームページ制作ループ完成計画（realplan）

- 作成日: 2026-08-09
- 作成モード: OMC plan / realplan
- 対象: ユーザーが要求した「問い合わせ → インテイク検証 → 不足時フォローアップメール → 再提出 → 代表承認 → デモ自動生成 → デモ自動デプロイ → 顧客提案/レビュー → 本制作向けヒアリング/追加素材 → 再検証 → 代表承認 → 希望のホームページ方向に達するまで繰り返し」の残り仕上げ
- 言語方針: 計画本文は韓国語（可読性優先）。コード識別子・ファイルパス・ステータス名・顧客向け文言は原文（日本語）。

---

## 0. 一行サマリ

`問い合わせ〜デモ revision loop`までは**ほぼ実装済み**。最大の空白は
**「本制作（production）前のヒアリング・追加素材収集・再検証・代表再承認」が存在しない**ことと、
**「デモ自動生成・自動デプロイ」がリポジトリ外の外部プロセス（`kanei_demo_handoff_watch.py`）に依存しており、
その実体・設定・契約がリポジトリ内に一切ない**ことの二点。

---

## 1. 現状ステートマシン（正確な地図）

定義: `src/lib/approval-package.ts:50-64`（`ApprovalStatus`）。
遷移表: `src/lib/approval-package.ts:1292-1322`（`VALID_TRANSITIONS`）。

```
received
  │
  ▼
needs_followup ──(PATCH 再提出で ready 化)──▶ awaiting_representative_approval
  │                                                    │
  │ (受領時スコア<60 または admin followup)             │ Gate1: approveRepresentativeReview
  │                                                    ▼ (omc-plan.json 生成)
  ▼                                          awaiting_plan_approval
received ──(高品質: score=100) auto gate ─▶ awaiting_plan_approval
                                                    │
                                                    │ Gate2: approvePlan
                                                    ▼ (execution-handoff.json + execution-prompt.md)
                                           approved_for_execution
                                                    │ (admin execute-demo: python spawn)
                                                    ▼
                                           demo_generating
                                            │              │
                                  (初回生成) ▼              ▼ (revision-handoff から再生成)
                                       demo_deployed ◀──── demo_revised
                                            │  ▲               │  ▲
                              (revision)    │  │ (revision)     │  │
                                            ▼  │               ▼  │
                                   demo_revision_ready ─────────┘  │
                                            │ (feedback approve)  │ (feedback approve)
                                            └─────────┬───────────┘
                                                      ▼
                                            customer_approved
                                                      │ (POST /api/production start_production)
                                                      ▼
                                            production_ready
                                                      │ (POST /api/production/.../deliver)
                                                      ▼
                                                   delivered
```

- Gate 自動通過: `src/app/api/consult/route.ts:1056-1104`（score=100 のみ Gate1+Gate2 自動）。
- 顧客向け状態: `toCustomerFacingStatus`（`approval-package.ts:1270-1286`）。

> **ここで注意**: production 前に「代表承認ゲート」が**ない**。`customer_approved → production_ready` は
> 顧客の `start_production` アクションだけで遷移する（`production/route.ts:51`）。ユーザーが要求する
> 「re-validation → representative approval（本制作前）」はこのマシンに存在しない。

---

## 2. 要求ループ 12 ステップ × 現状マッピング

| # | 要求ステップ | 現状 | 実装場所（該当 or なし） |
|---|---|---|---|
| 1 | inquiry（問い合わせ受領） | ✅ 実装済み | `src/app/api/consult/route.ts:860` |
| 2 | intake validation | ✅ 実装済み | `src/lib/consult-quality.ts:184` `assessConsultIntake`（閾値60・決定論的） |
| 3 | followup mail if insufficient | ✅ 実装済み | 受領時自動: `consult/route.ts:1156`。admin 手動: `api/admin/submissions/[id]/followup/route.ts` |
| 4 | re-submission | 🟡 部分実装 | `PATCH /api/consult/[submissionId]`（`api/consult/[submissionId]/route.ts:77`）。**テキスト項目のみ。添付ファイルの追加に非対応** |
| 5 | representative approval（Gate1/2） | ✅ 実装済み | `approveRepresentativeReview` / `approvePlan`（`approval-package.ts:1156/1211`） |
| 6 | demo auto generation | 🟡 部分実装 | `execute-demo/route.ts:147` が `spawn("python3", ["kanei_demo_handoff_watch.py"])` を呼ぶが、**`.py` はリポジトリに存在しない**（`find` で 0 件）。実体は外部 WSL プロセス |
| 7 | demo auto deploy | 🟡 部分実装 | `SHOWCASE_MAP` が `demo/[submissionId]/page.tsx:17-32` と `execution/[submissionId]/page.tsx` で**ハードコード**（現在2件固定）。外部 handoff-watch が showcase コンポーネントを生成→コミット→エントリ登録→Vercel デプロイ、という流れだが仕組みのソースがリポジトリ内にない |
| 8 | customer proposal/review | ✅ 実装済み | `demo/[submissionId]/page.tsx` + `DemoFeedbackForm` + `feedback/route.ts` |
| 9 | interview / additional materials（本制作前） | ❌ 未実装 | 該当ルート・UI・状態なし。production は状態遷移のみ |
| 10 | re-validation（本制作前） | ❌ 未実装 | intake の再検証（PATCH 内）はあるが、production 前の再検証ゲートはなし |
| 11 | representative approval（本制作前） | ❌ 未実装 | Gate1/2 のみ。`customer_approved → production_ready` に代表承認なし |
| 12 | repeat until desired direction | 🟡 部分実装 | demo revision loop（`demo_deployed ↔ demo_revision_ready ↔ demo_revised`）は**無制限に回せる**。ただし方向性確定判定・ラウンド上限/下限・production 前ループはなし |

---

## 3. 実装状態の分類

### 3.1 完全実装済み（触らなくてよい）

- 相談受領（multipart + 添付保存）: `consult/route.ts`
- 決定論的品質評価 + フィラー検出: `consult-quality.ts`
- 構造化ブリーフ生成: `consult/route.ts:427` `buildBrief`
- 承認パッケージ + 2 ゲート状態遷移: `approval-package.ts`
- 決定論的計画アーティファクト + 実行ハンドオフ生成: `approval-package.ts:881/1074/1004`
- フォローアップメール（自動 + admin 手動 + 履歴）: `followup route` + `sendCustomerFollowupEmail`
- テキスト再提出（PATCH + 再評価 + 自動遷移）: `api/consult/[submissionId]/route.ts:77`
- 顧客デモレビュー + フィードバック（approve/revision）: `demo` page + `feedback` route
- revision ハンドオフ生成 + ラウンド履歴: `demo-feedback-loop.ts:368/500`
- ストレージアダプタ（local/relay/ephemeral）: `src/server/submission-storage`
- メールプロバイダ（log/smtp/relay）: `src/server/mail`
- 本制作開始・納品の状態遷移 + delivery-info.json: `production` route / `production/deliver` route

### 3.2 部分実装（ギャップあり・要補完）

| 項目 | 現状 | ギャップ |
|---|---|---|
| **デモ自動生成** | `execute-demo` route が `python3 kanei_demo_handoff_watch.py` を `spawn`（detached, stdio ignore） | (a) `.py` がリポジトリにない。(b) Vercel/serverless では `spawn` は動かない（プロセス起動不可・外部ファイル不可）。(c) `demo_generating` になった後、誰が `demo_deployed` に戻すかのルート・ポーリングがない。実体は外部 WSL プロセスが `execution-handoff.json` を監視して Claude Code を実行している（git log "auto: demo generated and registered by handoff-watch"）。 |
| **デモ自動デプロイ** | `SHOWCASE_MAP` ハードコード。外部 handoff-watch が showcase コンポーネントを生成してコミット + エントリ登録 | (a) エントリ登録が手動/半自動でソース不明。(b) 生成ステータスの可視化（generating 中の画面）が `DemoNotReadyPlaceholder` の固定表示のみ。(c) `demo_generating` → `demo_deployed` の遷移をトリガーする本体が repo 内にない。 |
| **revision loop** | 無制限に回せる | (a) ラウンド上限/下限なし。(b) 「方向性確定」判定なし。(c) revision 完成通知メール `sendRevisionCompleteEmail` が**定義だけ（`demo-feedback-loop.ts:426`）で呼び出し元ゼロ**。 |
| **デモ完成通知メール** | `sendDemoReadyEmail` が定義済み（`demo-feedback-loop.ts:273`） | **呼び出し元ゼロ**。`demo_generating → demo_deployed` 遷移時に誰もメールを送らない。 |
| **テキスト再提出** | PATCH で payload 部分更新 + 再評価 | 添付ファイル追加ができない。ファイル添付の再提出は新規 consultation になる。 |
| **revision/production メール** | feedback route / production route に `// TODO: send...Email` スタブ多数 | `feedback/route.ts:90,129`、`production/route.ts:70`、`production/deliver/route.ts:110` が TODO のまま。 |

### 3.3 未実装（ゼロから必要）

1. **本制作前ヒアリング（interview）機能** — 質問項目設計・回答収集 UI/API・保存。
2. **本制作前追加素材（additional materials）収集** — 既存 submission へのファイル追加アップロード。
3. **本制作前再検証（re-validation）ゲート** — ヒアリング + 素材が揃ったかの品質再評価。
4. **本制作前代表承認ゲート（pre-production representative approval）** — `customer_approved → production` の間に代表承認を挟む。
5. **方向性確定判定 / ループ終了条件** — revision を含む全体ループの収束判定。
6. **外部 handoff-watch 契約の明文化** — demo 自動生成・デプロイの「正直な設計」ドキュメント化と status 反映ルート。
7. **`demo_generating` 中の進捗可視化** — 生成失敗時の `demo_generating_failed` 相当の復帰経路（現在失敗すると `demo_generating` で固定される）。

---

## 4. 状態マシン変更（state-machine changes needed）

### 4.1 追加ステータス案

`approval-package.ts:50` の `ApprovalStatus` に追加:

- `pre_production_interview` — 顧客がデモ承認後、本制作前のヒアリング/素材収集中。
- `pre_production_review` — ヒアリング完了・再検証後、代表の最終承認待ち。
- `demo_generation_failed`（任意） — 外部生成失敗時の復帰用。`demo_generating` からの遷移先。

> 既存 `customer_approved` を「デモ方向性は確定したが本制作前ヒアリング待ち」の意味に再利用するか、新設するかは設計選択。新設（`pre_production_interview`）を推奨：意味が明確で履歴が残る。

### 4.2 遷移の追加（`VALID_TRANSITIONS`）

```
customer_approved → pre_production_interview      (本制作前ヒアリング開始)
pre_production_interview → pre_production_review  (ヒアリング/素材提出完了 → 再検証後)
pre_production_review → production_ready          (代表の本制作最終承認)
pre_production_review → pre_production_interview  (代表が差し戻し: 追加ヒアリング)
```

既存の `customer_approved → production_ready`（`production/route.ts`）は**廃止または representative 専用に変更**。

> revision loop（`demo_deployed/demo_revised ↔ demo_revision_ready`）は現状維持でよい。ループ終了条件は status ではなく「revision ラウンド数 + rating + 方向性確定フラグ」で判定するヘルパーを別途置く（4.3）。

### 4.3 ループ収束ヘルパ（新規、決定論的）

`src/lib/production-readiness.ts`（新規）に配置:

- `assessProductionReadiness(pkg, interview, materials)` — ヒアリング回答の網羅性・必須素材の有無・revision 履歴の rating 推移から「本制作に進めるか」を決定論判定。`consult-quality.ts` と同じ思想（スコア + 閾値 + reasons）。
- `isDirectionSettled(feedbackHistory)` — revision ラウンドの rating・comment から「方向性が確定したか」（例: 直近2ラウンド rating≥4 かつ重大修正要求なし）を判定。

---

## 5. API 変更（API changes needed）

### 5.1 新規ルート

- `POST /api/consult/[submissionId]/interview`（admin 起票 or 自動）
  - ヒアリング質問セットを保存（`interview-request.json`）。`pre_production_interview` へ遷移。
  - 顧客向けヒアリング依頼メール送信（新テンプレート、日本語）。
- `PATCH /api/consult/[submissionId]/interview`（顧客回答）
  - 回答を保存（`interview-answer.json`）。
- `POST /api/consult/[submissionId]/materials`（顧客・追加素材アップロード）
  - 既存 submission の `files/` に追加保存。`submission.json` の files/fileCount 更新。
  - 既存 `consult/route.ts` の `sanitizeFilename` / `writeAttachment` を再利用。
- `POST /api/admin/submissions/[id]/pre-production/approve`（代表・本制作最終承認）
  - `assessProductionReadiness` で再検証 → OK なら `pre_production_review → production_ready`。
  - NG なら `pre_production_review → pre_production_interview`（差し戻し）。
- `POST /api/demo/[submissionId]/deployed`（外部 handoff-watch が叩く）
  - showcase コンポーネント生成完了を報告。`demo_generating → demo_deployed`（初回）or `demo_revised`（revision）。
  - このルートで `sendDemoReadyEmail` / `sendRevisionCompleteEmail` を**初めて呼ぶ**（TODO 解消）。
  - Bearer 認証（`SUBMISSION_STORAGE_RELAY_SECRET` 流用 or 別シークレット）。

### 5.2 既存ルートの修正

- `POST /api/production/[submissionId]`（`production/route.ts`）
  - 現状: `customer_approved → production_ready` を誰でも遷移。
  - 変更: ステータス `pre_production_review` のみ受け付け、かつ representative secret で保護。または**廃止して 5.1 の pre-production/approve に統合**。
- `POST /api/demo/[submissionId]/feedback`（`feedback/route.ts`）
  - `approve` 時の遷移先を `customer_approved`（維持）のまま、メール TODO を実装。
  - revision 時も `buildRevisionHandoff` を呼んで `revision-handoff.json` を生成（現状 `feedback/route.ts` は `writeArtifact("demo-feedback.json")` だけで revision-handoff を作っていない可能性あり → 要確認・接続）。
- `PATCH /api/consult/[submissionId]`（再提出）
  - 添付ファイル追加を受け付けるよう拡張（multipart 対応）、または 5.1 の materials ルートに役割を分離。

---

## 6. UI 変更（UI changes needed）

### 6.1 顧客向け（customer-facing・日本語）

- **ヒアリング回答ページ** `src/app/interview/[submissionId]/page.tsx`（新規）
  - `interview-request.json` の質問を表示。回答入力 + 追加素材アップロード。
  - 顧客向け文言例: 「本制作を始める前に、もう少し詳しくお伺いします」「こちらの項目にお答えください」。
- **デモ生成中画面の改善** `demo/[submissionId]/page.tsx`
  - `demo_generating` 状態のとき、`DemoNotReadyPlaceholder`（`page.tsx:39`）を「デモを準備中です」の進捗表示に差し替え。必要なら `/api/demo/[submissionId]/status`（`status/route.ts`）をポーリング。
- **完了画面の分岐** — `pre_production_interview` / `pre_production_review` の顧客向け表示を `toCustomerFacingStatus` に追加（現在は `under_internal_review` に丸められる）。

### 6.2 社内向け（representative/admin）

- **review ページ** `src/app/review/[submissionId]/page.tsx`
  - Gate1/2 に加え、**本制作前承認ゲート（Gate3）** UI を追加。
  - revision 履歴・ヒアリング回答・追加素材・`assessProductionReadiness` 結果を表示。
  - 「方向性確定度」`isDirectionSettled` の表示。
- **admin ページ** `src/app/admin/page.tsx`
  - パイプラインアクションに「ヒアリング依頼」「本制作前承認」「デモ再生成」を追加。
  - `demo_generating` が長時間停滞した場合の「生成失敗としてリセット」ボタン（`demo_generation_failed` 復帰用）。

---

## 7. データモデル変更（data model changes needed）

`approval-package.json`（`ApprovalPackage` interface、`approval-package.ts:240`）への追加フィールド:

- `preProductionInterview`: `{ requestedAt, questions: InterviewQuestion[], answers: InterviewAnswer[] | null, answeredAt: string | null }` | null
- `preProductionApproval`: `PlanApprovalDecision` と同じ形（Gate3 用）
- `productionReadiness`: `{ status: "ready"|"needs_followup", score, reasons }` | null（`assessProductionReadiness` 結果のキャッシュ）

新規成果物（ストレージアダプタのホワイトリストに追加が必要 → `submission-storage` の fileName バリデーション更新）:

- `interview-request.json`
- `interview-answer.json`
- `production-readiness.json`（任意・キャッシュ用）

> **注意**: `submission-storage.md:20-22` のホワイトリストは現在 6 種。新ファイルを足すなら同 doc とアダプタ両方の更新が必要。

---

## 8. 外部 handoff-watch 契約の明文化（demo auto gen/deploy の「正直化」）

現状の `execute-demo` route は外部 Python プロセスを spawn するが、その実体・設定・動作環境がリポジトリ内に一切文書化されていない。これを「正直な設計」にする:

1. **ドキュメント新規**: `docs/demo-handoff-watch.md`
   - 外部 WSL プロセスが `execution-handoff.json` / `revision-handoff.json` を監視。
   - Claude Code で showcase コンポーネントを生成 → `SHOWCASE_MAP` にエントリ追加 → git commit → Vercel デプロイ。
   - 完了後 `POST /api/demo/[submissionId]/deployed` を叩いて status を `demo_deployed`/`demo_revised` に。
2. **Vercel での `execute-demo` 挙動の明記**: serverless では `spawn` は機能しない。本番では「`demo_generating` に遷移させて外部プロセスに委譲」が正しい意味。必要なら `execute-demo` route の spawn 部分を env で分岐（local のみ spawn、prod は status 遷移のみ）。
3. **`SHOWCASE_MAP` の動的化検討**: ハードコード（`page.tsx:17-32`）を、生成済みコンポーネントのインデックス（例: `src/generated/showcase-registry.ts`）から読む構造に。handoff-watch がこのレジストリを更新する。

> このセクションは「自動生成・自動デプロイ」を**完全自動化する**のではなく、**現状の半自動を明文化して status を整合させる**のが最小リスク。完全自動化（CI 上で Claude Code 実行など）は別フェーズ。

---

## 9. 実装順序（implementation order）

依存関係の低いものから。各フェーズは独立して検証可能。

### Phase A — 本制作前ヒアリング・素材・再検証・Gate3（最大ギャップ・#9/#10/#11）

1. `ApprovalStatus` に `pre_production_interview`, `pre_production_review` 追加 + `VALID_TRANSITIONS` 更新（`approval-package.ts`）。
2. `src/lib/production-readiness.ts` 新規（`assessProductionReadiness`, `isDirectionSettled`）。
3. `ApprovalPackage` に `preProductionInterview`, `preProductionApproval`, `productionReadiness` フィールド追加 + `normalizeApprovalPackage` 更新。
4. API: `interview`(POST/PATCH), `materials`(POST), `pre-production/approve`(POST)。
5. ストレージホワイトリスト + `submission-storage.md` 更新。
6. UI: 顧客ヒアリングページ、review ページ Gate3、admin アクション。
7. 顧客向けヒアリング依頼メールテンプレート（`src/server/mail/templates.ts`）。

### Phase B — demo 自動生成・デプロイの整合化（#6/#7）

1. `docs/demo-handoff-watch.md` 新規（外部プロセス契約の明文化）。
2. `POST /api/demo/[submissionId]/deployed` 新規（外部→status 反映 + メール送信）。
3. `execute-demo` route の spawn を env 分岐（local spawn / prod 委譲）。
4. `SHOWCASE_MAP` のレジストリ化（`src/generated/showcase-registry.ts`）。
5. `demo_generating` 中 UI の改善 + status ポーリング。
6. （任意）`demo_generation_failed` 復帰経路。

### Phase C — メール TODO 解消 + revision loop 整理（#12 補完）

1. `sendDemoReadyEmail` / `sendRevisionCompleteEmail` の呼び出し接続（deployed route 経由）。
2. `feedback/route.ts` の revision 時 `buildRevisionHandoff` 接続確認。
3. `production/route.ts`, `production/deliver/route.ts` の TODO メール実装。
4. revision ラウンド上限/下限 + 方向性確定判定（`isDirectionSettled`）を admin UI に表示。

### Phase D — 検証（#verify）

---

## 10. 検証ステップ（verification steps）

各フェーズ完了時に以下を実施（`omc:verify` / `code-reviewer` 活用）。

### 10.1 Phase A 検証

- [ ] `needs_followup → PATCH → awaiting_representative_approval` が動くこと（既存 e2e が壊れていないか）。
- [ ] `customer_approved → pre_production_interview → pre_production_review → production_ready` が `transitionStatus` で成功し、無効遷移で例外が出ること。
- [ ] `assessProductionReadiness` が決定論的（同じ入力で同じ出力）であること。単体テスト追加。
- [ ] ヒアリングページから追加素材アップロード → `submission.json` の files/fileCount が更新されること。
- [ ] 旧 `production/route.ts`（`customer_approved → production_ready`）を叩いた場合、新しい遷移では 400 になること（互換性の明示的破壊）。

### 10.2 Phase B 検証

- [ ] local で `execute-demo` → `demo_generating` → 外部プロセス完了 → `deployed` route → `demo_deployed` + 顧客メール送信、の全行程。
- [ ] Vercel（prod）で `execute-demo` が spawn せず status 遷移のみでエラーを出さないこと。
- [ ] `SHOWCASE_MAP` に無い submissionId で demo ページが `DemoNotReadyPlaceholder` ではなく進捗表示になること。
- [ ] `demo_generating` が停滞した場合の復帰（手動リセット）が admin から可能なこと。

### 10.3 Phase C/D 検証

- [ ] revision loop を 3 ラウンド回し、`demo-feedback.json` の history と `revision-handoff.json` の round が整合すること。
- [ ] `isDirectionSettled` が rating≥4 連続で true になること。
- [ ] 全 TODO メールスタブが解消され、`grep -rn "TODO.*Email" src/app/api` が空になること。
- [ ] `npm run build` / `npm run lint` が通ること。Next.js 16 の breaking change に抵触していないこと（`node_modules/next/dist/docs/` 参照）。

---

## 11. リスク・未解決事項（open questions）

1. **`kanei_demo_handoff_watch.py` の所在** — リポジトリ外（WSL）に存在するはずだが、この計画では触らない。Phase B で契約を明文化する際、実体を確認・版管理下に置くかを判断する。
2. **`customer_approved → production_ready` の互換性** — 既存データ（`customer_approved` で止まっている submission）をどう扱うか。マイグレーション or 段階的切替。
3. **添付ファイル再提出の設計** — PATCH を multipart 化するか、materials 専用ルートに分けるか。後者（5.1）を推奨（PATCH は JSON のまま）。
4. **Gate3 の承認者** — 既存 Gate1/2 と同じ representative か、別権限か。現状 `ADMIN_SECRET` ベースなので流用でよい見込み。
5. **revision 無制限の運用** — 顧客が永遠に修正を要求した場合の上限。`isDirectionSettled` + ラウンド上限で運用カバー。
6. **`demo_generating` のタイムアウト** — 外部プロセスが応答しない場合の検知。`demo_generation_failed` + タイムスタンプ監視が理想だが、まずは admin 手動リセットで運用。

---

## 12. スコープ外（この計画では扱わない）

- Claude Code の実行自体の完全自動化（CI 上実行など）。現状の「外部オペレータ handoff」設計を維持。
- 参考サイトの実機クロール/抽出（`referenceAnalysis.urlsBlockedOrUnusable` は Phase 1 から空のまま）。
- 課金・契約（`budgetLabel` などは表示のみ）。
- 多言語対応（顧客向けは日本語固定）。

---

### 附録: 主要ファイルインデックス

| 役割 | ファイル |
|---|---|
| 状態マシン・承認パッケージ | `src/lib/approval-package.ts` |
| インテイク品質評価 | `src/lib/consult-quality.ts` |
| プロンプトチェーン preview | `src/lib/prompt-chain.ts` |
| revision/デモメールループ | `src/lib/demo-feedback-loop.ts` |
| 相談受領 API | `src/app/api/consult/route.ts` |
| 再提出 API | `src/app/api/consult/[submissionId]/route.ts` |
| Gate1 API | `src/app/api/consult/approve/route.ts` |
| Gate2 API | `src/app/api/consult/plan/approve/route.ts` |
| デモ生成トリガー | `src/app/api/admin/submissions/[id]/execute-demo/route.ts` |
| フォローアップ API | `src/app/api/admin/submissions/[id]/followup/route.ts` |
| 顧客フィードバック API | `src/app/api/demo/[submissionId]/feedback/route.ts` |
| デモステータス API | `src/app/api/demo/[submissionId]/status/route.ts` |
| 本制作 API | `src/app/api/production/[submissionId]/route.ts` |
| 納品 API | `src/app/api/production/[submissionId]/deliver/route.ts` |
| デモ表示ページ | `src/app/demo/[submissionId]/page.tsx` |
| 実行プレビューページ | `src/app/execution/[submissionId]/page.tsx` |
| レビューページ | `src/app/review/[submissionId]/page.tsx` |
| ストレージ仕様 | `docs/submission-storage.md` |
