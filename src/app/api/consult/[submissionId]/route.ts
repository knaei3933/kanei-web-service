import { NextRequest, NextResponse } from "next/server";
import { assessConsultIntake } from "@/lib/consult-quality";
import {
  readApprovalPackage,
  writeApprovalPackage,
} from "@/lib/approval-package";
import {
  readArtifact,
  writeArtifact,
  isSafeSubmissionId,
} from "@/server/submission-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  GET /api/consult/[submissionId]                                     */
/*  相談1件の状態（submission.json + approval-package.json 要約）を返す  */
/*  認証不要（review ページと同じ・submissionId が推測困難な UUID 相当） */
/* ------------------------------------------------------------------ */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const { submissionId } = await params;

  if (!isSafeSubmissionId(submissionId)) {
    return NextResponse.json(
      { ok: false, error: "無効な送信 ID です。" },
      { status: 400 }
    );
  }

  // submission.json を読み込む
  let submissionData: Record<string, unknown> | null = null;
  try {
    const raw = await readArtifact(submissionId, "submission.json");
    if (raw) {
      submissionData = JSON.parse(raw);
    }
  } catch {
    // 読み取り失敗は null と同じ扱い
  }

  if (!submissionData) {
    return NextResponse.json(
      { ok: false, error: "送信データが見つかりません。" },
      { status: 404 }
    );
  }

  // approval-package.json を読み込む（任意・未生成時は null）
  const pkg = await readApprovalPackage(submissionId);

  return NextResponse.json({
    ok: true,
    submissionId,
    submission: submissionData,
    approvalPackage: pkg
      ? {
          status: pkg.status,
          intakeQuality: pkg.intakeQuality,
          customerFacingStatus: pkg.customerFacingStatus,
          receivedAt: pkg.receivedAt,
        }
      : null,
  });
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/consult/[submissionId]                                   */
/*  顧客がフォローアップ要求を受けて送信データを更新（再提出）           */
/*  認証不要（GET と同じセキュリティモデル）                             */
/* ------------------------------------------------------------------ */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const { submissionId } = await params;

  if (!isSafeSubmissionId(submissionId)) {
    return NextResponse.json(
      { ok: false, error: "無効な送信 ID です。" },
      { status: 400 }
    );
  }

  // リクエストボディを JSON として解析
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "リクエストボディの解析に失敗しました。" },
      { status: 400 }
    );
  }

  // body はオブジェクトで、更新したいペイロードフィールドを含む
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { ok: false, error: "リクエストボディはオブジェクトである必要があります。" },
      { status: 400 }
    );
  }

  const updates = body as Record<string, unknown>;

  // 更新フィールドが少なくとも1つあることを確認
  const updateKeys = Object.keys(updates).filter((k) => k.length > 0);
  if (updateKeys.length === 0) {
    return NextResponse.json(
      { ok: false, error: "更新するフィールドがありません。" },
      { status: 400 }
    );
  }

  // 既存の submission.json を読み込む
  let submissionRaw: string | null = null;
  try {
    submissionRaw = await readArtifact(submissionId, "submission.json");
  } catch {
    // 読み取り失敗
  }

  if (!submissionRaw) {
    return NextResponse.json(
      { ok: false, error: "送信データが見つかりません。" },
      { status: 404 }
    );
  }

  let submissionData: Record<string, unknown>;
  try {
    submissionData = JSON.parse(submissionRaw);
  } catch {
    return NextResponse.json(
      { ok: false, error: "送信データの解析に失敗しました。" },
      { status: 500 }
    );
  }

  // 既存ペイロードを取り出す（submission.json の "payload" フィールド）
  const existingPayload =
    submissionData.payload !== null &&
    typeof submissionData.payload === "object" &&
    !Array.isArray(submissionData.payload)
      ? (submissionData.payload as Record<string, unknown>)
      : {};

  // ペイロードをマージ（部分更新）
  const mergedPayload: Record<string, unknown> = { ...existingPayload };
  const updatedFields: string[] = [];
  for (const key of updateKeys) {
    // submissionId 等のシステムフィールドは上書きしない
    if (
      key === "submissionId" ||
      key === "receivedAt" ||
      key === "fileCount" ||
      key === "files"
    ) {
      continue;
    }
    mergedPayload[key] = updates[key];
    updatedFields.push(key);
  }

  if (updatedFields.length === 0) {
    return NextResponse.json(
      { ok: false, error: "更新可能なフィールドがありません。" },
      { status: 400 }
    );
  }

  // 添付ファイル数を取得（品質評価で使う）
  const fileCount =
    typeof submissionData.fileCount === "number"
      ? submissionData.fileCount
      : Array.isArray(submissionData.files)
        ? (submissionData.files as unknown[]).length
        : 0;

  // 品質評価を再実行
  const newQuality = assessConsultIntake(mergedPayload, fileCount);

  // approval-package.json を読み込む（存在する場合）
  const existingPkg = await readApprovalPackage(submissionId);

  // submission.json を更新（マージ済みペイロードで上書き）
  const updatedSubmission: Record<string, unknown> = {
    ...submissionData,
    payload: mergedPayload,
    updatedAt: new Date().toISOString(),
  };

  try {
    await writeArtifact(
      submissionId,
      "submission.json",
      JSON.stringify(updatedSubmission, null, 2)
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "送信データの更新中にエラーが発生しました。しばらくしてからもう一度お試しください。",
      },
      { status: 500 }
    );
  }

  // approval-package.json を更新
  let newStatus: string | null = null;

  if (existingPkg) {
    // 品質評価を更新
    existingPkg.intakeQuality = newQuality;

    // フォローアップ（追加情報の再提出）のラウンドを記録する。
    // 顧客が needs_followup 状態で情報を更新するたびに +1 し、
    // 直近の日時とスコアを残す（繰り返しフォローアップの進捗を追跡）。
    // 状態遷移の判定より前に行い、この PATCH がフォローアップ応答か確実に判定する。
    if (existingPkg.status === "needs_followup") {
      existingPkg.followupRounds = existingPkg.followupRounds + 1;
      existingPkg.lastFollowupAt = new Date().toISOString();
      existingPkg.lastFollowupScore = newQuality.score;
    }

    // status が needs_followup のとき、品質が ready になったら自動遷移
    if (
      existingPkg.status === "needs_followup" &&
      newQuality.status === "ready"
    ) {
      existingPkg.status = "awaiting_representative_approval";
      existingPkg.customerFacingStatus = "under_internal_review";
      newStatus = existingPkg.status;
    } else {
      newStatus = existingPkg.status;
    }

    // reviewSummary の主要フィールドを更新（マージ済みペイロードから再抽出）
    const targetCustomer =
      typeof mergedPayload.targetCustomer === "string"
        ? mergedPayload.targetCustomer.trim()
        : "";
    if (targetCustomer) {
      existingPkg.reviewSummary.targetUserSummary = targetCustomer;
    }

    try {
      await writeApprovalPackage(existingPkg);
    } catch {
      // approval-package の書き込み失敗は submission.json 更新成功を覆さない
      // （品質評価の永続化だけが失敗した状態）
    }
  }

  return NextResponse.json({
    ok: true,
    submissionId,
    newScore: newQuality.score,
    newStatus,
    intakeQuality: newQuality,
    updatedFields,
  });
}
