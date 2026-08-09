import Link from "next/link";
import { notFound } from "next/navigation";
import { readApprovalPackage } from "@/lib/approval-package";
import { isSafeSubmissionId } from "@/server/submission-storage";
import { InterviewForm } from "./InterviewForm";

/* ------------------------------------------------------------------ */
/*  /interview/[submissionId] — 本制作前ヒアリング（顧客向け・日本語）  */
/* ------------------------------------------------------------------ */
/*  顧客がデモを承認したあと、本制作を始める前に追加で伺うヒアリングと    */
/*  追加素材のアップロードを行う顧客向けページ。                          */
/*                                                                        */
/*  状態は approval-package.json（readApprovalPackage）から直接読む。      */
/*  demo / review ページと同じサーバー読み取りパターンで、GET API 不要。   */
/*                                                                        */
/*  表示分岐:                                                              */
/*    - ヒアリング未起票（preProductionInterview == null）                 */
/*        → 「準備中」の案内                                              */
/*    - 回答済み（answers != null）                                       */
/*        → 完了メッセージ                                                */
/*    - 回答待ち（answers == null）                                       */
/*        → InterviewForm を表示                                          */
/* ------------------------------------------------------------------ */

interface InterviewPageProps {
  params: Promise<{ submissionId: string }> | { submissionId: string };
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { submissionId } = await params;

  if (!isSafeSubmissionId(submissionId)) {
    notFound();
  }

  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) {
    notFound();
  }

  const interview = pkg.preProductionInterview;
  const answered = interview?.answers != null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {/* ---- ヘッダー ---- */}
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">本制作前ヒアリング</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            最後に、もう少しだけお伺いします
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            デモをご承認いただきありがとうございます。本制作を始める前に、
           ホームページの方向性をより確実にするため、いくつか質問させていただきます。
            お手数ですが、以下の項目にお答えください。
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            受領 ID: <span className="font-mono">{pkg.submissionId}</span>
          </p>
        </div>

        {/* ---- 本文（状態別） ---- */}
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
          {/* ヒアリング未起票 */}
          {!interview && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
              <p className="text-2xl">⏳</p>
              <h2 className="mt-3 text-lg font-bold text-amber-900">
                まだヒアリングの準備ができていません
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-amber-800">
                担当者からのヒアリング依頼をお待ちください。準備が整い次第、
                このページに質問が表示されます。
              </p>
            </div>
          )}

          {/* 回答済み */}
          {interview && answered && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
              <p className="text-2xl">✅</p>
              <h2 className="mt-3 text-lg font-bold text-emerald-900">
                ご回答ありがとうございました
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-emerald-800">
                ヒアリングへのご回答は受け付け済みです。
                頂いた内容を確認のうえ、本制作の最終判断を進めます。
              </p>
              {interview.answeredAt && (
                <p className="mt-3 text-xs text-emerald-700">
                  回答日時: {interview.answeredAt}
                </p>
              )}
            </div>
          )}

          {/* 回答待ち → フォーム */}
          {interview && !answered && (
            <InterviewForm
              submissionId={pkg.submissionId}
              questions={interview.questions.map((q) => ({
                id: q.id,
                text: q.text,
                required: q.required,
                placeholder: q.placeholder,
              }))}
              additionalMaterialCount={interview.additionalMaterialCount}
            />
          )}
        </div>

        {/* ---- フッター ---- */}
        <div className="mt-8 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            トップページへ
          </Link>
        </div>
      </div>
    </div>
  );
}

// 動的レンダリングを指定（実行時に状態が決まるため）
export const dynamic = "force-dynamic";
