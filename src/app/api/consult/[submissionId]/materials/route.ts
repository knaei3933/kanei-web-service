import { NextRequest, NextResponse } from "next/server";
import {
  readApprovalPackage,
  writeApprovalPackage,
} from "@/lib/approval-package";
import {
  readArtifact,
  writeArtifact,
  writeAttachment,
  isSafeSubmissionId,
} from "@/server/submission-storage";

/* ------------------------------------------------------------------ */
/*  /api/consult/[submissionId]/materials （本制作前 追加素材アップロード）*/
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    顧客が本制作前ヒアリングの回答と一緒に、追加の素材（写真・資料等）  */
/*    をアップロードするためのエンドポイント。既存の consult 添付とは      */
/*    別ルートだが、同じ保存アダプタ（writeAttachment）と submission.json */
/*    の files/fileCount を使うので、レビュー時に一括して参照できる。     */
/*                                                                      */
/*  認証: 不要（submissionId が推測困難な UUID 相当であることを前提。     */
/*        re-submission PATCH や demo feedback と同じセキュリティモデル）。*/
/*                                                                      */
/*  Body: multipart/form-data（ファイルフィールドを複数受け付ける）。     */
/*  成果物: 既存 submission.json の files に追記・fileCount 更新。         */
/* ------------------------------------------------------------------ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 1 件の送信あたりの追加素材を含めたファイル総数の上限（consult と同じ運用） */
const MAX_TOTAL_FILES = 20;

/** unknown を安全にオブジェクトとして取り出す */
function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * アップロードされたファイル名をディスク安全にサニタイズする。
 * （consult/route.ts の sanitizeFilename と同じ規則・多バイト文字は保持）
 */
function sanitizeFilename(rawName: string): string {
  const base = (rawName.split(/[/\\]/).pop() ?? rawName) || "file";
  const cleaned = base
    .replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^[\s.-]+/, "")
    .replace(/[\s.]+$/, "")
    .trim();
  return cleaned.length > 0 ? cleaned : "file";
}

export async function POST(
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

  const existingFilesRaw = Array.isArray(submissionData.files)
    ? (submissionData.files as unknown[])
    : [];
  // 既存の添付総数（追加素材の連番 prefix を衝突させないため）
  let index = existingFilesRaw.length;

  // multipart をパース
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "フォームデータの解析に失敗しました。" },
      { status: 400 }
    );
  }

  interface SavedFileMeta {
    field: string;
    originalName: string;
    savedName: string;
    size: number;
    type: string;
  }
  const savedFiles: SavedFileMeta[] = [];

  try {
    for (const [field, value] of formData.entries()) {
      // File 以外は無視
      if (typeof value === "string") continue;
      if (typeof (value as File).arrayBuffer !== "function") continue;

      if (existingFilesRaw.length + savedFiles.length >= MAX_TOTAL_FILES) {
        return NextResponse.json(
          {
            ok: false,
            error: `ファイル数が多すぎます（合計 ${MAX_TOTAL_FILES} 件まで）。`,
          },
          { status: 413 }
        );
      }

      const file = value as File;
      const originalName = file.name || `material-${savedFiles.length + 1}`;
      const safeName = sanitizeFilename(originalName);
      index += 1;
      const seq = String(index).padStart(2, "0");
      const savedName = `${seq}-${safeName}`;

      const arrayBuffer = await file.arrayBuffer();
      await writeAttachment(
        submissionId,
        savedName,
        new Uint8Array(arrayBuffer),
        file.type
      );

      savedFiles.push({
        field,
        originalName,
        savedName,
        size: file.size,
        type: file.type,
      });
    }
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "ファイルの保存中にエラーが発生しました。しばらくしてからもう一度お試しください。",
      },
      { status: 500 }
    );
  }

  if (savedFiles.length === 0) {
    return NextResponse.json(
      { ok: false, error: "アップロードされたファイルがありません。" },
      { status: 400 }
    );
  }

  // submission.json を更新（files に追記・fileCount 更新）
  const mergedFiles = [...existingFilesRaw, ...savedFiles];
  const updatedSubmission: Record<string, unknown> = {
    ...submissionData,
    files: mergedFiles,
    fileCount: mergedFiles.length,
    materialsUpdatedAt: new Date().toISOString(),
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

  // ヒアリング進行中なら additionalMaterialCount を更新（準備度評価で使う）
  if (savedFiles.length > 0) {
    const pkg = await readApprovalPackage(submissionId);
    if (pkg && pkg.preProductionInterview && pkg.status === "pre_production_interview") {
      pkg.preProductionInterview.additionalMaterialCount =
        (pkg.preProductionInterview.additionalMaterialCount ?? 0) +
        savedFiles.length;
      try {
        await writeApprovalPackage(pkg);
      } catch {
        // pkg の更新失敗は submission.json の保存成功を覆さない
      }
    }
  }

  return NextResponse.json({
    ok: true,
    submissionId,
    savedFiles,
    savedCount: savedFiles.length,
    fileCount: mergedFiles.length,
  });
}
