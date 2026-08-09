/* ------------------------------------------------------------------ */
/*  Phase R1 ストレージ基盤検証スクリプト                                */
/* ------------------------------------------------------------------ */
/*  ralplan Phase R1 の検証ステップを実行する                              */
/*  - isArtifactFileName("revision-lineage.json") === true              */
/*  - isSafeSnapshotKey の正否判定                                       */
/*  - local モードで writeSnapshot/readSnapshot が読み書きできる          */
/* ------------------------------------------------------------------ */

import { writeSnapshot, readSnapshot, snapshotExists, isSafeSnapshotKey, isArtifactFileName } from "../server/submission-storage";

// テスト用 submissionId と key
const TEST_SUBMISSION_ID = "test-phase-r1-verification";
const TEST_KEY = "round-0";

async function runVerification() {
  console.log("=== Phase R1 ストレージ基盤検証 ===\n");

  // 検証1: isArtifactFileName("revision-lineage.json") === true
  console.log("1. isArtifactFileName(\"revision-lineage.json\")");
  const result1 = isArtifactFileName("revision-lineage.json");
  console.log(`   結果: ${result1}`);
  if (result1 !== true) {
    throw new Error("FAIL: revision-lineage.json がホワイトリストに含まれていません");
  }
  console.log("   ✓ パス\n");

  // 検証2: isSafeSnapshotKey の正否判定
  console.log("2. isSafeSnapshotKey の正否判定");
  const validKeys = ["round-0", "round-9-A", "round-5-B2"];
  const invalidKeys = ["round-0/..", "round 0", "../x", ".secret", "", "round-"];

  for (const key of validKeys) {
    const result = isSafeSnapshotKey(key);
    console.log(`   "${key}" => ${result}`);
    if (result !== true) {
      throw new Error(`FAIL: "${key}" は有効なキーであるべきです`);
    }
  }

  for (const key of invalidKeys) {
    const result = isSafeSnapshotKey(key);
    console.log(`   "${key}" => ${result}`);
    if (result !== false) {
      throw new Error(`FAIL: "${key}" は無効なキーであるべきです`);
    }
  }
  console.log("   ✓ パス\n");

  // 検証3: local モードで writeSnapshot/readSnapshot が読み書きできる
  console.log("3. local モードで writeSnapshot/readSnapshot が読み書きできる");
  const testContent = JSON.stringify({
    schemaVersion: "1.0.0",
    submissionId: TEST_SUBMISSION_ID,
    snapshotKey: TEST_KEY,
    round: 0,
    kind: "initial",
    componentSource: "<test source>",
  }, null, 2);

  // 書き込み
  console.log(`   "${TEST_KEY}" を書き込み中...`);
  await writeSnapshot(TEST_SUBMISSION_ID, TEST_KEY, testContent);
  console.log("   ✓ 書き込み成功");

  // 存在確認
  const exists = await snapshotExists(TEST_SUBMISSION_ID, TEST_KEY);
  console.log(`   snapshotExists => ${exists}`);
  if (exists !== true) {
    throw new Error("FAIL: snapshotExists が true を返すべきです");
  }
  console.log("   ✓ 存在確認成功");

  // 読み込み
  console.log(`   "${TEST_KEY}" を読み込み中...`);
  const readContent = await readSnapshot(TEST_SUBMISSION_ID, TEST_KEY);
  if (readContent === null) {
    throw new Error("FAIL: readSnapshot が null を返しました");
  }
  if (readContent !== testContent) {
    throw new Error("FAIL: 読み込んだ内容が書き込んだ内容と一致しません");
  }
  console.log("   ✓ 読み込み成功");

  // 不在キーの読み込み
  const notExists = await readSnapshot(TEST_SUBMISSION_ID, "round-999");
  if (notExists !== null) {
    throw new Error("FAIL: 不在キーの読み込みは null を返すべきです");
  }
  console.log("   ✓ 不在キーで null を返す\n");

  console.log("=== 全検証パス ===");
  console.log("\nクリーンアップ: テストデータは data/consult-submissions/test-phase-r1-verification/ に残っています");
}

runVerification().catch(err => {
  console.error("検証失敗:", err);
  process.exit(1);
});
