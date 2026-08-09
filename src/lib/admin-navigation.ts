/* ------------------------------------------------------------------ */
/*  管理画面のクイックリンク（ナビゲーション）                            */
/* ------------------------------------------------------------------ */
/*  ダッシュボード（/admin）と詳細ページ（/admin/[id]）の両方から、       */
/*  関連ページへジャンプするためのリンクをステータスに基づいて算出する。   */
/*                                                                      */
/*  各ページの表示条件と整合する「可視性ルール」をここに集約し、          */
/*  リンク先が 404 になる組み合わせを極力出さないようにしている。         */
/*                                                                      */
/*  ルートごとの可視性ルール（本ヘルパが前提とする条件）:                */
/*    - /admin/[id]   (詳細): approval package があれば常時表示            */
/*    - /review/[id]  (レビュー): approval package があれば常時表示        */
/*    - /demo/[id]    (デモ): DEMO_VISIBLE_STATUSES のとき表示            */
/*        （承認・ヒアリング・納品後も担当者が再確認できる）              */
/*    - /execution/[id] (実装プレビュー): デモ生成以降で参照可能          */
/*        （showcase が無ければプレースホルダを表示し 404 にはならない）  */
/*    - /interview/[id] (ヒアリング): INTERVIEW_RELEVANT_STATUSES のとき  */
/*        （未起票でも「準備中」を表示するが、関連局面でのみリンクを出す）*/
/* ------------------------------------------------------------------ */

export type AdminQuickLinkKey =
  | "detail"
  | "review"
  | "demo"
  | "execution"
  | "interview";

export interface AdminQuickLink {
  key: AdminQuickLinkKey;
  href: string;
  label: string;
}

const LABELS: Record<AdminQuickLinkKey, string> = {
  detail: "詳細",
  review: "レビュー",
  demo: "デモ",
  execution: "実装プレビュー",
  interview: "ヒアリング",
};

/**
 * デモページ（/demo/[id]）が表示可能なステータス。
 * demo/[id]/page.tsx の isDemoVisible と同じ集合。
 * デモが一度でもデプロイされた後は、承認・ヒアリング・納品後も再確認できる。
 */
const DEMO_VISIBLE_STATUSES = new Set<string>([
  "demo_deployed",
  "demo_revised",
  "customer_approved",
  "pre_production_interview",
  "pre_production_review",
  "production_ready",
  "delivered",
]);

/**
 * ヒアリングページ（/interview/[id]）が意味を持つステータス。
 * 顧客がデモを承認（customer_approved）して以降でのみ関連する。
 * （interview ページ自体は未起票でも「準備中」を表示して 404 にはならないが、
 *   関連する局面でのみリンクを出すためこの集合で制限する）
 */
const INTERVIEW_RELEVANT_STATUSES = new Set<string>([
  "customer_approved",
  "pre_production_interview",
  "pre_production_review",
  "production_ready",
  "delivered",
]);

/**
 * 指定ステータスで表示すべきクイックリンク一覧を返す。
 * 表示順: 詳細 → レビュー → デモ → 実装プレビュー → ヒアリング。
 *
 * - 詳細（/admin/[id]）・レビュー（/review/[id]）は approval package が
 *   あれば常時表示可能なため、すべてのステータスで出す。
 * - デモ（/demo/[id]）は DEMO_VISIBLE_STATUSES のときのみ。
 * - 実装プレビュー（/execution/[id]）もデモ生成以降で参照可能。
 * - ヒアリング（/interview/[id]）は INTERVIEW_RELEVANT_STATUSES のときのみ。
 */
export function getAdminQuickLinks(
  status: string,
  submissionId: string,
): AdminQuickLink[] {
  const links: AdminQuickLink[] = [
    { key: "detail", href: `/admin/${submissionId}`, label: LABELS.detail },
    { key: "review", href: `/review/${submissionId}`, label: LABELS.review },
  ];

  if (DEMO_VISIBLE_STATUSES.has(status)) {
    links.push({ key: "demo", href: `/demo/${submissionId}`, label: LABELS.demo });
    links.push({
      key: "execution",
      href: `/execution/${submissionId}`,
      label: LABELS.execution,
    });
  }

  if (INTERVIEW_RELEVANT_STATUSES.has(status)) {
    links.push({
      key: "interview",
      href: `/interview/${submissionId}`,
      label: LABELS.interview,
    });
  }

  return links;
}
