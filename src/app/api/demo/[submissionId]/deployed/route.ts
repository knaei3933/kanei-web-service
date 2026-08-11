import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { transitionStatus } from "@/lib/approval-package";
import {
  readArtifact,
  artifactExists,
  isSafeSubmissionId,
} from "@/server/submission-storage";
import {
  sendDemoReadyEmail,
  sendRevisionCompleteEmail,
} from "@/lib/demo-feedback-loop";
import { appendRound, setCurrent } from "@/lib/revision-lineage";
import { captureSnapshot } from "@/lib/revision-snapshot";
import type { MailResult } from "@/server/mail/types";

/* ------------------------------------------------------------------ */
/*  /api/demo/[submissionId]/deployed （外部 handoff-watch 完了コールバック）*/
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    リポジトリ外の外部プロセス（kanei_demo_handoff_watch.py）が         */
/*    showcase コンポーネントの生成・登録・デプロイを完了したときに叩く    */
/*    コールバック。demo_generating を完了状態へ遷移させ、顧客へ通知      */
/*    メールを送る。                                                      */
/*                                                                      */
/*    - kind=initial （既定）: demo_generating → demo_deployed           */
/*      → sendDemoReadyEmail を送る                                      */
/*    - kind=revision       : demo_generating → demo_revised             */
/*      → sendRevisionCompleteEmail を送る                               */
/*                                                                      */
/*  失敗報告（result=failure）は現状ステータスを維持したまま 200 を返す。   */
/*    （demo_generation_failed 相当の復帰経路は別途 TODO）。               */
/*                                                                      */
/*  認証: Bearer トークンを定時間比較。                                  */
/*    DEMO_HANDOFF_CALLBACK_SECRET があればそれを使い、なければ            */
/*    ADMIN_SECRET にフォールバックする（運用に合わせてどちらかを設定）。   */
/* ------------------------------------------------------------------ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 文字列を定時間比較する（タイミング攻撃への緩和）。長さが違う場合は比較せず false。 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** コールバック用の Bearer 認証を検証する。失敗時は 401 Response、成功時は null。 */
function authorizeCallback(request: Request): Response | null {
  const candidates = [
    process.env.DEMO_HANDOFF_CALLBACK_SECRET,
    process.env.ADMIN_SECRET,
  ].filter((s): s is string => typeof s === "string" && s.length > 0);

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  const authorized =
    token.length > 0 && candidates.some((s) => safeEqual(token, s));
  if (!authorized) {
    return Response.json(
      { ok: false, error: "認証に失敗しました" },
      { status: 401 }
    );
  }
  return null;
}

/** unknown を安全に文字列として取り出す */
function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** unknown を安全にオブジェクトとして取り出す */
function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** リクエストから公開用の絶対ベース URL を組み立てる */
function absoluteBaseUrl(request: Request): string {
  const headers = request.headers;
  const host =
    headers.get("x-forwarded-host") ||
    headers.get("host") ||
    "localhost:3000";
  const isLocal =
    host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = headers.get("x-forwarded-proto") || (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
): Promise<Response> {
  const { submissionId } = await params;

  if (!isSafeSubmissionId(submissionId)) {
    return Response.json(
      { ok: false, error: "Invalid submission ID" },
      { status: 400 }
    );
  }

  const authError = authorizeCallback(request);
  if (authError) return authError;

  // ボディ解析（全項目任意・後方互換）
  let body: {
    result?: unknown;
    kind?: unknown;
    round?: unknown;
    artifact?: unknown;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // ボディが空でも既定値で処理する
  }

  const result = asString(body.result) || "success";
  const kindRaw = asString(body.kind);
  const hasRevisionHandoff = await artifactExists(
    submissionId,
    "revision-handoff.json"
  );
  const kind: "initial" | "revision" | "restore" | "reuse" =
    kindRaw === "restore"
      ? "restore"
      : kindRaw === "reuse"
        ? "reuse"
        : kindRaw === "revision"
          ? "revision"
          : kindRaw === "initial"
            ? "initial"
            : hasRevisionHandoff
              ? "revision"
              : "initial";

  // artifact を安全に取り出す（オプション・後方互換）
  const artifactObj = asObject(body.artifact);
  const artifact = {
    componentPath: asString(artifactObj.componentPath) || null,
    commitSha: asString(artifactObj.commitSha) || null,
    shortSha: asString(artifactObj.shortSha) || null,
    commitMessage: asString(artifactObj.commitMessage) || null,
    committedAt: asString(artifactObj.committedAt) || null,
    componentSource: typeof artifactObj.componentSource === "string"
      ? artifactObj.componentSource
      : null,
  };

  // 失敗報告: ステータス維持のまま 200 を返す（外部プロセスの再試行ループを止める）
  // TODO: demo_generation_failed 相当の復帰ステータスを導入し、admin が再生成できるようにする
  if (result === "failure") {
    console.warn(
      `[demo deployed] 外部 handoff-watch が失敗を報告: ${submissionId} (kind=${kind}). ステータスは維持します。`
    );
    return Response.json({
      ok: true,
      submissionId,
      recovered: false,
      note: "外部プロセスが失敗を報告しました。ステータスは demo_generating のまま維持しています。必要に応じて管理画面から再生成してください。",
    });
  }

  // 完了状態への遷移
  const target = kind === "initial" ? "demo_deployed" : "demo_revised";
  let pkg;
  try {
    pkg = await transitionStatus(submissionId, target);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "ステータス遷移に失敗しました",
      },
      { status: 409 }
    );
  }
  if (!pkg) {
    return Response.json(
      { ok: false, error: "submission が見つかりません" },
      { status: 404 }
    );
  }

  // ------------------------------------------------------------------
  //  Phase R2: lineage + snapshots 生成（artifact がある場合のみ）
  // ------------------------------------------------------------------
  //  artifact がある場合、lineage と snapshots にラウンド確定として記録する
  //  artifact が無くても後方互換で従来通り動作する
  // ------------------------------------------------------------------

  if (artifact.componentSource && artifact.commitSha && artifact.shortSha) {
    try {
      // round / parentRound / variantTag を解決（body 指定 > revision-handoff.json > default）
      let round = 0;
      let parentRound: number | null = null;
      let variantTag: string | null = null;

      const revisionHandoffRaw = await readArtifact(
        submissionId,
        "revision-handoff.json"
      );
      const revisionHandoffCopy = revisionHandoffRaw
        ? JSON.parse(revisionHandoffRaw)
        : null;

      if (kind !== "initial") {
        if (typeof body.round === "number" && body.round > 0) {
          round = body.round;
        } else if (
          revisionHandoffCopy &&
          typeof revisionHandoffCopy === "object" &&
          revisionHandoffCopy !== null &&
          typeof revisionHandoffCopy.round === "number" &&
          revisionHandoffCopy.round > 0
        ) {
          round = revisionHandoffCopy.round;
        }
        round = round > 0 ? round : 1;

        if (
          revisionHandoffCopy &&
          typeof revisionHandoffCopy === "object" &&
          revisionHandoffCopy !== null &&
          typeof revisionHandoffCopy.parentRound === "number"
        ) {
          parentRound = revisionHandoffCopy.parentRound;
        }
        if (
          revisionHandoffCopy &&
          typeof revisionHandoffCopy === "object" &&
          revisionHandoffCopy !== null &&
          typeof revisionHandoffCopy.variantTag === "string"
        ) {
          variantTag = revisionHandoffCopy.variantTag;
        }
      }

      const demoFeedbackRaw = await readArtifact(
        submissionId,
        "demo-feedback.json"
      );
      let feedbackCopy = null;
      if (demoFeedbackRaw && kind === "revision") {
        try {
          const demoFeedback = JSON.parse(demoFeedbackRaw) as {
            history?: Array<{ round: number; feedback: unknown }>;
          };
          // 現在のラウンドに対応する feedback を取得
          if (Array.isArray(demoFeedback.history)) {
            const currentFeedback = demoFeedback.history.find(
              (h) => h.round === round
            );
            if (currentFeedback) {
              feedbackCopy = currentFeedback.feedback;
            }
          }
        } catch {
          // パース失敗は無視
        }
      }

      // snapshotKey を生成
      const snapshotKey = `round-${round}`;

      // lineage にラウンドを追加
      await appendRound(submissionId, {
        round,
        kind,
        commitSha: artifact.commitSha,
        shortSha: artifact.shortSha,
        commitMessage: artifact.commitMessage,
        committedAt: artifact.committedAt,
        hasComponentSource: true,
        status: pkg.status,
        customerFacingStatus: pkg.customerFacingStatus,
        feedback: feedbackCopy as {
          rating: number;
          comment: string;
          submittedAt: string;
        } | null,
        revisionPrompt: revisionHandoffCopy &&
          typeof revisionHandoffCopy === "object" &&
          revisionHandoffCopy !== null &&
          "revisionPrompt" in revisionHandoffCopy
          ? (revisionHandoffCopy.revisionPrompt as string)
          : null,
        parentRound,
        variantTag,
        targetComponent: kind === "initial"
          ? typeof artifactObj.targetComponent === "string"
            ? artifactObj.targetComponent
            : null
          : undefined,
        componentPath:
          kind === "initial"
            ? artifact.componentPath
            : artifact.componentPath ?? undefined,
      });

      // snapshot を保存
      await captureSnapshot(submissionId, snapshotKey, {
        round,
        kind,
        componentPath: artifact.componentPath,
        componentSource: artifact.componentSource,
        commitSha: artifact.commitSha,
        revisionHandoffCopy,
        feedbackCopy,
        approvalPackageStatusCopy: pkg.status,
      });

      console.log(
        `[demo deployed] lineage + snapshots を生成: ${submissionId} round=${round} kind=${kind}`
      );
    } catch (err) {
      // lineage/snapshots 生成に失敗してもメインフローは止めない（エラーをログ）
      console.error(
        `[demo deployed] lineage/snapshots 生成に失敗: ${submissionId}`,
        err
      );
    }
  } else {
    // artifact がない場合、lineage にプレースホルダを残す（hasComponentSource:false）
    try {
      let round = 0;
      let parentRound: number | null = null;
      let variantTag: string | null = null;
      if (kind !== "initial") {
        if (typeof body.round === "number" && body.round > 0) {
          round = body.round;
        } else {
          const handoffRaw = await readArtifact(
            submissionId,
            "revision-handoff.json"
          );
          if (handoffRaw) {
            try {
              const handoff = JSON.parse(handoffRaw) as {
                round?: unknown;
                parentRound?: unknown;
                variantTag?: unknown;
              };
              if (typeof handoff.round === "number" && handoff.round > 0) {
                round = handoff.round;
              }
              if (typeof handoff.parentRound === "number") {
                parentRound = handoff.parentRound;
              }
              if (typeof handoff.variantTag === "string") {
                variantTag = handoff.variantTag;
              }
            } catch {
              // パース失敗は無視
            }
          }
          round = round > 0 ? round : 1;
        }
      }

      await appendRound(submissionId, {
        round,
        kind,
        parentRound,
        variantTag,
        componentPath: artifact.componentPath ?? undefined,
        hasComponentSource: false,
        status: pkg.status,
        customerFacingStatus: pkg.customerFacingStatus,
        notes: "artifact 未受信・componentSource なし",
      });
    } catch (err) {
      // プレースホルダ生成失敗もメインフローは止めない
      console.error(
        `[demo deployed] lineage プレースホルダ生成に失敗: ${submissionId}`,
        err
      );
    }
  }

  // 顧客情報を取得して通知メールを送る
  let mailResult: MailResult | null = null;
  const submissionRaw = await readArtifact(submissionId, "submission.json");
  const payload = submissionRaw
    ? asObject(JSON.parse(submissionRaw)).payload
    : null;
  const p = asObject(payload);
  const customerEmail = asString(p.email) || asString(p.contactEmail);
  const customerName = asString(p.name);
  const companyName =
    asString(p.companyName) || asString(p.enterpriseName) || "ご依頼主様";

  if (customerEmail.length > 0) {
    const demoUrl = `${absoluteBaseUrl(request)}/demo/${submissionId}`;
    if (kind !== "initial") {
      // round は body 指定 > revision-handoff.json > 1
      let round =
        typeof body.round === "number" && body.round > 0
          ? body.round
          : undefined;
      if (!round) {
        const handoffRaw = await readArtifact(
          submissionId,
          "revision-handoff.json"
        );
        if (handoffRaw) {
          try {
            const handoff = JSON.parse(handoffRaw) as { round?: unknown };
            if (typeof handoff.round === "number" && handoff.round > 0) {
              round = handoff.round;
            }
          } catch {
            // パース失敗は無視
          }
        }
      }
      mailResult = await sendRevisionCompleteEmail(
        submissionId,
        customerEmail,
        customerName || undefined,
        companyName,
        round ?? 1
      );
    } else {
      mailResult = await sendDemoReadyEmail(
        submissionId,
        customerEmail,
        customerName || undefined,
        companyName,
        demoUrl
      );
    }
  } else {
    mailResult = {
      provider: "log",
      accepted: [],
      messageId: null,
      status: "error",
      error: "顧客メールアドレスがないため、デモ完成通知を送信しませんでした。",
    };
  }

  return Response.json({
    ok: true,
    submissionId,
    status: pkg.status,
    customerFacingStatus: pkg.customerFacingStatus,
    kind,
    mailResult,
  });
}
