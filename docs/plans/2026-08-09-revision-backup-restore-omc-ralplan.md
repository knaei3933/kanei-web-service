---
omc_mode: ralplan                 # OMC ralplan（pre-coding 計画専用モード）
omc_skill: oh-my-claudecode:plan  # プロジェクトルール: 計画段階は omc:plan
plan_kind: pre-coding             # コーディング前の必須計画ステップ
plan_status: AWAITING_REPRESENTATIVE_APPROVAL
coding_gate: LOCKED               # この ralplan が承認されるまで実装禁止
supersedes: docs/plans/2026-08-09-revision-backup-restore-omc-realplan.md
created: 2026-08-09
language: 日本語（本文・可読性優先）/ 識別子・パス・ステータス名・顧客文言は原文
---

# リビジョンループ バックアップ／復元アーキテクチャ — OMC ralplan（pre-coding）

> **この文書は OMC（oh-my-claudecode）の pre-coding ralplan である。**
> つまり「Claude Code が計画を書いた」という事実以上に、
> **実装に入る前に必ず通過しなければならない計画ゲート**として振る舞う。
> 下記 `coding_gate: LOCKED` は、代表者（representative）がこの計画を承認し、
> 各 Phase の approval gate を順に解除しない限り、**1 行もコードを書いてはならない**ことを意味する。
> この文書自体は**計画成果物（plan artifact）**であり、コード・設定ファイルは一切変更しない。

---

## 0. 一行サマリ（executive summary）

revision loop は「状態と修正指示」の一部を保存しているが、**各ラウンドで実デプロイされた showcase コンポーネントのソース**と、**ラウンド ↔ git コミット ↔ コンポーネントの索引**が存在しない。そのため「過去ラウンドへの正確なロールバック」と「古いラウンドを基点にした新ラウンド生成」が今は不可能である。本 ralplan は、(1) 決定論的な系譜インデックス `revision-lineage.json`、(2) ラウンドごとの内容スナップショット `snapshots/`、(3) 完了コールバック経由の round↔commit 相関取り込み、(4) 復元／再利用 API と管理 UI、を 6 段階（Phase R1〜R6）で導入し、各段階に検証・rollback point・approval gate を置く。

---

## 1. 目的と受入基準（acceptance criteria）

### 1.1 目的（4つのユーザー要件）

1. **many revision rounds** —— 何ラウンド修正しても、各ラウンドの「内容」が失われない。
2. **exact rollback to an old round** —— ラウンド N の内容に正確に戻せる（非破壊・新コミットとして）。
3. **use an old round as the base for a new round** —— ラウンド N を出発点にして新ラウンド（バリアント）を作れる。
4. **representative-visible admin restore/reuse workflow** —— 代表者画面から復元／再利用が見えて、操作できる。

### 1.2 受入基準（acceptance criteria・これが揃えば完成）

- [ ] AC-1: ラウンド 0..N の各 `snapshots/round-<N>.json` に `componentSource` が保存されている。
- [ ] AC-2: `revision-lineage.json` が全ラウンドの `round ↔ snapshotKey ↔ commitSha ↔ parentRound ↔ kind` を保持する。
- [ ] AC-3: 代表者画面に「リビジョン履歴」が表示され、復元／再利用ボタンが動く。
- [ ] AC-4: round N を復元すると、N の内容が新コミットとして live になり、顧客に「修正 M 回目」通知が届く。
- [ ] AC-5: round N を基点に reuse（variant）すると、N は置き換わらず新しいラウンドが分岐する。
- [ ] AC-6: git 履歴は前方向のみ（過去コミットを消さない）。監査可能。
- [ ] AC-7: componentSource が欠損したラウンドは、API が安全に拒否（409/422）し、git からの手動復元へ誘導する。

---

## 2. 現状の正確な地図（事実・証拠付き）

### 2.1 保存されているもの（PRESERVED）

| 成果物 | 何が残るか | 根拠 |
| --- | --- | --- |
| `demo-feedback.json` | フィードバック履歴 `{round, feedback, submittedAt}[]`（古い順）+ `latest`。**最大20件**で古い方から破棄。 | `src/lib/demo-feedback-loop.ts:500-531` |
| showcase コンポーネントの過去ソース | git 履歴にすべて残る。`git show <sha>:src/components/sections/<name>-showcase.tsx` で復元可能。 | git log |

### 2.2 上書きされるもの（OVERWRITTEN・注意）

| 成果物 | 上書きタイミング | 何が失われるか | 根拠 |
| --- | --- | --- | --- |
| `revision-handoff.json` | **修正要望のたび毎回上書き** | 過去ラウンドの `revisionPrompt`・`targetComponent`・`round`・`createdAt`。 | `src/lib/demo-feedback-loop.ts:407-411` |
| showcase コンポーネントファイル | **各ラウンドの git コミットで同一パスを上書き** | 実行時（serverless）には「そのラウンドのソース」が読めない。 | git show |

### 2.3 契約不整合（重要・2026-08-09 検証済み）

外部 handoff-watch（`/root/.hermes/scripts/kanei_demo_handoff_watch.py`）は：
- **`POST /api/demo/[id]/deployed` を叩かない**
- 代わりに `approval-package.json` の `status` を直接書き換えている
- したがって `/deployed` route 経由の顧客通知メールも、lineage／snapshots 取り込みも**発火経路が途絶えている**

### 2.4 欠落しているもの（MISSING・本計画の対象）

1. **各ラウンドの showcase ソースのスナップショット**（ストレージ内）
2. **`revision-handoff.json` のラウンド別保存**
3. **round ↔ git commit ↔ コンポーネント の索引（manifest）**
4. **`revision-lineage.json`（系譜インデックス）**
5. **復元 API／UI**
6. **再利用 API／UI**
7. **「バリアント」概念**
8. **復元フォールバック**

---

## 3. 目標アーキテクチャ（三層）

```
┌──────────────────────────────────────────────────────────────────────┐
│  revision-lineage.json   ← 新規・ホワイトリスト追加                       │
│  （系譜インデックス: 全ラウンドのメタ + round↔commit↔snapshotKey 相関）    │
│  小さい・常に最新。復元/再利用の「目次」。                                  │
└──────────────────────────────────────────────────────────────────────┘
                                │ 参照
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  snapshots/<key>.json     ← 新規・files/ と並ぶ新名前空間                  │
│  （ラウンドごとの内容バンドル: componentSource + revisionHandoffCopy +     │
│    feedbackCopy + meta）                                                  │
│  大きめ・1 ラウンド 1 ファイル・追記専用（上書きしない）                     │
└──────────────────────────────────────────────────────────────────────┘
                                ▲ 保存トリガ
                                │
┌──────────────────────────────────────────────────────────────────────┐
│  /api/demo/[id]/deployed 拡張  ← 外部 handoff-watch が SHA/ソースを送信     │
│  （kind/round に加え commitSha/componentPath/componentSource を受信）       │
└──────────────────────────────────────────────────────────────────────┘
                                │ 相関の最終クロスチェック
                                ▼
                          git history（真の SoT）
```

設計原則: **lineage は再生成可能な派生物**。真の SoT は (a) git（コンポーネント実体）と (b) snapshots（componentSource のコピー）。

---

## 4. 用語定義

| 用語 | 定義 |
| --- | --- |
| **round（ラウンド）** | 0 = 初回生成。1..N = revision の回数。 |
| **variant（バリアント）** | 同一ラウンドから分岐した派生物。例: round 3 を基点に「A案」「B案」。 |
| **snapshot（スナップショット）** | あるラウンドがデプロイされた瞬間の内容セット。 |
| **lineage（系譜）** | 全ラウンドのメタデータ索引。`revision-lineage.json` に集約。 |
| **restore（復元）** | 過去ラウンド N の内容を**新規コミットとして live に戻す**（非破壊）。 |
| **reuse（再利用）** | 過去ラウンド N を**出発点**にして新ラウンドを生成する。 |
| **isCurrent（現行）** | 現在 live なラウンド。lineage 上で 1 件のみ `true`。 |

---

## 5. 実装フェーズ（Phase R1〜R6）

> 各 Phase は**独立して検証可能**で、**独立して rollback 可能**。
> 各 Phase の終わりに approval gate があり、代表者が承認しないと次に進まない。
> **本 ralplan は実装しない（計画専用・`coding_gate: LOCKED`）。**

### Phase R1 — ストレージ基盤（依存の根）

**出力**:
- `ARTIFACT_FILE_NAMES` に `"revision-lineage.json"` 追加
- `SubmissionStorageAdapter` に `writeSnapshot`/`readSnapshot`/`snapshotExists` 追加
- `isSafeSnapshotKey` 新設
- filesystem/relay provider 実装
- プロキシルート `/api/submission-storage/[submissionId]/snapshots/[key]/route.ts` 新設

**検証**: local/relay での読み書き、認証 401/400/502

**approval gate**: **Gate-R1** — ストレージ契約拡張の承認

### Phase R2 — lineage 書き込み基盤（`/deployed` 拡張 + 契約正直化）

**出力**:
- `src/lib/revision-lineage.ts`（新規）
- `src/lib/revision-snapshot.ts`（新規）
- `/deployed` route の body 拡張（`artifact` 受信）
- `artifact` 無し時のプレースホルダ

**検証**: `artifact` ありで lineage+snapshots 生成、無しでも後方互換

**approval gate**: **Gate-R2** — handoff-watch 契約正直化の承認（外部プロセス改修を含む）

### Phase R3 — 復元／再利用 API

**出力**:
- `RevisionHandoff` 型の後方互換拡張
- `POST /api/admin/submissions/[id]/rounds/[round]/restore`
- `POST /api/admin/submissions/[id]/rounds/[round]/reuse`
- `GET /api/admin/submissions/[id]/rounds`

**検証**: restore/reuse で正しく handoff 生成、競合時 409 拒否

**approval gate**: **Gate-R3** — 復元/再利用 API の承認

### Phase R4 — 管理 UI

**出力**:
- `admin/[id]/page.tsx` に「リビジョン履歴」セクション追加
- 復元/再利用/ソース確認ボタン
- `hasComponentSource:false` の注意表示

**検証**: 履歴テーブル表示、ボタン動作

**approval gate**: **Gate-R4** — 管理 UI 運用フローの承認

### Phase R5 — バックフィルとコミット規約

**出力**:
- `scripts/rebuild-revision-lineage.ts`（新規）
- 既存 showcase のバックフィル
- 決定論的コミットメッセージ規約

**検証**: スクリプトが lineage+snapshots 生成、推定 round に `notes` 付与

**approval gate**: **Gate-R5** — バックフィル運用の承認

### Phase R6 — 検証（E2E）

**検証**: local で 3 ラウンド → 復元 → reuse → relay トランザクション性確認 → `npm run build`/`lint`

**approval gate**: **Gate-R6（最終）** — 受入基準 AC-1〜AC-7 達成の承認

---

## 6. 復元／再利用フロー

### 6.1 restore（過去ラウンドを live に戻す）

```
担当者: admin/[id] で「round 1 を復元」クリック
   │ POST /api/admin/submissions/[id]/rounds/1/restore
   ▼
restore route
   ├─ snapshots/round-1.json から componentSource 取得
   ├─ 復元用 revision-handoff.json 生成（kind:restore, parentRound:1）
   ├─ lineage に新エントリ追加
   ├─ transitionStatus("demo_revision_ready")
   └─ 200 { newRound, parentRound:1 }
   ▼
外部 handoff-watch（契約改定後）
   ├─ baseComponentSource を showcase ファイルに書いてコミット
   └─ POST /deployed { artifact:{ sha, source, ... } }
   ▼
顧客: 「修正 N 回目」通知メール → デモ確認
```

### 6.2 reuse（過去ラウンドを基点に新ラウンド生成）

```
担当者: admin/[id] で「round 3 を基点に A 案を作る」
   │ POST /api/admin/submissions/[id]/rounds/3/reuse
   │   body: { revisionPrompt:"...", variantTag:"A" }
   ▼
reuse route
   ├─ snapshots/round-3.json から baseComponentSource 取得
   ├─ revision-handoff.json 生成（kind:reuse, parentRound:3, variantTag:"A"）
   ├─ demo-feedback.json に reuse 指示追記
   ├─ lineage 新エントリ
   └─ transitionStatus("demo_revision_ready")
```

---

## 7. 外部 handoff-watch 契約の正直化

実体はリポジトリ外。本計画は「契約」を定義する。

### 7.1 改定後の `/deployed` コールバック

```jsonc
{
  "result": "success",
  "kind": "revision",
  "round": 3,
  "artifact": {
    "componentPath": "src/components/sections/izakaya-showcase.tsx",
    "commitSha": "aaaaaaaaaaaaaaaa",
    "shortSha": "aaaaaaa",
    "commitMessage": "auto: demo round 3 for <submissionId> (revision)",
    "committedAt": "2026-08-09T12:00:00Z",
    "componentSource": "<full TSX source at that commit>"
  }
}
```

### 7.2 決定論的コミットメッセージ規約

```
auto: demo round {round} for {submissionId} ({kind}){ variant={tag}}{ parent={parentRound}}
```

---

## 8. approval gates（representative approval gates）

| ゲート | 名称 | 承認者 | 解除条件 |
| --- | --- | --- | --- |
| **Gate-0** | **Pre-coding plan approval** | representative | 本 ralplan 全体の承認 |
| Gate-R1 | ストレージ契約拡張 | representative | 既存契約への影響なし確認 |
| Gate-R2 | handoff-watch 契約正直化 | representative + 運用 | 外部プロセス改修承認 |
| Gate-R3 | 復元／再利用 API | representative | 状態機関への影響範囲確認 |
| Gate-R4 | 管理 UI 運用フロー | representative | 誤操作防止確認 |
| Gate-R5 | バックフィル運用 | representative | 推定 round 運用承認 |
| Gate-R6 | 最終リリース | representative | AC-1〜AC-7 達成確認 |

---

## 9. rollback points（一覧）

| Phase | rollback 単位 | 影響範囲 | 復旧手順 |
| --- | --- | --- | --- |
| R1 | snapshots 名前空間 + ホワイトリスト 1 行 | 既存成果物無傷 | 新規ルート・メソッド削除 |
| R2 | `/deployed` の artifact 処理 | 従来 status 遷移無傷 | artifact 処理無効化 |
| R3 | restore/reuse ルート | 既存 revision フロー無傷 | ルート削除 |
| R4 | 管理 UI 履歴セクション | 既存管理機能無傷 | セクション非表示 |
| R5 | バックフィルスクリプト | git 履歴・feedback は読むだけ | lineage/snapshots 削除 |
| R6 | （検証専用） | — | 不具合時は該当 Phase に戻る |

---

## 10. supersede 宣言

- **置き換え対象**: `docs/plans/2026-08-09-revision-backup-restore-omc-realplan.md`
- **置き換え理由**: 同文書の内容を踏襲しつつ、ralplan として整合性を確保
- **扱い**: 旧文書は **superseded** とする（事実参照可・実行の「正」は本書）

---

## 11. スコープ外

- SHOWCASE_MAP の完全動的レジストリ化（兄弟計画）
- 顧客向けの「過去ラウンド切替 UI」
- handoff-watch 本体の実装（契約定義まで）
- 過去ステータスの完全監査ログ
- バリアントの視覚的グルーピング UI
- 課金・ラウンド上限の強制

---

> **文書の性質**: 本ファイルは **OMC pre-coding ralplan** であり、`coding_gate: LOCKED` の計画成果物である。
> 代表者による Gate-0 承認がない限り、本計画に基づく実装は行わない。
