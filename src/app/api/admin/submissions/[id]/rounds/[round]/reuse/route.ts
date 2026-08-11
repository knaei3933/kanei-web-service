import { timingSafeEqual } from "node:crypto";
import {
  readApprovalPackage,
  transitionStatus,
  writeApprovalPackage,
} from "@/lib/approval-package";
import {
  readArtifact,
  writeArtifact,
} from "@/server/submission-storage";
import {
  readLineage,
  appendRound,
} from "@/lib/revision-lineage";
import { readRevisionSnapshot } from "@/lib/revision-snapshot";

/* ------------------------------------------------------------------ */
/*  POST /api/admin/submissions/[id]/rounds/[round]/reuse — 再利用      */
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    過去ラウンド N を基点にして新ラウンド（バリアント）を生成する。    */
/*    ボディから revisionPrompt と variantTag を受け取り、                */
/*    snapshots/round-N.json から componentSource を取得して               */
/*    再利用用 revision-handoff.json を生成し lineage に記録する。         */
/*    最後に demo_revision_ready に遷移させる。                           */
/*                                                                      */
/*  認証:                                                              */
/*    Authorization: Bearer *** を定時間比較で検証。         */
/*    ADMIN_SECRET 未設定・不一致時は 401。                              */
/*                                                                      */
/*  409 競合:                                                          */
/*    - snapshot が存在しない（componentSource 欠損）                   */
/*    - lineage に指定ラウンドが存在しない                               */
/* ------------------------------------------------------------------ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 文字列を定時間比較 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** 管理者認証 */
function authorizeAdmin(request: Request): Response | null {
  const secret = process.env.ADMIN_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  const authorized =
    typeof secret === "string" && secret.length > 0 && token.length > 0
      ? safeEqual(token, secret)
      : false;
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; round: string }> }
): Promise<Response> {
  const authError = authorizeAdmin(request);
  if (authError) return authError;

  const { id: submissionId, round: roundStr } = await params;

  // round をパース
  const round = Number.parseInt(roundStr, 10);
  if (Number.isNaN(round) || round < 0) {
    return Response.json(
      { ok: false, error: "無効なラウンド番号です" },
      { status: 400 }
    );
  }

  // ボディを解析
  let body: {
    revisionPrompt?: unknown;
    variantTag?: unknown;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { ok: false, error: "無効なリクエストボディです" },
      { status: 400 }
    );
  }

  const revisionPrompt = asString(body.revisionPrompt);
  const variantTag = asString(body.variantTag);

  if (revisionPrompt.length === 0) {
    return Response.json(
      { ok: false, error: "revisionPrompt が必要です" },
      { status: 400 }
    );
  }

  if (variantTag.length === 0) {
    return Response.json(
      { ok: false, error: "variantTag が必要です（例: 'A', 'B'）" },
      { status: 400 }
    );
  }

  try {
    // lineage を読み込む
    const lineage = await readLineage(submissionId);

    // 指定ラウンドが存在するか確認
    const targetRound = lineage.rounds.find((r) => r.round === round);
    if (!targetRound) {
      return Response.json(
        {
          ok: false,
          error: `ラウンド ${round} が見つかりません`,
        },
        { status: 409 }
      );
    }

    // componentSource があるか確認
    if (!targetRound.hasComponentSource) {
      return Response.json(
        {
          ok: false,
          error: `ラウンド ${round} の componentSource が欠損しています。手動で git から復元してください`,
        },
        { status: 409 }
      );
    }

    // snapshot を読み込む
    const snapshot = await readRevisionSnapshot(submissionId, targetRound.snapshotKey);
    if (!snapshot || !snapshot.componentSource) {
      return Response.json(
        {
          ok: false,
          error: `スナップショット ${targetRound.snapshotKey} が見つからないか componentSource がありません`,
        },
        { status: 409 }
      );
    }

    // 新しいラウンド番号を決定（現在の最大ラウンド + 1）
    const nextRound = Math.max(0, ...lineage.rounds.map((r) => r.round)) + 1;

    const targetComponentPath = snapshot.componentPath ?? lineage.componentPath;
    const enforcedRevisionPrompt = `${revisionPrompt}\n\n## 必ず編集する対象ファイル\n- ${targetComponentPath ?? "(unknown target file)"}\n- 新しい showcase ファイルを増やさず、上記の既存ファイルを直接修正すること\n- runtime が参照中の既存コンポーネントを更新し、実際の git diff を残すこと\n- 説明文だけを返して終了せず、必ずファイルを編集して保存すること`;

    // 再利用用 revision-handoff.json を生成
    const reuseHandoff = {
      schemaVersion: "1.0.0",
      submissionId,
      revisionPrompt: enforcedRevisionPrompt,
      targetComponent: lineage.targetComponent,
      componentPath: targetComponentPath,
      round: nextRound,
      createdAt: new Date().toISOString(),
      kind: "reuse" as const,
      parentRound: round,
      variantTag,
    };

    // revision-handoff.json を保存
    await writeArtifact(
      submissionId,
      "revision-handoff.json",
      JSON.stringify(reuseHandoff, null, 2)
    );

    // demo-feedback.json に reuse 指示を追記
    const feedbackRaw = await readArtifact(submissionId, "demo-feedback.json");
    if (feedbackRaw) {
      try {
        const feedback = JSON.parse(feedbackRaw);
        // reuse ノートを追加
        if (typeof feedback === "object" && feedback !== null) {
          (feedback as Record<string, unknown>).reuseNote =
            `ラウンド ${round} からバリアント "${variantTag}" を生成`;
          await writeArtifact(
            submissionId,
            "demo-feedback.json",
            JSON.stringify(feedback, null, 2)
          );
        }
      } catch {
        // パース失敗は無視
      }
    }

    // lineage に再利用ラウンドを追加（hasComponentSource=true は snapshot にあるため）
    const pkg = await readApprovalPackage(submissionId);
    const status = pkg?.status ?? "unknown";
    const customerFacingStatus = pkg?.customerFacingStatus ?? null;
    const queuedStatus =
      status === "demo_generating" || status === "demo_revision_ready"
        ? "demo_revision_ready"
        : status;
    const queuedCustomerFacingStatus =
      status === "demo_generating" || status === "demo_revision_ready"
        ? "under_internal_review"
        : customerFacingStatus;

    await appendRound(submissionId, {
      round: nextRound,
      kind: "reuse",
      parentRound: round,
      variantTag,
      hasComponentSource: true,
      status: queuedStatus,
      customerFacingStatus: queuedCustomerFacingStatus,
      notes: `ラウンド ${round} からバリアント "${variantTag}" を生成`,
    });

    // demo_generating 中なら pending handoff を新しい reuse に置き換える意味で直接巻き戻す
    if (pkg?.status === "demo_generating") {
      pkg.status = "demo_revision_ready";
      pkg.customerFacingStatus = "under_internal_review";
      await writeApprovalPackage(pkg);
    } else if (status !== "demo_revision_ready") {
      await transitionStatus(submissionId, "demo_revision_ready");
    }

    return Response.json({
      ok: true,
      submissionId,
      newRound: nextRound,
      parentRound: round,
      kind: "reuse",
      variantTag,
      snapshotKey: targetRound.snapshotKey,
      message: `ラウンド ${round} からバリアント "${variantTag}"（ラウンド ${nextRound}）を生成しました`,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "再利用処理に失敗しました",
      },
      { status: 500 }
    );
  }
}
