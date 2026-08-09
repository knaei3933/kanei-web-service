/* ------------------------------------------------------------------ */
/*  Phase R2 lineage書き込み基盤検証スクリプト                            */
/* ------------------------------------------------------------------ */
/*  ralplan Phase R2 の検証ステップを実行する                              */
/*  - artifact ありで lineage+snapshots 生成                               */
/*  - artifact 無しでも後方互換                                          */
/* ------------------------------------------------------------------ */

import { readLineage, appendRound, lineageExists } from "../lib/revision-lineage";
import { readRevisionSnapshot, captureSnapshot } from "../lib/revision-snapshot";
import { writeArtifact } from "../server/submission-storage";

// テスト用 submissionId
const TEST_SUBMISSION_ID = "test-phase-r2-verification";

async function runVerification() {
  console.log("=== Phase R2 lineage書き込み基盤検証 ===\n");

  // 前提: revision-handoff.json を作成（round 解決用）
  console.log("0. 前提条件: revision-handoff.json を作成");
  await writeArtifact(
    TEST_SUBMISSION_ID,
    "revision-handoff.json",
    JSON.stringify({
      schemaVersion: "1.0.0",
      submissionId: TEST_SUBMISSION_ID,
      round: 1,
      revisionPrompt: "テスト修正指示",
    }, null, 2)
  );
  console.log("   ✓ revision-handoff.json 作成\n");

  // 検証1: artifact なし（プレースホルダ） - round 0
  console.log("1. artifact なしで lineage プレースホルダ生成 (round 0)");
  const lineage1 = await appendRound(TEST_SUBMISSION_ID, {
    round: 0,
    kind: "initial",
    hasComponentSource: false,
    status: "demo_deployed",
    customerFacingStatus: "demo_ready",
    notes: "artifact 未受信・componentSource なし",
  });
  console.log(`   rounds.length: ${lineage1.rounds.length}`);
  console.log(`   rounds 最後.round: ${lineage1.rounds[lineage1.rounds.length - 1]?.round}`);
  console.log(`   rounds 最後.hasComponentSource: ${lineage1.rounds[lineage1.rounds.length - 1]?.hasComponentSource}`);
  console.log(`   rounds 最後.notes: ${lineage1.rounds[lineage1.rounds.length - 1]?.notes}`);
  if (lineage1.rounds[lineage1.rounds.length - 1]?.round !== 0) {
    throw new Error("FAIL: round は 0 であるべきです");
  }
  if (lineage1.rounds[lineage1.rounds.length - 1]?.hasComponentSource !== false) {
    throw new Error("FAIL: hasComponentSource は false であるべきです");
  }
  console.log("   ✓ パス\n");

  // 検証2: artifact あり（完全な lineage + snapshots） - round 1
  console.log("2. artifact ありで lineage + snapshots 生成 (round 1)");
  const testArtifact = {
    componentPath: "src/components/sections/test-showcase.tsx",
    commitSha: "abc1234567890abcdef1234567890abcdef12345",
    shortSha: "abc1234",
    commitMessage: "auto: demo round 1 for test (revision)",
    committedAt: "2026-08-09T12:00:00Z",
    componentSource: "<test TSX source>\nexport default function Test() {\n  return <div>Test</div>;\n}",
  };

  const lineage2 = await appendRound(TEST_SUBMISSION_ID, {
    round: 1,
    kind: "revision",
    hasComponentSource: true,
    commitSha: testArtifact.commitSha,
    shortSha: testArtifact.shortSha,
    commitMessage: testArtifact.commitMessage,
    committedAt: testArtifact.committedAt,
    status: "demo_revised",
    customerFacingStatus: "demo_ready",
    feedback: {
      rating: 4,
      comment: "テストフィードバック",
      submittedAt: "2026-08-09T11:00:00Z",
    },
    revisionPrompt: "テスト修正指示",
    targetComponent: "test-showcase",
    componentPath: testArtifact.componentPath,
  });

  const lastRoundIdx = lineage2.rounds.length - 1;
  console.log(`   rounds.length: ${lineage2.rounds.length}`);
  console.log(`   rounds[${lastRoundIdx}].round: ${lineage2.rounds[lastRoundIdx]?.round}`);
  console.log(`   rounds[${lastRoundIdx}].kind: ${lineage2.rounds[lastRoundIdx]?.kind}`);
  console.log(`   rounds[${lastRoundIdx}].hasComponentSource: ${lineage2.rounds[lastRoundIdx]?.hasComponentSource}`);
  console.log(`   rounds[${lastRoundIdx}].commitSha: ${lineage2.rounds[lastRoundIdx]?.commitSha}`);
  console.log(`   rounds[${lastRoundIdx}].shortSha: ${lineage2.rounds[lastRoundIdx]?.shortSha}`);
  console.log(`   rounds[${lastRoundIdx}].feedback.rating: ${lineage2.rounds[lastRoundIdx]?.feedback?.rating}`);

  if (lineage2.rounds[lastRoundIdx]?.round !== 1) {
    throw new Error("FAIL: round は 1 であるべきです");
  }
  if (lineage2.rounds[lastRoundIdx]?.hasComponentSource !== true) {
    throw new Error("FAIL: hasComponentSource は true であるべきです");
  }
  if (lineage2.rounds[lastRoundIdx]?.commitSha !== testArtifact.commitSha) {
    throw new Error("FAIL: commitSha が一致しません");
  }
  console.log("   ✓ lineage パス");

  // snapshot を保存
  await captureSnapshot(TEST_SUBMISSION_ID, "round-1", {
    round: 1,
    kind: "revision",
    componentPath: testArtifact.componentPath,
    componentSource: testArtifact.componentSource,
    commitSha: testArtifact.commitSha,
    revisionHandoffCopy: null,
    feedbackCopy: null,
    approvalPackageStatusCopy: "demo_revised",
  });

  // snapshot 確認
  const snapshot = await readRevisionSnapshot(TEST_SUBMISSION_ID, "round-1");
  console.log(`   snapshot 存在: ${snapshot !== null}`);
  if (!snapshot) {
    throw new Error("FAIL: snapshot が存在しません");
  }
  console.log(`   snapshot.schemaVersion: ${snapshot.schemaVersion}`);
  console.log(`   snapshot.round: ${snapshot.round}`);
  console.log(`   snapshot.componentPath: ${snapshot.componentPath}`);
  console.log(`   snapshot.componentSource 長: ${snapshot.componentSource.length} 文字`);
  if (snapshot.componentSource !== testArtifact.componentSource) {
    throw new Error("FAIL: componentSource が一致しません");
  }
  console.log("   ✓ snapshot パス\n");

  // 検証3: lineage の継続性（isCurrent 付け替え）
  console.log("3. lineage の継続性（isCurrent 付け替え）");
  const currentRound = lineage2.currentRound;
  console.log(`   currentRound: ${currentRound}`);
  // 最後から2番目のラウンドは isCurrent=false、最後は isCurrent=true
  const prevIdx = lastRoundIdx - 1;
  if (prevIdx >= 0) {
    console.log(`   rounds[${prevIdx}].isCurrent: ${lineage2.rounds[prevIdx]?.isCurrent}`);
    if (lineage2.rounds[prevIdx]?.isCurrent !== false) {
      throw new Error("FAIL: rounds[prevIdx].isCurrent は false であるべきです");
    }
  }
  console.log(`   rounds[${lastRoundIdx}].isCurrent: ${lineage2.rounds[lastRoundIdx]?.isCurrent}`);
  if (lineage2.rounds[lastRoundIdx]?.isCurrent !== true) {
    throw new Error("FAIL: rounds[lastRoundIdx].isCurrent は true であるべきです");
  }
  console.log("   ✓ パス\n");

  // 検証4: lineageExists
  console.log("4. lineageExists");
  const exists = await lineageExists(TEST_SUBMISSION_ID);
  console.log(`   lineageExists: ${exists}`);
  if (exists !== true) {
    throw new Error("FAIL: lineageExists は true であるべきです");
  }
  console.log("   ✓ パス\n");

  // 検証5: readLineage
  console.log("5. readLineage（再読み込み）");
  const reloaded = await readLineage(TEST_SUBMISSION_ID);
  console.log(`   reloaded.rounds.length: ${reloaded.rounds.length}`);
  console.log(`   reloaded.currentRound: ${reloaded.currentRound}`);
  console.log(`   reloaded.submissionId: ${reloaded.submissionId}`);
  if (reloaded.rounds.length < 2) {
    throw new Error("FAIL: 再読み込み後の rounds.length は 2 以上であるべきです");
  }
  if (reloaded.submissionId !== TEST_SUBMISSION_ID) {
    throw new Error("FAIL: submissionId が一致しません");
  }
  console.log("   ✓ パス\n");

  console.log("=== 全検証パス ===");
  console.log("\nクリーンアップ: テストデータは data/consult-submissions/test-phase-r2-verification/ に残っています");
}

runVerification().catch(err => {
  console.error("検証失敗:", err);
  process.exit(1);
});
