import { timingSafeEqual } from "node:crypto";
import {
  isSafeAttachmentName,
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
  savedName: string
): { url: string } | { error: Response } {
  if (!isSafeSubmissionId(submissionId)) {
    return {
      error: Response.json(
        { status: "error", error: "submissionId の形式が不正です。" },
        { status: 400 }
      ),
    };
  }
  if (!isSafeAttachmentName(savedName)) {
    return {
      error: Response.json(
        {
          status: "error",
          error: "許可されていない添付ファイル名です。",
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
    url: `${base}/${encodeURIComponent(submissionId)}/files/${encodeURIComponent(savedName)}`,
  };
}

async function forward(
  request: Request,
  method: string,
  submissionId: string,
  savedName: string
): Promise<Response> {
  const resolved = resolveUpstreamUrl(submissionId, savedName);
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
          request.headers.get("content-type") ?? "application/octet-stream",
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
          upstreamRes.headers.get("content-type") ?? "application/octet-stream",
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

type StorageAttachmentRouteContext = {
  params: Promise<{ submissionId: string; savedName: string }>;
};

export async function GET(
  request: Request,
  ctx: StorageAttachmentRouteContext
): Promise<Response> {
  const authError = authorize(request);
  if (authError) return authError;
  const { submissionId, savedName } = await ctx.params;
  return forward(request, "GET", submissionId, savedName);
}

export async function PUT(
  request: Request,
  ctx: StorageAttachmentRouteContext
): Promise<Response> {
  const authError = authorize(request);
  if (authError) return authError;
  const { submissionId, savedName } = await ctx.params;
  return forward(request, "PUT", submissionId, savedName);
}

export async function POST(
  request: Request,
  ctx: StorageAttachmentRouteContext
): Promise<Response> {
  const authError = authorize(request);
  if (authError) return authError;
  const { submissionId, savedName } = await ctx.params;
  return forward(request, "PUT", submissionId, savedName);
}

export async function DELETE(
  request: Request,
  ctx: StorageAttachmentRouteContext
): Promise<Response> {
  const authError = authorize(request);
  if (authError) return authError;
  const { submissionId, savedName } = await ctx.params;
  return forward(request, "DELETE", submissionId, savedName);
}
