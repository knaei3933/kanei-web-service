import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoFeedbackForm } from "./DemoFeedbackForm";
import { readApprovalPackage } from "@/lib/approval-package";
import { isSafeSubmissionId } from "@/server/submission-storage";
import { SHOWCASE_MAP } from "@/lib/showcase-map";

interface DemoPageProps {
  params: Promise<{ submissionId: string }> | { submissionId: string };
}

// デモ未生成時のプレースホルダーコンポーネント
function DemoNotReadyPlaceholder() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
      <div className="max-w-md text-center px-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
          <Sparkles className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-slate-900">
          デモはまだ準備できていません
        </h3>
        <p className="text-sm text-slate-600">
          デモの準備ができ次第、こちらに表示されます。
        </p>
      </div>
    </div>
  );
}

export default async function DemoPage({ params }: DemoPageProps) {
  const { submissionId } = await params;

  // submissionId のバリデーション（パストラバーサル対策）
  if (!isSafeSubmissionId(submissionId)) {
    notFound();
  }

  // approval-package.json から情報を取得
  const approvalPackage = await readApprovalPackage(submissionId);

  // デモは顧客確認待ち（demo_deployed / demo_revised）だけでなく、
  // 承認後・本制作前ヒアリング・納品後など「デモ以降」のステータスでも
  // 担当者がいつでも再確認できるよう表示する。
  const DEMO_VISIBLE_STATUSES = new Set([
    "demo_deployed",
    "demo_revised",
    "customer_approved",
    "pre_production_interview",
    "pre_production_review",
    "production_ready",
    "delivered",
  ]);
  const isDemoVisible =
    !!approvalPackage && DEMO_VISIBLE_STATUSES.has(approvalPackage.status);

  if (!isDemoVisible) {
    notFound();
  }

  // SHOWCASE_MAP にエントリがなければプレースホルダー表示
  const showcaseEntry = SHOWCASE_MAP[submissionId];
  const ShowcaseComponent = showcaseEntry
    ? (await showcaseEntry.loader()).default
    : null;

  // approval-package.json から企業名・業種を取得
  const enterpriseName =
    approvalPackage.reviewSummary.businessSummary.match(/事業体=([^/]+)/)?.[1] ||
    showcaseEntry?.enterpriseName ||
    "企業名";
  const businessType =
    approvalPackage.reviewSummary.businessSummary.match(/事業種=([^/]+)/)?.[1] ||
    showcaseEntry?.businessType ||
    "業種";

  return (
    <div className="bg-slate-50">
      {/* ============================================================ */}
      {/*  管理バー（デモであることを示す）                                  */}
      {/* ============================================================ */}
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-container items-start gap-3 px-4 py-3 sm:items-center">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 sm:mt-0" />
          <p className="text-sm leading-relaxed text-amber-900">
            これはご相談内容をもとに
            <span className="font-bold">AIが作成したデモ</span>
            です。
            実際の制作では、デザイン・原稿・写真をさらに詰めてまいります。
            <span className="hidden sm:inline">
              {" "}
              （受領 ID: <span className="font-mono">{submissionId}</span>）
            </span>
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ヘッダー（戻るリンク・企業情報）                                  */}
      {/* ============================================================ */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-container px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                トップに戻る
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
                <span>{enterpriseName}</span>
                <span className="text-slate-300">/</span>
                <span>{businessType}</span>
                <span className="text-slate-300">/</span>
                <span>デモ確認</span>
              </div>
              {/* ページ最上部からフィードバックフォームへジャンプするボタン。
                  お客様がデモを見ながら、いつでも簡単にご意見を送れる導線。 */}
              <Button asChild size="sm">
                <a href="#feedback">
                  <MessageSquare className="mr-1 h-4 w-4" />
                  フィードバックを送る
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  メインコンテンツ（動的 showcase コンポーネント）                    */}
      {/* ============================================================ */}
      {ShowcaseComponent ? (
        <ShowcaseComponent />
      ) : (
        <DemoNotReadyPlaceholder />
      )}

      {/* ============================================================ */}
      {/*  フィードバックフォーム                                          */}
      {/* ============================================================ */}
      <div
        id="feedback"
        className="scroll-mt-24 border-t border-amber-200 bg-slate-50"
      >
        <div className="mx-auto max-w-container px-4 py-8">
          <DemoFeedbackForm submissionId={submissionId} />
        </div>
      </div>

      {/* ============================================================ */}
      {/*  フッターコメント                                               */}
      {/* ============================================================ */}
      <footer className="border-t bg-slate-100">
        <div className="mx-auto max-w-container px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            このデモはご相談内容をもとにAIが自動生成しました。
          </p>
          <p className="mt-1 text-xs text-slate-400">
            最終的なサイトとはデザイン・原稿・写真が異なる場合があります。
          </p>
        </div>
      </footer>
    </div>
  );
}

// 動的レンダリングを指定（実行時に決定するため）
export const dynamic = "force-dynamic";
