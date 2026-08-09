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

  // ボディ解析（全項目任意）
  let body: {
    result?: unknown;
    kind?: unknown;
    round?: unknown;
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
  const kind: "initial" | "revision" =
    kindRaw === "revision"
      ? "revision"
      : kindRaw === "initial"
        ? "initial"
        : hasRevisionHandoff
          ? "revision"
          : "initial";

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
  const target = kind === "revision" ? "demo_revised" : "demo_deployed";
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
    if (kind === "revision") {
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
