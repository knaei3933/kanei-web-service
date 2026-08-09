import { timingSafeEqual } from "node:crypto";
import {
  isArtifactFileName,
  isSafeSubmissionId,
} from "@/server/submission-storage";

/* ------------------------------------------------------------------ */
/*  /api/submission-storage/[submissionId]/[fileName]                   */
/*  （固定の公開ストレージプロキシルート）                               */
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    本番(Vercel/serverless)で成果物を恒久保存するための「固定 URL」。  */
/*    Vercel の /tmp はインスタンス単位・エフェメラルで、別リクエストで  */
/*    書いた承認パッケージ等が読めず、review/approve/plan-approve が     */
/*    壊れる。そこで SUBMISSION_STORAGE_RELAY_URL にはこの固定ルートを   */
/*    指定し、本ルートが上流（WSL リレーストレージ等）へ転送する。       */
/*                                                                      */
/*  流れ（mail-relay と同じ二段構え）:                                  */
/*    アダプタ（relay プロバイダ）                                       */
/*      └─ SUBMISSION_STORAGE_RELAY_URL =                                */
/*         https://...vercel.app/api/submission-storage/<id>/<file>      */
/*         └─ 本ルートが SUBMISSION_STORAGE_RELAY_UPSTREAM_URL           */
/*            （WSL トンネル等）の同じパスへ転送し、応答を透過的に返す。  */
/*                                                                      */
/*  REST キーバリュー契約（上流が実装すべき最小要件）:                   */
/*    PUT  /{upstream}/{submissionId}/{fileName}  body=内容(UTF-8) → 2xx */
/*    GET  /{upstream}/{submissionId}/{fileName}            → 本文 or 404*/
/*    DELETE /{upstream}/{submissionId}/{fileName}          → 2xx        */
/*                                                                      */
/*  認証:                                                              */
/*    Authorization: Bearer <SUBMISSION_STORAGE_RELAY_SECRET> を         */
/*    定時間比較で検証。転送時も同じ Authorization ヘッダーを維持する。   */
/*                                                                      */
/*  バリデーション:                                                    */
/*    submissionId / fileName を公開エッジで検証し、                      */
/*    許可された成果物名（ホワイトリスト）以外は拒否する（トラバーサル・  */
/*    意図しないファイル操作の防止）。ホワイトリストは                     */
/*    src/server/submission-storage/types.ts の ARTIFACT_FILE_NAMES。     */
/*                                                                      */
/*  エラー:                                                            */
/*    - 認証失敗: 401（構造化 JSON）                                    */
/*    - パス不正・許可外ファイル名: 400（構造化 JSON）                   */
/*    - UPSTREAM_URL 未設定: 502（構造化 JSON）                         */
/*    - 上流との通信失敗: 502（構造化 JSON）                            */
/*    - 上流からの応答は HTTP ステータス・ボディともにそのまま返す       */
/* ------------------------------------------------------------------ */

// 上流（WSL リレーストレージ）はディスク I/O を含むため長めに待つ。
export const maxDuration = 30;
// fetch / AbortController を使うため Node ランタイムを明示。
export const runtime = "nodejs";
// 転送は毎回異なる実行結果になるため動的に。
export const dynamic = "force-dynamic";

/** 上流へ転送するときのタイムアウト（maxDuration に合わせて余裕を持たせる） */
const UPSTREAM_TIMEOUT_MS = 28_000;

/**
 * 文字列を定時間比較する（タイミング攻撃への緩和）。
 * 長さが違う場合は比較せず false を返す。
 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Bearer 認証を検証する。失敗時は 401 Response、成功時は null。
 */
function authorize(request: Request): Response | null {
  const secret = process.env.SUBMISSION_STORAGE_RELAY_SECRET;
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
      { status: "error", error: "認証に失敗しました" },
      { status: 401 }
    );
  }
  return null;
}

/**
 * パスパラメータを検証し、上流 URL を組み立てる。
 * 不正時は 400 Response、有効時は上流 URL 文字列。
 */
function resolveUpstreamUrl(
  submissionId: string,
  fileName: string
): { url: string } | { error: Response } {
  if (!isSafeSubmissionId(submissionId)) {
    return {
      error: Response.json(
        { status: "error", error: "submissionId の形式が不正です。" },
        { status: 400 }
      ),
    };
  }
  if (!isArtifactFileName(fileName)) {
    return {
      error: Response.json(
        {
          status: "error",
          error:
            "許可されていない成果物ファイル名です。保存できるのは決められた成果物のみです。",
        },
        { status: 400 }
      ),
    };
  }

  const upstream = process.env.SUBMISSION_STORAGE_RELAY_UPSTREAM_URL;
  if (!upstream) {
    return {
      error: Response.json(
        {
          status: "error",
          error:
            "SUBMISSION_STORAGE_RELAY_UPSTREAM_URL が未設定のため転送できません。",
        },
        { status: 502 }
      ),
    };
  }

  const base = upstream.replace(/\/+$/, "");
  return { url: `${base}/${encodeURIComponent(submissionId)}/${encodeURIComponent(fileName)}` };
}

/**
 * 上流へリクエストを転送し、応答を透過的に返す。
 * method / body / content-type / authorization を維持する。
 */
async function forward(
  request: Request,
  method: string,
  submissionId: string,
  fileName: string
): Promise<Response> {
  const resolved = resolveUpstreamUrl(submissionId, fileName);
  if ("error" in resolved) return resolved.error;

  // ボディを持つメソッドだけ本文を読む（GET/DELETE は空）
  const hasBody = method === "PUT" || method === "POST";
  const body = hasBody ? await request.text() : undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstreamRes = await fetch(resolved.url, {
      method,
      headers: {
        // 受信した content-type を維持（既定は text/plain）
        "content-type":
          request.headers.get("content-type") ?? "text/plain; charset=utf-8",
        // 認証ヘッダーを維持（上流も同じシークレットで受け付ける）
        authorization: request.headers.get("authorization") ?? "",
      },
      ...(hasBody ? { body } : {}),
      signal: controller.signal,
      cache: "no-store",
    });

    const upstreamText = await upstreamRes.text();
    return new Response(upstreamText, {
      status: upstreamRes.status,
      headers: {
        "content-type":
          upstreamRes.headers.get("content-type") ?? "text/plain; charset=utf-8",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      {
        status: "error",
        error: `上流ストレージリレーへの転送に失敗しました: ${message}`,
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}

/** 許可されていないメソッドのときの 405 応答 */
function methodNotAllowed(): Response {
  return Response.json(
    {
      status: "error",
      error: "このメソッドは許可されていません（GET / PUT / POST / DELETE が使えます）。",
    },
    { status: 405 }
  );
}

/* ------------------------------------------------------------------ */
/*  HTTP メソッドハンドラ（Next 16: context.params は Promise）          */
/* ------------------------------------------------------------------ */

type StorageRouteContext = {
  params: Promise<{ submissionId: string; fileName: string }>;
};

export async function GET(request: Request, ctx: StorageRouteContext): Promise<Response> {
  const authError = authorize(request);
  if (authError) return authError;
  const { submissionId, fileName } = await ctx.params;
  return forward(request, "GET", submissionId, fileName);
}

export async function PUT(request: Request, ctx: StorageRouteContext): Promise<Response> {
  const authError = authorize(request);
  if (authError) return authError;
  const { submissionId, fileName } = await ctx.params;
  return forward(request, "PUT", submissionId, fileName);
}

export async function POST(request: Request, ctx: StorageRouteContext): Promise<Response> {
  const authError = authorize(request);
  if (authError) return authError;
  const { submissionId, fileName } = await ctx.params;
  // POST は書き込みの別名として PUT と同じ転送を行う
  return forward(request, "PUT", submissionId, fileName);
}

export async function DELETE(request: Request, ctx: StorageRouteContext): Promise<Response> {
  const authError = authorize(request);
  if (authError) return authError;
  const { submissionId, fileName } = await ctx.params;
  return forward(request, "DELETE", submissionId, fileName);
}

