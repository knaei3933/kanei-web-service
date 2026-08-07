import Link from "next/link";
import { notFound } from "next/navigation";
import { readApprovalPackage } from "@/lib/approval-package";

interface ReviewPageProps {
  params: Promise<{ submissionId: string }> | { submissionId: string };
}

function statusLabel(status: string): string {
  switch (status) {
    case "needs_followup":
      return "追加情報待ち";
    case "awaiting_representative_approval":
      return "代表確認待ち";
    case "approved_for_planning":
      return "計画着手承認済み";
    case "rejected":
      return "却下";
    default:
      return status;
  }
}

function statusTone(status: string): string {
  switch (status) {
    case "needs_followup":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "approved_for_planning":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "rejected":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-blue-100 text-blue-800 border-blue-200";
  }
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">該当なし</p>;
  }
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const resolvedParams = await Promise.resolve(params);
  const submissionId = resolvedParams?.submissionId;

  if (!submissionId) notFound();

  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Internal Review</p>
            <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
              相談レビュー #{pkg.submissionId}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              顧客向けには表示しない内部レビュー画面です。品質判定、参考URL整理、
              プロンプトチェーン、承認状態をここで確認します。
            </p>
          </div>
          <div
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${statusTone(pkg.status)}`}
          >
            {statusLabel(pkg.status)}
          </div>
        </div>

        <div className="grid gap-6">
          <Section title="概要">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-muted-foreground">受領日時</p>
                <p className="mt-1 text-sm text-foreground">{pkg.receivedAt}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">顧客向け表示状態</p>
                <p className="mt-1 text-sm text-foreground">{pkg.customerFacingStatus}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-bold text-muted-foreground">事業要約</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {pkg.reviewSummary.businessSummary || "未整理"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">ターゲット要約</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {pkg.reviewSummary.targetUserSummary || "未整理"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">レビューURL</p>
                <p className="mt-1 break-all text-sm text-foreground">
                  {pkg.reviewUrl || "未設定"}
                </p>
              </div>
            </div>
          </Section>

          <Section title="品質判定">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-accent p-4">
                <p className="text-xs font-bold text-muted-foreground">status</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {pkg.intakeQuality.status}
                </p>
              </div>
              <div className="rounded-2xl bg-accent p-4">
                <p className="text-xs font-bold text-muted-foreground">score</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {pkg.intakeQuality.score}
                </p>
              </div>
              <div className="rounded-2xl bg-accent p-4">
                <p className="text-xs font-bold text-muted-foreground">判定メモ</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {pkg.intakeQuality.status === "ready" ? "進行可能" : "追加確認必要"}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">理由</p>
                <BulletList items={pkg.intakeQuality.reasons} />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">不足項目</p>
                <BulletList items={pkg.intakeQuality.requestedItems} />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">追加入力質問</p>
                <BulletList items={pkg.intakeQuality.followupQuestions} />
              </div>
            </div>
          </Section>

          <Section title="参考URL / 素材分析">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">参考URL</p>
                <BulletList items={pkg.referenceAnalysis.referenceUrls} />
                <p className="mb-2 mt-5 text-sm font-bold text-foreground">抽出対象URL</p>
                <BulletList items={pkg.referenceAnalysis.urlsEligibleForExtraction} />
                <p className="mb-2 mt-5 text-sm font-bold text-foreground">抽出したい部位</p>
                <BulletList items={pkg.referenceAnalysis.sectionTargets} />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">利用可能素材</p>
                <BulletList items={pkg.materialsAnalysis.usableAssets} />
                <p className="mb-2 mt-5 text-sm font-bold text-foreground">不足素材</p>
                <BulletList items={pkg.materialsAnalysis.missingAssets} />
                <p className="mb-2 mt-5 text-sm font-bold text-foreground">添付ファイル</p>
                {pkg.materialsAnalysis.availableAttachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">添付なし</p>
                ) : (
                  <ul className="space-y-2 text-sm text-foreground">
                    {pkg.materialsAnalysis.availableAttachments.map((file) => (
                      <li key={`${file.savedName}-${file.sizeBytes}`} className="rounded-xl bg-accent p-3">
                        <div className="font-medium">{file.originalName}</div>
                        <div className="text-xs text-muted-foreground">
                          {file.kind} / {file.sizeBytes.toLocaleString()} bytes
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Section>

          <Section title="内部プロンプトチェーン（代表専用）">
            <div className="space-y-4">
              {pkg.promptChainPreview.map((stage, index) => (
                <div key={stage.id} className="rounded-2xl border border-border bg-slate-50 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-primary">STEP {index + 1}</p>
                      <h3 className="mt-1 text-base font-bold text-foreground">{stage.title}</h3>
                    </div>
                    {stage.requiresRepresentativeApprovalBeforeContinue && (
                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        承認後のみ進行
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground">{stage.objective}</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-bold text-muted-foreground">入力</p>
                      <BulletList items={stage.inputs} />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-bold text-muted-foreground">期待成果物</p>
                      <BulletList items={stage.expectedOutputs} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="承認アクション">
            <div className="grid gap-6 sm:grid-cols-2">
              <form action="/api/consult/approve" method="post" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <input type="hidden" name="submissionId" value={pkg.submissionId} />
                <input type="hidden" name="redirectTo" value={`/review/${pkg.submissionId}`} />
                <input type="hidden" name="approvedBy" value="대표님" />
                <label className="block text-sm font-bold text-emerald-900">承認メモ</label>
                <textarea
                  name="memo"
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-foreground outline-none ring-0"
                  placeholder="計画着手に向けた指示メモ"
                />
                <button className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700">
                  計画着手を承認する
                </button>
              </form>

              <form action="/api/consult/reject" method="post" className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                <input type="hidden" name="submissionId" value={pkg.submissionId} />
                <input type="hidden" name="redirectTo" value={`/review/${pkg.submissionId}`} />
                <input type="hidden" name="approvedBy" value="대표님" />
                <label className="block text-sm font-bold text-rose-900">却下/保留メモ</label>
                <textarea
                  name="memo"
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-foreground outline-none ring-0"
                  placeholder="差し戻し理由や保留メモ"
                />
                <button className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-rose-600 px-5 py-3 text-sm font-bold text-white hover:bg-rose-700">
                  却下する
                </button>
              </form>
            </div>

            <div className="mt-6 rounded-2xl bg-accent p-4 text-sm text-muted-foreground">
              現在の判定: <span className="font-semibold text-foreground">{statusLabel(pkg.status)}</span>
              {pkg.approval.decidedAt && (
                <span>
                  {" "}
                  / {pkg.approval.decidedAt}
                </span>
              )}
              {pkg.approval.memo && (
                <p className="mt-2 text-foreground">メモ: {pkg.approval.memo}</p>
              )}
            </div>
          </Section>

          <div className="flex items-center justify-between gap-3">
            <Link href="/consult" className="text-sm font-medium text-primary hover:underline">
              /consult に戻る
            </Link>
            <Link href="/" className="text-sm font-medium text-primary hover:underline">
              トップページへ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
