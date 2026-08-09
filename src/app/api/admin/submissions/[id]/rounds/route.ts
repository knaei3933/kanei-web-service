import { timingSafeEqual } from "node:crypto";
import { readLineage } from "@/lib/revision-lineage";

/* ------------------------------------------------------------------ */
/*  GET /api/admin/submissions/[id]/rounds — リビジョン履歴取得          */
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    管理者が特定の相談データのリビジョン履歴（ラウンド一覧）を取得する。  */
/*    revision-lineage.json を読み込み、全ラウンドのメタデータを返す。    */
/*                                                                      */
/*  認証:                                                              */
/*    Authorization: Bearer *** を定時間比較で検証。         */
/*    ADMIN_SECRET 未設定・不一致時は 401（構造化 JSON）。              */
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

/** 管理者認証を検証する。失敗時は 401 Response、成功時は null。 */
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const authError = authorizeAdmin(request);
  if (authError) return authError;

  const { id: submissionId } = await params;
  if (!submissionId || submissionId.length === 0) {
    return Response.json(
      { ok: false, error: "submission id が必要です" },
      { status: 400 }
    );
  }

  try {
    const lineage = await readLineage(submissionId);

    return Response.json({
      ok: true,
      submissionId,
      lineage: {
        schemaVersion: lineage.schemaVersion,
        submissionId: lineage.submissionId,
        targetComponent: lineage.targetComponent,
        componentPath: lineage.componentPath,
        currentRound: lineage.currentRound,
        rounds: lineage.rounds,
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "リビジョン履歴の取得に失敗しました",
      },
      { status: 500 }
    );
  }
}
