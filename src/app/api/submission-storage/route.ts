import { timingSafeEqual } from "node:crypto";

/* ------------------------------------------------------------------ */
/*  /api/submission-storage （一覧取得プロキシルート）                  */
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    既存の成果物プロキシ（[submissionId]/[fileName]/route.ts）の兄弟  */
/*    ルート。submissionId / fileName を伴わない「一覧取得」専用の       */
/*    GET ルートで、受け取った GET を上流（WSL リレーストレージ等）の     */
/*    /submission-storage へそのまま転送し、応答を透過的に返す。         */
/*                                                                      */
/*  流れ（成果物プロキシと同じ二段構え）:                                */
/*    呼び出し元（管理画面 / relay リスティング）                         */
/*      └─ 本ルート（固定の公開ルート）                                  */
/*         └─ SUBMISSION_STORAGE_RELAY_UPSTREAM_URL                      */
/*            （WSL トンネル等）の /submission-storage へ転送し、         */
/*            応答を透過的に返す。                                       */
/*                                                                      */
/*  上流が返す JSON（リスティング契約）:                                 */
/*    {"status":"ok","submissions":["id1","id2",...]}                   */
/*                                                                      */
/*  認証:                                                              */
/*    Authorization: Bearer <SUBMISSION_STORAGE_RELAY_SECRET> を         */
/*    定時間比較で検証。転送時も同じ Authorization ヘッダーを維持する。   */
/*                                                                      */
/*  エラー:                                                            */
/*    - 認証失敗: 401（構造化 JSON）                                    */
/*    - UPSTREAM_URL 未設定: 502（構造化 JSON）                         */
/*    - 上流との通信失敗: 502（構造化 JSON）                            */
/*    - 上流からの応答は HTTP ステータス・ボディともにそのまま返す       */
/* ------------------------------------------------------------------ */

// 上流（WSL リレーストレージ）はディスク I/O を含むため長めに待つ。
export const maxDuration = 30;
// fetch / AbortController を使うため Node ランタイムを明示。
export const runtime = "nodejs";
// 一覧は毎回異なる実行結果になるため動的に。
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

/** 許可されていないメソッドのときの 405 応答 */
function methodNotAllowed(): Response {
  return Response.json(
    {
      status: "error",
      error: "このメソッドは許可されていません（GET のみ使えます）。",
    },
    { status: 405 }
  );
}

/* ------------------------------------------------------------------ */
/*  HTTP メソッドハンドラ（パスパラメータなし）                          */
/* ------------------------------------------------------------------ */

export async function GET(request: Request): Promise<Response> {
  const authError = authorize(request);
  if (authError) return authError;

  const upstream = process.env.SUBMISSION_STORAGE_RELAY_UPSTREAM_URL;
  if (!upstream) {
    return Response.json(
      {
        status: "error",
        error:
          "SUBMISSION_STORAGE_RELAY_UPSTREAM_URL が未設定のため転送できません。",
      },
      { status: 502 }
    );
  }

  // 上流の同じパス（/submission-storage）へ転送。サフィックスは付けない。
  const url = `${upstream.replace(/\/+$/, "")}/submission-storage`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstreamRes = await fetch(url, {
      method: "GET",
      headers: {
        // 認証ヘッダーを維持（上流も同じシークレットで受け付ける）
        authorization: request.headers.get("authorization") ?? "",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const upstreamText = await upstreamRes.text();
    return new Response(upstreamText, {
      status: upstreamRes.status,
      headers: {
        "content-type":
          upstreamRes.headers.get("content-type") ??
          "application/json; charset=utf-8",
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

/** GET 以外は受け付けない（一覧取得のみ） */
export function POST(): Response {
  return methodNotAllowed();
}
export function PUT(): Response {
  return methodNotAllowed();
}
export function DELETE(): Response {
  return methodNotAllowed();
}
