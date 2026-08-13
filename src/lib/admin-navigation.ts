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

export interface AdminRouteLink extends AdminQuickLink {
  shortPath: string;
  description: string;
  tone: "neutral" | "review" | "demo" | "execution" | "interview";
  primary: boolean;
  available: boolean;
  availabilityNote?: string;
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
  return getAdminRouteLinks(status, submissionId).map(({ key, href, label }) => ({
    key,
    href,
    label,
  }));
}

/**
 * 一覧や詳細で使う、説明つきのルートリンク情報。
 * 非技術ユーザーにも分かりやすいよう、用途説明・短いパス表示・主リンク判定を含める。
 */
export function getAdminRouteLinks(
  status: string,
  submissionId: string,
): AdminRouteLink[] {
  const links: AdminRouteLink[] = [
    {
      key: "detail",
      href: `/admin/${submissionId}`,
      shortPath: `/admin/${submissionId}`,
      label: "管理詳細",
      description: "社内の進行・承認操作を開く",
      tone: "neutral",
      primary: false,
      available: true,
    },
    {
      key: "review",
      href: `/review/${submissionId}`,
      shortPath: `/review/${submissionId}`,
      label: "レビュー画面",
      description: "ブリーフ・計画・内部レビュー内容を確認",
      tone: "review",
      primary: false,
      available: true,
    },
    {
      key: "demo",
      href: `/demo/${submissionId}`,
      shortPath: `/demo/${submissionId}`,
      label: "実際のデモホームページ",
      description: "お客様が確認する最終デモページ",
      tone: "demo",
      primary: false,
      available: DEMO_VISIBLE_STATUSES.has(status),
      availabilityNote: DEMO_VISIBLE_STATUSES.has(status)
        ? "現在このデモを開けます"
        : "まだデモ未生成です。デモ生成後に開けます",
    },
    {
      key: "execution",
      href: `/execution/${submissionId}`,
      shortPath: `/execution/${submissionId}`,
      label: "内部プレビュー",
      description: "生成中・実装途中を確認する内部ページ",
      tone: "execution",
      primary: false,
      available: DEMO_VISIBLE_STATUSES.has(status) || status === "approved_for_execution" || status === "demo_generating",
      availabilityNote:
        DEMO_VISIBLE_STATUSES.has(status) || status === "approved_for_execution" || status === "demo_generating"
          ? "内部確認用として開けます"
          : "デモ準備完了後に使う内部プレビューです",
    },
  ];

  if (INTERVIEW_RELEVANT_STATUSES.has(status)) {
    links.push({
      key: "interview",
      href: `/interview/${submissionId}`,
      shortPath: `/interview/${submissionId}`,
      label: "ヒアリング画面",
      description: "本制作前の追加質問・回答を確認",
      tone: "interview",
      primary: false,
      available: true,
    });
  }

  const primaryKey: AdminQuickLinkKey =
    DEMO_VISIBLE_STATUSES.has(status)
      ? "demo"
      : status === "approved_for_execution" || status === "demo_generating"
        ? "execution"
        : status === "customer_approved" ||
            status === "pre_production_interview" ||
            status === "pre_production_review"
          ? "interview"
          : "review";

  return links.map((link) => ({
    ...link,
    primary: link.key === primaryKey,
  }));
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
  | "representative_action"
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

/** ティア 0 = 代表アクション待ちステータス集合。 */
const REPRESENTATIVE_ACTION_STATUSES = new Set<string>([
  "awaiting_representative_approval",
  "awaiting_plan_approval",
  "customer_approved",
  "pre_production_review",
  "production_ready",
]);

export const ADMIN_FILTER_GROUPS: AdminFilterGroup[] = [
  { key: "all", label: "すべて" },
  {
    key: "representative_action",
    label: "代表アクション待ち",
    statuses: REPRESENTATIVE_ACTION_STATUSES,
  },
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

/* ------------------------------------------------------------------ */
/*  優先度ソート（デフォルトの表示順）                                     */
/* ------------------------------------------------------------------ */
/*  代表が「今すぐ動くべき相談」を一覧の上に寄せるための、決定的な並べ替え。   */
/*  テキストの部分一致ではなく、明示的なステータス集合でティアを定義する。     */
/*                                                                          */
/*  ApprovalStatus（src/lib/approval-package.ts 参照）の全 16 状態を網羅。   */
/*                                                                          */
/*  ティア 0: 代表アクション待ち — 代表が動かないと進まない状態。             */
/*           （各種承認待ち・ヒアリング開始・第3ゲート承認・納品など）         */
/*  ティア 1: 能動ループ作業中 — 自動進行中、または顧客・システム待ちで        */
/*           代表の直接アクションを必要としないが進行中の状態。                */
/*  ティア 2: 完了・終了 — 納品済み・却下など、もう動く必要がない状態。         */
/*                                                                          */
/*  上記 2 集合（ティア 0 / ティア 2）のどちらにも属さないステータスは          */
/*  自動的にティア 1 になる。未知のステータスもティア 1 にフォールバックし、    */
/*  一覧の最下部に埋もれないようにする（完了扱いにはしない）。                  */
/* ------------------------------------------------------------------ */

/**
 * 完了・終了（ティア 2）。もう代表が動く必要がない状態。
 */
const COMPLETED_STATUSES = new Set<string>(["delivered", "rejected"]);

/** 未知のステータスのフォールバック先ティア（能動ループ作業中として扱う）。 */
const DEFAULT_PRIORITY_TIER = 1;

/** 優先度ティアの表示用ラベル（デバッグ・UI 補助用）。 */
export const ADMIN_PRIORITY_TIER_LABELS: Record<number, string> = {
  0: "代表アクション待ち",
  1: "能動ループ作業中",
  2: "完了・終了",
};

/**
 * ステータスから優先度ティアを取得する。
 *  0 = 代表アクション待ち（最優先）
 *  1 = 能動ループ作業中
 *  2 = 完了・終了（最後尾）
 *
 * 判定はステータス集合への所属のみで行い、決定的かつテキスト照合を含まない。
 */
export function getAdminPriorityTier(status: string): number {
  if (REPRESENTATIVE_ACTION_STATUSES.has(status)) return 0;
  if (COMPLETED_STATUSES.has(status)) return 2;
  return DEFAULT_PRIORITY_TIER;
}

/**
 * 相談一覧を受信日時の降順（新しい順）で固定ソートする。
 *
 * 元の配列は変更せず、シャローコピーを並べ替えて返す。
 * receivedAt は ISO 8601 文字列を前提とし、辞書順比較で時系列順序と一致する。
 */
export function sortSubmissionsByPriority<
  T extends { status: string; receivedAt: string }
>(submissions: T[]): T[] {
  return [...submissions].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}
