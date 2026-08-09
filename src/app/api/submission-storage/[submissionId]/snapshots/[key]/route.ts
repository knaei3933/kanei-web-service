import { timingSafeEqual } from "node:crypto";
import {
  isSafeSnapshotKey,
  isSafeSubmissionId,
} from "@/server/submission-storage";

export const maxDuration = 30;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 28_000;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

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

function resolveUpstreamUrl(
  submissionId: string,
  key: string
): { url: string } | { error: Response } {
  if (!isSafeSubmissionId(submissionId)) {
    return {
      error: Response.json(
        { status: "error", error: "submissionId の形式が不正です。" },
        { status: 400 }
      ),
    };
  }
  if (!isSafeSnapshotKey(key)) {
    return {
      error: Response.json(
        {
          status: "error",
          error: "許可されていないスナップショットキーです。",
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
  return {
    url: `${base}/${encodeURIComponent(submissionId)}/snapshots/${encodeURIComponent(key)}`,
  };
}

async function forward(
  request: Request,
  method: string,
  submissionId: string,
  key: string
): Promise<Response> {
  const resolved = resolveUpstreamUrl(submissionId, key);
  if ("error" in resolved) return resolved.error;

  const hasBody = method === "PUT" || method === "POST";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstreamRes = await fetch(resolved.url, {
      method,
      headers: {
        "content-type":
          request.headers.get("content-type") ?? "application/json; charset=utf-8",
        authorization: request.headers.get("authorization") ?? "",
      },
      ...(hasBody ? { body } : {}),
      signal: controller.signal,
      cache: "no-store",
    });

    const upstreamBody = await upstreamRes.arrayBuffer();
    return new Response(upstreamBody, {
      status: upstreamRes.status,
      headers: {
        "content-type":
          upstreamRes.headers.get("content-type") ?? "application/json; charset=utf-8",
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

type StorageSnapshotRouteContext = {
  params: Promise<{ submissionId: string; key: string }>;
};

export async function GET(
  request: Request,
  ctx: StorageSnapshotRouteContext
): Promise<Response> {
  const authError = authorize(request);
  if (authError) return authError;
  const { submissionId, key } = await ctx.params;
  return forward(request, "GET", submissionId, key);
}

export async function PUT(
  request: Request,
  ctx: StorageSnapshotRouteContext
): Promise<Response> {
  const authError = authorize(request);
  if (authError) return authError;
  const { submissionId, key } = await ctx.params;
  return forward(request, "PUT", submissionId, key);
}

export async function POST(
  request: Request,
  ctx: StorageSnapshotRouteContext
): Promise<Response> {
  const authError = authorize(request);
  if (authError) return authError;
  const { submissionId, key } = await ctx.params;
  return forward(request, "PUT", submissionId, key);
}

export async function DELETE(
  request: Request,
  ctx: StorageSnapshotRouteContext
): Promise<Response> {
  const authError = authorize(request);
  if (authError) return authError;
  const { submissionId, key } = await ctx.params;
  return forward(request, "DELETE", submissionId, key);
}
