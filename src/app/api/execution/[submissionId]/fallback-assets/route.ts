import { NextRequest, NextResponse } from "next/server";
import { isSafeSubmissionId } from "@/server/submission-storage";
import {
  readAiFallbackAssets,
  appendAiFallbackAsset,
  markAiFallbackAssetReplaced,
  removeAiFallbackAsset,
  type AiFallbackAssetRegistry,
} from "@/lib/ai-fallback-assets";

/* ------------------------------------------------------------------ */
/*  POST /api/execution/[submissionId]/fallback-assets                  */
/*  GET  /api/execution/[submissionId]/fallback-assets                  */
/* ------------------------------------------------------------------ */
/*  内部オペレータ専用の書き込み経路（Phase H）。                          */
/*  実行ページのオペレータトラッカーから、生成した AIフォールバック資産の   */
/*  メタデータを登録・更新・削除する。                                      */
/*                                                                        */
/*  認証なし（submissionId が推測困難な UUID 相当であることを前提）。        */
/*  顧客向け画面・メールには一切出さない内部機能。                           */
/*  画像生成そのものは行わない（メタデータの読み書きだけ）。                  */
/*                                                                        */
/*  POST Body:                                                            */
/*    action: "add" | "replace" | "remove"                                */
/*    --- action=add ---                                                  */
/*      category: string        （必須・空不可）                            */
/*      savedName: string       （必須・ai-fallback- プレフィックス必須）    */
/*      note?: string                                                     */
/*    --- action=replace ---                                              */
/*      assetId: string         （必須）                                   */
/*      note?: string                                                     */
/*    --- action=remove ---                                               */
/*      assetId: string         （必須）                                   */
/*                                                                        */
/*  応答: 更新後（または現在）のレジストリ全体を返す。                       */
/* ------------------------------------------------------------------ */

type RouteContext = {
  params: Promise<{ submissionId: string }>;
};

/** GET: 現在のレジストリを返す（無い場合は空のレジストリ形状を返す） */
export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { submissionId } = await ctx.params;

  if (!isSafeSubmissionId(submissionId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid submission ID" },
      { status: 400 }
    );
  }

  const registry = await readAiFallbackAssets(submissionId);
  return NextResponse.json({ ok: true, registry });
}

/** POST: action に応じて資産を追加 / 差替済み化 / 削除する */
export async function POST(request: NextRequest, ctx: RouteContext) {
  const { submissionId } = await ctx.params;

  if (!isSafeSubmissionId(submissionId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid submission ID" },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const action = typeof body.action === "string" ? body.action : "";

  try {
    let registry: AiFallbackAssetRegistry | null = null;

    if (action === "add") {
      const category = typeof body.category === "string" ? body.category : "";
      const savedName = typeof body.savedName === "string" ? body.savedName : "";
      const note =
        typeof body.note === "string" && body.note.trim().length > 0
          ? body.note
          : undefined;

      if (!category.trim()) {
        return NextResponse.json(
          { ok: false, error: "category は必須です。" },
          { status: 400 }
        );
      }
      if (!savedName.trim()) {
        return NextResponse.json(
          { ok: false, error: "savedName は必須です。" },
          { status: 400 }
        );
      }

      await appendAiFallbackAsset(submissionId, { category, savedName, note });
      registry = await readAiFallbackAssets(submissionId);
    } else if (action === "replace") {
      const assetId = typeof body.assetId === "string" ? body.assetId : "";
      const note =
        typeof body.note === "string" && body.note.trim().length > 0
          ? body.note
          : undefined;

      if (!assetId) {
        return NextResponse.json(
          { ok: false, error: "assetId は必須です。" },
          { status: 400 }
        );
      }

      registry = await markAiFallbackAssetReplaced(submissionId, assetId, note);
      if (!registry) {
        return NextResponse.json(
          { ok: false, error: "対象の資産が見つかりません。" },
          { status: 404 }
        );
      }
    } else if (action === "remove") {
      const assetId = typeof body.assetId === "string" ? body.assetId : "";

      if (!assetId) {
        return NextResponse.json(
          { ok: false, error: "assetId は必須です。" },
          { status: 400 }
        );
      }

      registry = await removeAiFallbackAsset(submissionId, assetId);
      if (!registry) {
        return NextResponse.json(
          { ok: false, error: "対象の資産が見つかりません。" },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { ok: false, error: "action は add / replace / remove のいずれかです。" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, registry });
  } catch (error) {
    // 保存失敗・入力値エラー（プレフィックス違反等）は 400 系で返す
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
