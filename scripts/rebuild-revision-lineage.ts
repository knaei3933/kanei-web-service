#!/usr/bin/env tsx
/* ------------------------------------------------------------------ */
/*  Revision Lineage Rebuild Script (Phase R5)                          */
/* ------------------------------------------------------------------ */
/*  既存の showcase コンポーネントの git 履歴から                     */
/*  revision-lineage.json と snapshots を再構築するバックフィルツール    */
/*                                                                      */
/*  使い方:                                                              */
/*    npx tsx scripts/rebuild-revision-lineage.ts <submissionId>         */
/*                                                                      */
/*  機能:                                                              */
/*    - git 履歴から showcase コミットを解析                              */
/*    - 決定論的コミットメッセージ規約を解析                             */
/*    - componentSource を git show で取得                               */
/*    - lineage と snapshots を生成                                     */
/*    - 推定ラウンドに notes: "backfilled-inferred" を付与              */
/* ------------------------------------------------------------------ */

import { execSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

/* ------------------------------------------------------------------ */
/*  型定義                                                              */
/* ------------------------------------------------------------------ */

interface CommitInfo {
  sha: string;
  shortSha: string;
  message: string;
  authorDate: string;
  committedAt: string;
}

interface ParsedCommit {
  round: number;
  kind: "initial" | "revision" | "restore" | "reuse";
  variantTag: string | null;
  parentRound: number | null;
  submissionId: string;
  componentPath: string;
}

interface SnapshotData {
  round: number;
  kind: string;
  componentPath: string;
  componentSource: string;
  commitSha: string;
  revisionHandoffCopy: unknown;
  feedbackCopy: unknown;
  approvalPackageStatusCopy: string;
}

/* ------------------------------------------------------------------ */
/*  定数                                                                */
/* ------------------------------------------------------------------ */

/** 決定論的コミットメッセージ規約 */
const COMMIT_MESSAGE_PATTERN =
  /^auto:\s*demo\s+round\s+(\d+)\s+for\s+(\S+?)\s+\((\w+)\)(?:\s+variant=(\S+))?(?:\s+parent=(\d+))?/i;

/** ローカル開発用ルート */
const LOCAL_ROOT = join(process.cwd(), "data", "consult-submissions");

/* ------------------------------------------------------------------ */
/*  Git ヘルパ                                                         */
/* ------------------------------------------------------------------ */

/** git log を取得して showcase コミットを抽出 */
function getShowcaseCommits(submissionId: string, componentPath: string): CommitInfo[] {
  const pattern = new RegExp(`auto: demo round \\d+ for ${submissionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');

  const output = execSync(
    `git log --all --oneline --grep="${pattern}" -- "${componentPath}"`,
    { encoding: "utf-8", cwd: process.cwd() }
  ).trim();

  if (!output) return [];

  const lines = output.split("\n").reverse(); // 古い順にする
  const commits: CommitInfo[] = [];

  for (const line of lines) {
    const match = line.match(/^([a-f0-9]+)\s+(.+)$/);
    if (!match) continue;

    const [, sha, message] = match;
    const shortSha = sha.slice(0, 7);

    try {
      const authorDate = execSync(`git log -1 --format=%aI ${sha}`, { encoding: "utf-8" }).trim();
      const committedAt = execSync(`git log -1 --format=%cI ${sha}`, { encoding: "utf-8" }).trim();

      commits.push({ sha, shortSha, message, authorDate, committedAt });
    } catch {
      // 日時取得失敗はスキップ
      continue;
    }
  }

  return commits;
}

/** コミットメッセージを解析 */
function parseCommitMessage(message: string): ParsedCommit | null {
  const match = message.match(COMMIT_MESSAGE_PATTERN);
  if (!match) return null;

  const [, roundStr, submissionId, kindStr, variantTagStr, parentRoundStr] = match;

  const round = parseInt(roundStr, 10);
  const kind = kindStr.toLowerCase() as "initial" | "revision" | "restore" | "reuse";
  const variantTag = variantTagStr || null;
  const parentRound = parentRoundStr ? parseInt(parentRoundStr, 10) : null;

  // componentPath を推定（現状は簡易的に固定）
  // TODO: submissionId から targetComponent を推定して動的に解決
  const componentPath = "src/components/sections/showcase.tsx";

  return { round, kind, variantTag, parentRound, submissionId, componentPath };
}

/** コミットから componentSource を取得 */
function getComponentSource(sha: string, componentPath: string): string {
  try {
    return execSync(`git show ${sha}:${componentPath}`, { encoding: "utf-8" });
  } catch {
    throw new Error(`Failed to get componentSource from ${sha}:${componentPath}`);
  }
}

/* ------------------------------------------------------------------ */
/*  ストレージヘルパ                                                     */
/* ------------------------------------------------------------------ */

/** submission ディレクトリを作成 */
async function ensureSubmissionDir(submissionId: string): Promise<void> {
  const dir = join(LOCAL_ROOT, submissionId);
  await mkdir(dir, { recursive: true });
  await mkdir(join(dir, "snapshots"), { recursive: true });
}

/** lineage を書き込む */
async function writeLineage(submissionId: string, lineage: unknown): Promise<void> {
  const path = join(LOCAL_ROOT, submissionId, "revision-lineage.json");
  await writeFile(path, JSON.stringify(lineage, null, 2), "utf-8");
}

/** snapshot を書き込む */
async function writeSnapshot(submissionId: string, key: string, snapshot: unknown): Promise<void> {
  const path = join(LOCAL_ROOT, submissionId, "snapshots", `${key}.json`);
  await writeFile(path, JSON.stringify(snapshot, null, 2), "utf-8");
}

/** 既存の approvalPackage.json を読み込む */
async function readApprovalPackage(submissionId: string): Promise<{ status: string; customerFacingStatus?: string | null } | null> {
  try {
    const path = join(LOCAL_ROOT, submissionId, "approval-package.json");
    const content = await readFile(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  メイン処理                                                          */
/* ------------------------------------------------------------------ */

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("使い方: npx tsx scripts/rebuild-revision-lineage.ts <submissionId>");
    process.exit(1);
  }

  const submissionId = args[0];
  console.log(`\n🔄 ${submissionId} のリビジョン履歴を再構築します...\n`);

  // submission ディレクトリを保証
  await ensureSubmissionDir(submissionId);

  // 既存の approvalPackage を読み込む
  const approvalPkg = await readApprovalPackage(submissionId);
  const status = approvalPkg?.status ?? "unknown";
  const customerFacingStatus = approvalPkg?.customerFacingStatus ?? null;

  // showcase コミットを取得
  // TODO: submissionId から targetComponent を推定して動的に componentPath を解決
  const componentPath = "src/components/sections/showcase.tsx";
  const commits = getShowcaseCommits(submissionId, componentPath);

  if (commits.length === 0) {
    console.log(`⚠️  ${submissionId} の showcase コミットが見つかりませんでした。`);
    console.log(`   コミットメッセージ規約に従うコミットがないか、componentPath が間違っています。`);
    process.exit(0);
  }

  console.log(`📋 ${commits.length} 件のコミットを検出しました。\n`);

  // lineage を初期化
  let targetComponent: string | null = null;
  let maxRound = 0;

  const lineage = {
    schemaVersion: "1.0.0",
    submissionId,
    targetComponent: null as string | null,
    componentPath: null as string | null,
    currentRound: -1,
    rounds: [] as Array<{
      round: number;
      kind: string;
      label: string;
      snapshotKey: string;
      hasComponentSource: boolean;
      commitSha: string;
      shortSha: string;
      commitMessage: string;
      committedAt: string;
      capturedAt: string;
      status: string;
      customerFacingStatus: string | null;
      parentRound: number | null;
      variantTag: string | null;
      feedback: unknown;
      revisionPrompt: string | null;
      isCurrent: boolean;
      notes: string;
    }>,
  };

  // 各コミットを処理
  for (const commit of commits) {
    const parsed = parseCommitMessage(commit.message);
    if (!parsed) {
      console.log(`⚠️  コミットメッセージ解析スキップ: ${commit.shortSha} ${commit.message}`);
      continue;
    }

    console.log(`  Round ${parsed.round}: ${parsed.kind} (${commit.shortSha})`);

    const snapshotKey = parsed.variantTag
      ? `round-${parsed.round}-${parsed.variantTag}`
      : `round-${parsed.round}`;

    // componentSource を取得
    let componentSource: string;
    try {
      componentSource = getComponentSource(commit.sha, componentPath);
    } catch (e) {
      console.log(`    ⚠️  componentSource 取得失敗: ${e instanceof Error ? e.message : String(e)}`);
      componentSource = `// componentSource 取得失敗\n// commit: ${commit.sha}`;
    }

    // snapshot データを構築
    const snapshot: SnapshotData = {
      round: parsed.round,
      kind: parsed.kind,
      componentPath,
      componentSource,
      commitSha: commit.sha,
      revisionHandoffCopy: null,
      feedbackCopy: null,
      approvalPackageStatusCopy: status,
    };

    // snapshot を保存
    await writeSnapshot(submissionId, snapshotKey, snapshot);

    // lineage エントリを構築
    const label =
      parsed.kind === "initial"
        ? "初回生成"
        : parsed.kind === "revision"
          ? `修正 ${parsed.round} 回目`
          : parsed.kind === "restore"
            ? `復元 (round ${parsed.round})`
            : `再利用 (round ${parsed.round})`;

    const roundEntry = {
      round: parsed.round,
      kind: parsed.kind,
      label,
      snapshotKey,
      hasComponentSource: true,
      commitSha: commit.sha,
      shortSha: commit.shortSha,
      commitMessage: commit.message,
      committedAt: commit.committedAt,
      capturedAt: new Date().toISOString(),
      status,
      customerFacingStatus,
      parentRound: parsed.parentRound,
      variantTag: parsed.variantTag,
      feedback: null,
      revisionPrompt: null,
      isCurrent: false, // 最後に設定
      notes: "backfilled-inferred",
    };

    lineage.rounds.push(roundEntry);

    // 初回のみ targetComponent と componentPath を設定
    if (parsed.kind === "initial") {
      targetComponent = "showcase"; // TODO: 推定または入力
      lineage.targetComponent = targetComponent;
      lineage.componentPath = componentPath;
    }

    maxRound = Math.max(maxRound, parsed.round);
  }

  // 現行ラウンドを設定（最後のラウンド）
  if (lineage.rounds.length > 0) {
    const lastRound = lineage.rounds[lineage.rounds.length - 1];
    lastRound.isCurrent = true;
    lineage.currentRound = lastRound.round;
  }

  // lineage を保存
  await writeLineage(submissionId, lineage);

  console.log(`\n✅ ${submissionId} のリビジョン履歴を再構築しました。`);
  console.log(`   - ラウンド数: ${lineage.rounds.length}`);
  console.log(`   - 現行ラウンド: ${lineage.currentRound}`);
  console.log(`   - componentPath: ${lineage.componentPath}`);
}

main().catch((err) => {
  console.error("エラーが発生しました:", err);
  process.exit(1);
});
