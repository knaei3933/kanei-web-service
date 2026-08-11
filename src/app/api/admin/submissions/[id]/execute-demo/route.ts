import { timingSafeEqual } from "node:crypto";
import { spawn } from "node:child_process";
import { readApprovalPackage, writeApprovalPackage, buildExecutionHandoff, buildPlanningArtifact } from "@/lib/approval-package";
import { artifactExists } from "@/server/submission-storage";

/* ------------------------------------------------------------------ */
/*  /api/admin/submissions/[id]/execute-demo （デモ生成エンドポイント）    */
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    管理者が「デモを生成する」ボタンを押した時に呼ばれるエンドポイント。*/
/*    Claude Code でデモサイトを生成するプロセスを開始します。           */
/*                                                                      */
/*  ※生成本体はリポジトリ外の外部プロセス（kanei_demo_handoff_watch.py）  */
/*    が担う。本ルートの役割は (1) handoff 成果物を整え (2) status を     */
/*    demo_generating に進めること。ローカルでは .py の起動も試みるが、   */
/*    serverless では起動不可のため status 遷移のみ。完了報告は外部から   */
/*    POST /api/demo/[id]/deployed で受け取る。詳細は docs/demo-handoff-watch.md。*/
/*                                                                      */
/*  認証:                                                              */
/*    Authorization: Bearer *** を定時間比較で検証。         */
/*    ADMIN_SECRET 未設定・不一致時は 401（構造化 JSON）。              */
/* ------------------------------------------------------------------ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 文字列を定時間比較する（タイミング攻撃への緩和）。長さが違う場合は比較せず false を返す。 */
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

/** Python スクリプトのパス（プロジェクトルート基準） */
const PYTHON_SCRIPT = "kanei_demo_handoff_watch.py";

/** デモ生成が可能なステータス */
const ALLOWED_STATUSES = ["approved_for_execution", "demo_revision_ready"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

/** アーティファクトファイル名 */
type ArtifactName = "revision-handoff.json" | "execution-handoff.json" | "omc-plan.json" | "execution-prompt.md" | "execution-section-prompts.md";

/** ステータスチェックとハンドオフファイルの準備 */
async function prepareHandoff(
  submissionId: string,
  currentStatus: string
): Promise<{ ok: true; handoffType: "execution" | "revision" } | { ok: false; error: string; status: number }> {
  // ステータスチェック
  if (!ALLOWED_STATUSES.includes(currentStatus as AllowedStatus)) {
    return {
      ok: false,
      error: `現在のステータス (${currentStatus}) ではデモ生成を開始できません。${ALLOWED_STATUSES.join(" または ")} である必要があります。`,
      status: 400,
    };
  }

  // demo_revision_ready の場合は revision-handoff.json を使用
  if (currentStatus === "demo_revision_ready") {
    const revisionHandoffExists = await artifactExists(submissionId, "revision-handoff.json" as ArtifactName);
    if (!revisionHandoffExists) {
      return {
        ok: false,
        error: "revision-handoff.json が見つかりません。顧客フィードバックの処理が完了していない可能性があります。",
        status: 400,
      };
    }
    return { ok: true, handoffType: "revision" };
  }

  // approved_for_execution の場合は execution-handoff.json を使用
  const executionHandoffExists = await artifactExists(submissionId, "execution-handoff.json" as ArtifactName);

  if (!executionHandoffExists) {
    // execution-handoff.json がない場合は生成を試みる
    const pkg = await readApprovalPackage(submissionId);
    if (!pkg) {
      return {
        ok: false,
        error: "approval-package.json が見つかりません。",
        status: 404,
      };
    }

    // 計画アーティファクトがない場合は生成
    const plan = pkg.planningArtifact ?? buildPlanningArtifact(pkg);
    pkg.planningArtifact = plan;

    // execution-handoff.json を生成
    const handoff = buildExecutionHandoff(pkg, plan);
    pkg.executionHandoff = handoff;

    // プロンプトも生成（本文 + セクション別）
    const { buildExecutionPromptMarkdown, buildExecutionSectionPromptsMarkdown } = await import("@/lib/approval-package");
    const promptMarkdown = buildExecutionPromptMarkdown(pkg, plan);
    const sectionPromptsMarkdown = buildExecutionSectionPromptsMarkdown(pkg, plan);

    try {
      // ファイル書き出し
      const { writeArtifact } = await import("@/server/submission-storage");
      await writeArtifact(submissionId, "omc-plan.json" as ArtifactName, JSON.stringify(plan, null, 2));
      await writeArtifact(submissionId, "execution-prompt.md" as ArtifactName, promptMarkdown);
      await writeArtifact(submissionId, "execution-section-prompts.md" as ArtifactName, sectionPromptsMarkdown);
      await writeArtifact(submissionId, "execution-handoff.json" as ArtifactName, JSON.stringify(handoff, null, 2));

      // パッケージ更新
      await writeApprovalPackage(pkg);
    } catch (error) {
      console.error("execution-handoff.json 生成エラー:", error);
      return {
        ok: false,
        error: "execution-handoff.json の生成に失敗しました。",
        status: 500,
      };
    }
  }

  return { ok: true, handoffType: "execution" };
}

/** Python スクリプトをバックグラウンドで実行 */
async function startDemoGeneration(
  submissionId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  return new Promise((resolve) => {
    // Python スクリプトの存在チェック
    const scriptPath = PYTHON_SCRIPT;

    // 環境変数を設定
    const env = {
      ...process.env,
      SUBMISSION_ID: submissionId,
      PYTHONUNBUFFERED: "1",
    };

    try {
      // subprocess.Popen で実行（応答をブロックしない）
      const proc = spawn("python3", [scriptPath], {
        env,
        detached: true,
        stdio: "ignore",
      });

      // プロセスをデタッチ（親プロセスの終了時に影響しないよう）
      proc.unref();

      // エラーがなく起動したとみなす
      resolve({ ok: true });
    } catch (error) {
      console.error("Python スクリプト起動エラー:", error);
      resolve({
        ok: false,
        error: `Python スクリプトの起動に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
      });
    }
  });
}

export async function POST(
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

  // approval-package.json を読み込み
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) {
    return Response.json(
      { ok: false, error: "submission が見つかりません" },
      { status: 404 }
    );
  }

  // ステータスチェックとハンドオフファイルの準備
  const handoffResult = await prepareHandoff(submissionId, pkg.status);
  if (!handoffResult.ok) {
    return Response.json(
      { ok: false, error: handoffResult.error },
      { status: handoffResult.status }
    );
  }

  // デモ生成の起動方針（正直な設計）:
  //   - ローカル開発（VERCEL!=1）: kanei_demo_handoff_watch.py の起動を試みる。
  //     ただし .py はリポジトリ外（WSL）にあり serverless では起動できないため、
  //     起動の成否によらず「handoff 成果物が生成済みであること」が本体。
  //   - 本番（serverless）: プロセス起動不可のため spawn しない。
  //     execution-handoff.json / revision-handoff.json を外部 handoff-watch が監視し、
  //     完了後に POST /api/demo/[id]/deployed で demo_deployed / demo_revised へ反映する。
  //     詳細は docs/demo-handoff-watch.md。
  const isServerless = process.env.VERCEL === "1";
  let spawnAttempted = false;
  if (!isServerless) {
    const pythonResult = await startDemoGeneration(submissionId);
    spawnAttempted = true;
    if (!pythonResult.ok) {
      // ローカル spawn の同期エラー。handoff 成果物は生成済みなので、
      // status は demo_generating に進め、外部プロセスの拾い上げに委ねる。
      console.warn(
        `[execute-demo] ローカルの spawn 起動に失敗しました（外部プロセスに委譲）: ${pythonResult.error}`
      );
    }
  }

  // status を demo_generating に更新
  try {
    pkg.status = "demo_generating";
    pkg.customerFacingStatus = "under_internal_review";
    await writeApprovalPackage(pkg);
  } catch (error) {
    console.error("ステータス更新エラー:", error);
    return Response.json(
      { ok: false, error: "ステータスの更新に失敗しました" },
      { status: 500 }
    );
  }

  const message = isServerless
    ? "デモ生成を外部プロセス（handoff-watch）に委譲しました。完了すると自動的にステータスが更新されます。"
    : "デモ生成を開始しました（ローカルの外部プロセスに委譲）。";

  return Response.json({
    ok: true,
    status: "demo_generating",
    submissionId,
    handoffType: handoffResult.handoffType,
    // 起動方法の透明化（UI で案内分岐に使える）
    delegated: true,
    spawnAttempted,
    serverless: isServerless,
    message,
  });
}
