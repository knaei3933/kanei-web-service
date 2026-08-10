import { NextRequest, NextResponse } from "next/server";
import {
  isSafeSubmissionId,
  isSafeAttachmentName,
  writeAttachment,
} from "@/server/submission-storage";
import { AI_FALLBACK_ASSET_PREFIX } from "@/lib/image-fallback";
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
/*  内部オペレータ専用の書き込み経路（Phase H・Q）。                        */
/*  実行ページのオペレータトラッカーから、生成した AIフォールバック資産の   */
/*  メタデータを登録・更新・削除する。                                      */
/*                                                                        */
/*  Phase Q: action=upload を追加。生成した画像ファイル本体（バイナリ）を    */
/*  multipart/form-data で受け取り、添付として保存しつつレジストリへ登録    */
/*  する。メタデータのみの従来経路（add/replace/remove・JSON）も維持。       */
/*                                                                        */
/*  認証なし（submissionId が推測困難な UUID 相当であることを前提）。        */
/*  顧客向け画面・メールには一切出さない内部機能。                           */
/*  画像生成そのものは行わない（ファイルの保存とメタデータの読み書きだけ）。  */
/*                                                                        */
/*  POST（JSON・action=add/replace/remove）:                              */
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
/*  POST（multipart/form-data・action=upload）:                           */
/*    file:     File           （必須・生成した画像等のバイナリ）            */
/*    category: string         （必須・空不可）                              */
/*    note?:    string                                                    */
/*    savedName?: string       （省略可・省略時は元ファイル名から安全に生成） */
/*                              （指定時は ai-fallback- プレフィックス必須） */
/*                                                                        */
/*  応答: 更新後（または現在）のレジストリ全体を返す。                       */
/* ------------------------------------------------------------------ */

type RouteContext = {
  params: Promise<{ submissionId: string }>;
};

/**
 * オペレータがアップロードした元ファイル名から、安全な保存名を生成する。
 * ai-fallback- プレフィックスを必ず付け、ASCII 安全文字だけ残す。
 * 拡張子は元のものを小文字で保持する（プレビューの content-type 復元用）。
 *
 * 例: "Hero Visual.PNG"      -> "ai-fallback-hero-visual.png"
 *      "ai-fallback-logo.svg" -> "ai-fallback-logo.svg"（二重プレフィックス回避）
 */
function deriveFallbackSavedName(originalName: string): string {
  // パス区切り以降だけ残す（ディレクトリトラバーサル抑止）
  const base = originalName.replace(/^.*[\\/]/, "").trim();
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  // ASCII の安全な文字以外は hyphen に圧縮し、前後の hyphen を詰める
  const safeStem =
    stem.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
  // 拡張子は英字・数字・ドットだけ残し小文字化（先頭ドットを保持）
  const safeExt = ext.replace(/[^A-Za-z0-9.]/g, "").toLowerCase();
  // 元ファイル名が既にプレフィックス付きなら二重にしない
  const fullStem = safeStem.startsWith(AI_FALLBACK_ASSET_PREFIX)
    ? safeStem
    : `${AI_FALLBACK_ASSET_PREFIX}${safeStem}`;
  return `${fullStem}${safeExt}`;
}

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

/** POST: action に応じて資産を追加 / 差替済み化 / 削除 / アップロード する */
export async function POST(request: NextRequest, ctx: RouteContext) {
  const { submissionId } = await ctx.params;

  if (!isSafeSubmissionId(submissionId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid submission ID" },
      { status: 400 }
    );
  }

  // Phase Q: multipart/form-data のときはバイナリアップロード経路（upload）へ。
  // それ以外は従来の JSON 経路（add/replace/remove）。
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.startsWith("multipart/form-data")) {
    return handleUpload(request, submissionId);
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

/* ------------------------------------------------------------------ */
/*  multipart/form-data によるバイナリアップロード（Phase Q・upload）    */
/* ------------------------------------------------------------------ */
/*  生成した画像ファイル本体を受け取り、添付として保存しつつレジストリへ   */
/*  メタデータを登録する。1リクエストで「保存＋登録」を完了させる。         */
/*                                                                        */
/*  - file:     必須。バイナリ本体（画像等）。File として受け取る。         */
/*  - category: 必須。フォールバック評価の「不足画像カテゴリ」等。           */
/*  - note:     任意。                                                     */
/*  - savedName:任意。省略時は元ファイル名から安全に生成（プレフィックス付）。*/
/*               指定時は ai-fallback- プレフィックス必須・安全な名前であること。*/
/*                                                                        */
/*  保存した contentType / originalName をメタデータに併せて残し、           */
/*  プレビュー（インライン表示）で content-type を復元できるようにする。     */
/* ------------------------------------------------------------------ */

/** FormData から文字列フィールドを安全に取り出す */
function formField(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

/** multipart アップロードを処理し、更新後のレジストリを返す */
async function handleUpload(
  request: NextRequest,
  submissionId: string
): Promise<NextResponse> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "multipart/form-data の解析に失敗しました。" },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { ok: false, error: "file（画像ファイル）は必須です。" },
      { status: 400 }
    );
  }

  const category = formField(form, "category").trim();
  if (!category) {
    return NextResponse.json(
      { ok: false, error: "category は必須です。" },
      { status: 400 }
    );
  }
  const noteRaw = formField(form, "note").trim();
  const note = noteRaw.length > 0 ? noteRaw : undefined;

  // 保存名: 明示指定があれば検証、無ければ元ファイル名から安全に生成
  const explicitName = formField(form, "savedName").trim();
  let savedName: string;
  if (explicitName) {
    savedName = explicitName;
  } else {
    savedName = deriveFallbackSavedName(file.name || "asset");
  }

  // ai-fallback- プレフィックス必須・安全なファイル名であること
  if (!savedName.startsWith(AI_FALLBACK_ASSET_PREFIX)) {
    return NextResponse.json(
      {
        ok: false,
        error: `savedName は ${AI_FALLBACK_ASSET_PREFIX} プレフィックスで始まる必要があります: ${savedName}`,
      },
      { status: 400 }
    );
  }
  if (!isSafeAttachmentName(savedName)) {
    return NextResponse.json(
      { ok: false, error: `安全でないファイル名です: ${savedName}` },
      { status: 400 }
    );
  }

  // MIME タイプ: File.type を優先、無ければ octet-stream
  const contentType = file.type && file.type.length > 0 ? file.type : "application/octet-stream";
  const originalName = file.name && file.name.length > 0 ? file.name : savedName;

  try {
    // 1) バイナリ本体を添付として保存（files/<savedName>）
    const bytes = new Uint8Array(await file.arrayBuffer());
    await writeAttachment(submissionId, savedName, bytes, contentType);

    // 2) レジストリへメタデータを登録（contentType/originalName も残す）
    await appendAiFallbackAsset(submissionId, {
      category,
      savedName,
      note,
      contentType,
      originalName,
    });

    const registry = await readAiFallbackAssets(submissionId);
    return NextResponse.json({ ok: true, registry });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
