import { timingSafeEqual } from "node:crypto";

/* ------------------------------------------------------------------ */
/*  POST /api/mail-relay（固定の公開リレールート）                       */
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    Vercel 上の「固定 URL」をリレー窓口にする。                       */
/*    WSL 側リレー（kanei_mail_relay.py）のトンネル URL は変わりうる    */
/*    ため、MAIL_RELAY_URL にはこの固定ルートを指定する。               */
/*                                                                      */
/*  流れ:                                                              */
/*    アプリ内 Relay プロバイダ                                         */
/*      └─ MAIL_RELAY_URL = https://...vercel.app/api/mail-relay       */
/*         └─ 本ルートが MAIL_RELAY_UPSTREAM_URL（WSL トンネル等）へ    */
/*            ボディをそのまま転送し、上流の応答を透過的に返す。         */
/*                                                                      */
/*  認証:                                                              */
/*    Authorization: Bearer <MAIL_RELAY_SECRET> を定時間比較で検証。    */
/*    転送時も同じ Authorization ヘッダーを維持するため、WSL 側の        */
/*    RELAY_SECRET を MAIL_RELAY_SECRET と同じ値にしておけば受け付く。  */
/*                                                                      */
/*  エラー:                                                            */
/*    - 認証失敗: 401（構造化 JSON）                                    */
/*    - MAIL_RELAY_UPSTREAM_URL 未設定: 502（構造化 JSON）              */
/*    - 上流との通信失敗: 502（構造化 JSON）                            */
/*    - 上流からの応答は HTTP ステータス・ボディともにそのまま返す      */
/* ------------------------------------------------------------------ */

// 上流（WSL リレー）は SMTP 送信を含むため長めに待つ。
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

export async function POST(request: Request): Promise<Response> {
  /* ---- 1. Bearer 認証 ---- */
  const secret = process.env.MAIL_RELAY_SECRET;
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

  /* ---- 2. 上流 URL の有無 ---- */
  const upstream = process.env.MAIL_RELAY_UPSTREAM_URL;
  if (!upstream) {
    return Response.json(
      {
        status: "error",
        error: "MAIL_RELAY_UPSTREAM_URL が未設定のため転送できません。",
      },
      { status: 502 }
    );
  }

  /* ---- 3. リクエストボディをそのまま取得 ---- */
  const body = await request.text();

  /* ---- 4. 上流へ転送 ---- */
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstreamRes = await fetch(upstream, {
      method: "POST",
      headers: {
        // 受信した content-type を維持（既定は application/json）
        "content-type":
          request.headers.get("content-type") ?? "application/json",
        // 認証ヘッダーを維持（WSL 側も同じシークレットで受け付ける）
        authorization: authHeader,
      },
      body,
      signal: controller.signal,
      // Vercel 側の転送結果をキャッシュさせない
      cache: "no-store",
    });

    /* ---- 5. 上流の応答を透過的に返す ---- */
    const upstreamText = await upstreamRes.text();
    return new Response(upstreamText, {
      status: upstreamRes.status,
      headers: {
        "content-type":
          upstreamRes.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      {
        status: "error",
        error: `上流リレーへの転送に失敗しました: ${message}`,
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
