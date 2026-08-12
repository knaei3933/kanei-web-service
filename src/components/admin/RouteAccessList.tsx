"use client";

import Link from "next/link";
import {
  getAdminRouteLinks,
  type AdminQuickLinkKey,
  type AdminRouteLink,
} from "@/lib/admin-navigation";

/**
 * 管理画面で「いま開けるページ」を一覧する、コンパクトなナビゲーション。
 *
 * 従来の「大きな縦長カード（説明文 ＋ 可用性メモ ＋ 折りたたみパス）」をやめ、
 * データベースの1行のように scan できる密度にしている。
 * 各ルートは1行で、左から順に:
 *   役割チップ → ラベル → モノスペースの短いパス → 状態バッジ
 *
 * 可用性（どのステータスで開けるか）のルールは getAdminRouteLinks に一本化されて
 * おり、このコンポーネントはそれを上書きしない。/admin の一覧と /admin/[id] の
 * 詳細の両方から使い回す。
 */

// 役割（role）の短いラベル。チップと色で demo / execution / review / admin /
// interview を区別する。tone の配色と合わせて判別させる。
const ROLE_LABELS: Record<AdminQuickLinkKey, string> = {
  detail: "管理",
  review: "レビュー",
  demo: "デモ",
  execution: "実装",
  interview: "ヒアリング",
};

// 役割チップの配色（tone に対応）。Tailwind が静的に検出できるよう完全修飾で持つ。
const ROLE_CHIP_TONES: Record<AdminRouteLink["tone"], string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-600",
  review: "border-indigo-200 bg-indigo-100 text-indigo-700",
  demo: "border-sky-200 bg-sky-100 text-sky-700",
  execution: "border-violet-200 bg-violet-100 text-violet-700",
  interview: "border-emerald-200 bg-emerald-100 text-emerald-700",
};

// プライマリ行（いま開くべきページ）の左アクセントと背景。tone ごとに色を変える。
const PRIMARY_ROW_TONES: Record<AdminRouteLink["tone"], string> = {
  neutral: "border-l-slate-400 bg-slate-50",
  review: "border-l-indigo-400 bg-indigo-50/70",
  demo: "border-l-sky-400 bg-sky-50/70",
  execution: "border-l-violet-400 bg-violet-50/70",
  interview: "border-l-emerald-400 bg-emerald-50/70",
};

type RouteStatus = { label: string; cls: string; openable: boolean };

/**
 * 状態バッジを3種類に分ける。
 *   open(主・開ける) / ready(開ける) / pending(準備中)
 * available は getAdminRouteLinks 側の可用性ロジックそのまま。
 */
function getRouteStatus(link: AdminRouteLink): RouteStatus {
  if (!link.available) {
    return {
      label: "準備中",
      cls: "bg-gray-100 text-gray-500 border-gray-200",
      openable: false,
    };
  }
  if (link.primary) {
    return {
      label: "開く",
      cls: "bg-emerald-600 text-white border-emerald-600",
      openable: true,
    };
  }
  return {
    label: "可能",
    cls: "bg-white text-slate-600 border-slate-300",
    openable: true,
  };
}

/**
 * ルート1行分。1行を保つため、ラベルとパスは truncate する。
 * パスは details/summary の折りたたみを廃止し、常にモノスペースで見せる。
 */
function RouteRow({ link }: { link: AdminRouteLink }) {
  const status = getRouteStatus(link);
  return (
    <Link
      href={link.available ? link.href : "#"}
      aria-disabled={!link.available}
      aria-label={`${link.label}（${status.label}）`}
      target={link.available ? "_blank" : undefined}
      rel={link.available ? "noopener noreferrer" : undefined}
      className={`group flex items-center gap-2 rounded-md border-l-2 px-2.5 py-1.5 text-xs transition ${
        link.available ? "hover:bg-slate-100" : "cursor-not-allowed opacity-60"
      } ${link.primary ? PRIMARY_ROW_TONES[link.tone] : "border-l-transparent"}`}
    >
      <span
        className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_CHIP_TONES[link.tone]}`}
      >
        {ROLE_LABELS[link.key]}
      </span>
      <span
        className={`min-w-0 flex-1 truncate ${
          link.primary ? "font-semibold text-foreground" : "text-muted-foreground"
        }`}
        title={link.label}
      >
        {link.label}
      </span>
      <code
        className="min-w-0 max-w-[40%] shrink truncate font-mono text-[10px] text-slate-400"
        title={link.shortPath}
      >
        {link.shortPath}
      </code>
      <span
        className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}
      >
        {status.label}
        {status.openable ? <span aria-hidden>→</span> : null}
      </span>
    </Link>
  );
}

/**
 * route-access セクション。/admin の一覧セルにも /admin/[id] の詳細にも置ける。
 * showHeader を true にすると、上部に小さな見出しと submissionId を出す
 * （一覧のテーブルセル内では列見出しと重複するため false で使う）。
 */
export function RouteAccessList({
  submissionId,
  status,
  showHeader = false,
}: {
  submissionId: string;
  status: string;
  showHeader?: boolean;
}) {
  const links = getAdminRouteLinks(status, submissionId);
  // プライマリ（いま開くべきページ）を先頭にし、残りは定義順。
  const ordered = [...links].sort(
    (a, b) => Number(b.primary) - Number(a.primary),
  );

  return (
    <div className="w-full">
      {showHeader ? (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            アクセス先
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/70">
            {submissionId}
          </span>
        </div>
      ) : null}
      <div className="space-y-1">
        {ordered.map((link) => (
          <RouteRow key={link.key} link={link} />
        ))}
      </div>
    </div>
  );
}
