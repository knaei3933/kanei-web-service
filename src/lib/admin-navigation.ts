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

/* ------------------------------------------------------------------ */
/*  クイックリンクの配色（ボタン風）                                       */
/* ------------------------------------------------------------------ */
/*  各リンクを遷移先の役割ごとの色で強調し、一覧から一目で判別できるように   */
/*  する。Tailwind がクラスを静的に検出できるよう、リテラル文字列で保持する。 */
/* ------------------------------------------------------------------ */

const QUICK_LINK_STYLES: Record<AdminQuickLinkKey, string> = {
  detail: "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-300",
  review: "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
  demo: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
  execution: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
  interview: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
};

/**
 * クイックリンクのキーに対応する配色（Tailwind クラス）を返す。
 * 呼び出し側でベースの配置クラス（rounded-md や padding など）と組み合わせて使う。
 */
export function getAdminQuickLinkStyle(key: AdminQuickLinkKey): string {
  return QUICK_LINK_STYLES[key];
}

/* ------------------------------------------------------------------ */
/*  フィルタ（一覧の実務状態タブ）                                          */
/* ------------------------------------------------------------------ */
/*  代表が一覧でよく使う局面ごとにステータスを束ねた集合。                   */
/*  各タブは独立したビューで、同じ相談が複数タブに含まれることがある。         */
/*                                                                        */
/*  - デモ生成済み     : デモが生成済みで表示可能な状態（DEMO_VISIBLE_STATUSES）*/
/*  - ヒアリング進行中 : 顧客承認後〜本制作着手前の能動的なヒアリングループ   */
/*                      （production_ready / delivered は着手済みのため除外） */
/*  - 本制作可能       : 本制作に着手できる／完了した状態                   */
/* ------------------------------------------------------------------ */

export type AdminFilterKey =
  | "all"
  | "demo_generated"
  | "hearing_in_progress"
  | "production_ready";

export interface AdminFilterGroup {
  key: AdminFilterKey;
  label: string;
  /** undefined のときは「すべて」を意味し、ステータスで絞り込まない。 */
  statuses?: Set<string>;
}

/**
 * 一覧のフィルタタブ定義。配列順がそのままタブの表示順になる。
 */
export const ADMIN_FILTER_GROUPS: AdminFilterGroup[] = [
  { key: "all", label: "すべて" },
  {
    key: "demo_generated",
    label: "デモ生成済み",
    statuses: DEMO_VISIBLE_STATUSES,
  },
  {
    key: "hearing_in_progress",
    label: "ヒアリング進行中",
    statuses: new Set<string>([
      "customer_approved",
      "pre_production_interview",
      "pre_production_review",
    ]),
  },
  {
    key: "production_ready",
    label: "本制作可能",
    statuses: new Set<string>(["production_ready", "delivered"]),
  },
];

/**
 * 相談一覧を指定フィルタで絞り込む。
 * statuses が未定義（「すべて」）のときはそのまま返す。
 * 判定はステータス集合への所属のみで行い、決定的かつ単純。
 */
export function filterSubmissionsByStatus<T extends { status: string }>(
  submissions: T[],
  filterKey: AdminFilterKey,
): T[] {
  const statuses = ADMIN_FILTER_GROUPS.find((g) => g.key === filterKey)?.statuses;
  if (!statuses) return submissions;
  return submissions.filter((s) => statuses.has(s.status));
}
