"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ADMIN_FILTER_GROUPS,
  filterSubmissionsByStatus,
  getAdminPriorityTier,
  sortSubmissionsByPriority,
  type AdminFilterKey,
} from "@/lib/admin-navigation";
import { RouteAccessList } from "@/components/admin/RouteAccessList";
import { isSafeInternalPath } from "@/lib/admin-return-to";

type Submission = {
  id: string;
  status: string;
  companyName: string;
  receivedAt: string;
  score: number;
  businessType: string;
};

/** 認証の状態。保存された secret は API で検証するまで信用しない。 */
type AuthStatus = "checking" | "unauthed" | "authed";

const STATUS_LABELS: Record<string, string> = {
  received: "受領済み",
  needs_followup: "追加情報待ち",
  awaiting_representative_approval: "代表確認待ち",
  awaiting_plan_approval: "計画承認待ち",
  approved_for_execution: "実行準備完了",
  rejected: "却下",
  demo_generating: "デモ生成中",
  demo_deployed: "顧客確認待ち",
  demo_revision_ready: "修正準備中",
  demo_revised: "修正版確認待ち",
  customer_approved: "顧客承認済み",
  production_ready: "本制作準備完了",
  delivered: "納品済み",
};

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const styles: Record<string, string> = {
    received: "bg-blue-100 text-blue-800 border-blue-200",
    needs_followup: "bg-amber-100 text-amber-800 border-amber-200",
    awaiting_representative_approval: "bg-blue-100 text-blue-800 border-blue-200",
    awaiting_plan_approval: "bg-indigo-100 text-indigo-800 border-indigo-200",
    approved_for_execution: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
    demo_generating: "bg-purple-100 text-purple-800 border-purple-200",
    demo_deployed: "bg-sky-100 text-sky-800 border-sky-200",
    demo_revision_ready: "bg-orange-100 text-orange-800 border-orange-200",
    demo_revised: "bg-sky-100 text-sky-800 border-sky-200",
    customer_approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    production_ready: "bg-violet-100 text-violet-800 border-violet-200",
    delivered: "bg-green-100 text-green-800 border-green-200",
  };
  const cls = styles[status] ?? "bg-blue-100 text-blue-800 border-blue-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-semibold tabular-nums">{score}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}

type ActionCellProps = {
  submissionId: string;
  status: string;
  onActionSuccess: () => void;
};

function ActionCell({ submissionId, status, onActionSuccess }: ActionCellProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDeliver = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/production/${submissionId}/deliver`, { method: "POST" });
      if (res.ok) {
        onActionSuccess();
      } else {
        alert("納品処理に失敗しました");
      }
    } catch (err) {
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (status === "demo_deployed" || status === "demo_revised") {
    return (
      <a
        href={`/demo/${submissionId}`}
        className="inline-flex items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100"
      >
        デモ確認
      </a>
    );
  }

  // customer_approved / pre_production_interview / pre_production_review:
  // 本制作前ループのアクション（ヒアリング開始・第3ゲート承認）は ADMIN_SECRET が
  // 必要なため、詳細ページ（/admin/[id]）へ誘導する。
  // TODO(Phase C): 一覧から直接ヒアリング開始できるようにするなら、secret を渡して
  // POST /api/consult/[id]/interview を呼ぶ。
  if (
    status === "customer_approved" ||
    status === "pre_production_interview" ||
    status === "pre_production_review"
  ) {
    const label =
      status === "customer_approved"
        ? "ヒアリング開始"
        : status === "pre_production_review"
          ? "第3ゲート承認"
          : "回答待ち";
    return (
      <button
        onClick={() => router.push(`/admin/${submissionId}`)}
        className="inline-flex items-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
      >
        {label} →
      </button>
    );
  }

  if (status === "production_ready") {
    return (
      <button
        onClick={handleDeliver}
        disabled={loading}
        className="inline-flex items-center rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50"
      >
        {loading ? "処理中..." : "納品"}
      </button>
    );
  }

  return <span className="text-xs text-muted-foreground">-</span>;
}

/**
 * 実務状態で一覧を絞り込むタブ。
 * /admin はクライアント側で動くため、この要素をデスクトップ・モバイル両方で
 * 共通して使う。各タブに該当件数を表示する。
 */
function FilterTabs({
  active,
  onChange,
  counts,
}: {
  active: AdminFilterKey;
  onChange: (key: AdminFilterKey) => void;
  counts: Record<AdminFilterKey, number>;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {ADMIN_FILTER_GROUPS.map((group) => {
        const isActive = group.key === active;
        const count = counts[group.key] ?? 0;
        return (
          <button
            key={group.key}
            type="button"
            onClick={() => onChange(group.key)}
            aria-pressed={isActive}
            className={
              isActive
                ? "inline-flex items-center gap-1.5 rounded-full border border-indigo-300 bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition"
                : "inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-slate-50 hover:text-foreground"
            }
          >
            {group.label}
            <span
              className={
                isActive
                  ? "inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-white/20 px-1.5 text-[10px] font-bold tabular-nums text-white"
                  : "inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-gray-100 px-1.5 text-[10px] font-bold tabular-nums text-gray-600"
              }
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * 運用に必要な件数を一目で把握するための KPI サマリー。
 * フィルタに対応するカードはクリックでそのタブへ切り替えられ、
 * 「代表アクション待ち」は対応するフィルタがないため強調表示の参照値とする。
 * モバイルは 2 列、タブレットは 3 列、デスクトップは 1 行に収まる 5 列。
 */
type KpiCardDef = {
  key: string;
  label: string;
  value: number;
  /** 未定義のときはクリック不可の参照値（フィルタに紐付かない強調カード）。 */
  filterKey?: AdminFilterKey;
  /** 強調カード（代表アクション待ち）の装飾に使う。 */
  accent?: boolean;
};

function KpiSummary({
  total,
  representativeAction,
  counts,
  active,
  onChange,
}: {
  total: number;
  representativeAction: number;
  counts: Record<AdminFilterKey, number>;
  active: AdminFilterKey;
  onChange: (key: AdminFilterKey) => void;
}) {
  const cards: KpiCardDef[] = [
    { key: "all", label: "全体受付", value: total, filterKey: "all" },
    {
      key: "representative_action",
      label: "代表アクション待ち",
      value: representativeAction,
      accent: true,
    },
    {
      key: "demo_generated",
      label: "デモ生成済み",
      value: counts.demo_generated,
      filterKey: "demo_generated",
    },
    {
      key: "hearing_in_progress",
      label: "ヒアリング進行中",
      value: counts.hearing_in_progress,
      filterKey: "hearing_in_progress",
    },
    {
      key: "production_ready",
      label: "本制作可能",
      value: counts.production_ready,
      filterKey: "production_ready",
    },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => {
        const filterKey = c.filterKey;
        const clickable = filterKey !== undefined;
        const isActive = clickable && filterKey === active;

        const containerCls = c.accent
          ? "border-amber-200 bg-amber-50"
          : isActive
            ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
            : "border-border bg-white transition hover:border-indigo-200 hover:shadow";
        const valueCls = c.accent
          ? "text-amber-700"
          : isActive
            ? "text-indigo-700"
            : "text-foreground";

        const inner = (
          <>
            <div className="text-xs font-medium text-muted-foreground">{c.label}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`text-2xl font-bold tabular-nums ${valueCls}`}>
                {c.value}
              </span>
              <span className="text-xs text-muted-foreground">件</span>
            </div>
          </>
        );

        const baseCls = `rounded-2xl border p-4 text-left shadow-sm ${containerCls}`;

        return clickable ? (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(filterKey as AdminFilterKey)}
            aria-pressed={isActive}
            className={baseCls}
          >
            {inner}
          </button>
        ) : (
          <div key={c.key} className={baseCls} aria-label={`${c.label} ${c.value}件`}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminListPage() {
  const router = useRouter();
  // 保存された secret は API で検証するまで認証済みとみなさない。
  // "checking" の間はログインフォームもダッシュボードも出さず、
  // 無効な認証でダッシュボードが一瞬見える（フラッシュする）のを防ぐ。
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  // ログイン画面に表示する認証エラー（無効なパスワード・セッション切れなど）。
  const [authError, setAuthError] = useState<string | null>(null);
  // ログイン送信中（ボタン無効化・二重送信防止）。
  const [loggingIn, setLoggingIn] = useState(false);
  const [password, setPassword] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<AdminFilterKey>("all");
  // ログイン成功後に戻るべき元のパス（/admin/[id] から送られた場合）。
  // URL の returnTo クエリから取り出し、isSafeInternalPath で検証してから使う。
  const [returnTo, setReturnTo] = useState<string | null>(null);

  // デフォルトの表示順（優先度ティア → 新着順）を一度だけ適用する。
  // フィルタ（タブ・KPI）はこの順序を保ったまま絞り込むため、
  // 全タブで「今すぐ動くべき相談」が上に来る。
  const sortedSubmissions = useMemo(
    () => sortSubmissionsByPriority(submissions),
    [submissions],
  );

  // 各フィルタタブの該当件数。submissions が変わったときだけ再計算する。
  const filterCounts = useMemo<Record<AdminFilterKey, number>>(() => {
    const result: Record<AdminFilterKey, number> = {
      all: 0,
      demo_generated: 0,
      hearing_in_progress: 0,
      production_ready: 0,
    };
    for (const group of ADMIN_FILTER_GROUPS) {
      result[group.key] = filterSubmissionsByStatus(sortedSubmissions, group.key).length;
    }
    return result;
  }, [sortedSubmissions]);

  // 代表が今すぐ動くべき相談（優先度ティア 0）の件数。KPI の強調カードに使う。
  const representativeActionCount = useMemo(
    () => sortedSubmissions.filter((s) => getAdminPriorityTier(s.status) === 0).length,
    [sortedSubmissions],
  );

  // 現在のタブで絞り込んだ一覧。デスクトップの表にもモバイルのカードにもこれを使う。
  const visibleSubmissions = useMemo(
    () => filterSubmissionsByStatus(sortedSubmissions, activeFilter),
    [sortedSubmissions, activeFilter],
  );

  /**
   * 保存された secret を信用せず、/api/admin/submissions で都度検証する。
   * 成功なら一覧を取得して "ok"、認証エラー(401)なら "unauthorized"、
   * 通信エラーなら "error" を返す。エラー表示は呼び出し元で切り替える。
   */
  const loadSubmissions = useCallback(
    async (token: string): Promise<"ok" | "unauthorized" | "error"> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/submissions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) return "unauthorized";
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSubmissions(data.submissions ?? []);
        return "ok";
      } catch (err) {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
        return "error";
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // セッションを破棄してログイン画面へ戻す（無効な認証・セッション切れの共通処理）。
  const backToLogin = useCallback((message: string) => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("admin_secret");
    }
    setSubmissions([]);
    setAuthError(message);
    setAuthStatus("unauthed");
  }, []);

  // 初回マウント: sessionStorage に secret があっても即認証とはみなさず、
  // API で検証してからダッシュボードを表示する。無効ならログイン画面へ戻す。
  useEffect(() => {
    const secret =
      typeof window !== "undefined" ? sessionStorage.getItem("admin_secret") : null;
    // 元のページへ戻るための returnTo を URL から取り出す。
    // 外部 URL やプロトコル相対 URL は後段（isSafeInternalPath）で弾く。
    const candidate =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("returnTo")
        : null;
    if (candidate) setReturnTo(candidate);

    if (!secret) {
      setAuthStatus("unauthed");
      return;
    }

    let cancelled = false;
    loadSubmissions(secret).then((outcome) => {
      if (cancelled) return;
      if (outcome === "ok") {
        // 有効な認証: 安全な returnTo があれば元のページへ復帰。
        if (candidate && isSafeInternalPath(candidate)) {
          router.replace(candidate);
          return;
        }
        setAuthStatus("authed");
      } else {
        backToLogin(
          outcome === "unauthorized"
            ? "認証に失敗しました。管理者パスワードをご確認ください。"
            : "認証情報の確認中にエラーが発生しました。もう一度入力してください。",
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadSubmissions, backToLogin, router]);

  // ログイン送信: 入力されたパスワードを API で検証し、成功時のみ secret を保存する。
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = password.trim();
    if (!trimmed || loggingIn) return;
    setAuthError(null);
    setLoggingIn(true);
    const outcome = await loadSubmissions(trimmed);
    if (outcome === "ok") {
      sessionStorage.setItem("admin_secret", trimmed);
      setPassword("");
      // 安全な returnTo があれば元のページへ戻す。なければ従来通り /admin 一覧を表示。
      if (returnTo && isSafeInternalPath(returnTo)) {
        router.replace(returnTo);
        return;
      }
      setAuthStatus("authed");
    } else if (outcome === "unauthorized") {
      setAuthError("認証に失敗しました。管理者パスワードをご確認ください。");
    } else {
      setAuthError("認証情報の確認中にエラーが発生しました。もう一度入力してください。");
    }
    setLoggingIn(false);
  };

  // 認証後の再取得（アクション成功後のリフレッシュ）。セッション切れはログインへ戻す。
  const fetchSubmissions = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? sessionStorage.getItem("admin_secret") : null;
    if (!token) {
      backToLogin("認証に失敗しました。管理者パスワードをご確認ください。");
      return;
    }
    const outcome = await loadSubmissions(token);
    if (outcome === "unauthorized") {
      backToLogin("認証に失敗しました。管理者パスワードをご確認ください。");
    }
  }, [loadSubmissions, backToLogin]);

  // 認証確認中: 保存された secret を API で検証している間はフォームもダッシュボードも
  // 出さず、無効な認証でダッシュボードが一瞬見える（フラッシュする）のを防ぐ。
  if (authStatus === "checking") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </main>
    );
  }

  // Login gate
  if (authStatus === "unauthed") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <form
            onSubmit={handleLogin}
            className="rounded-3xl border border-border bg-white p-8 shadow-sm"
          >
            <h1 className="mb-6 text-center text-xl font-bold text-foreground">
              管理者ログイン
            </h1>
            {authError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {authError}
              </div>
            )}
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              管理者パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="パスワードを入力"
              autoFocus
              disabled={loggingIn}
            />
            <button
              type="submit"
              disabled={loggingIn}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingIn ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  認証中...
                </>
              ) : (
                "ログイン"
              )}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Authenticated dashboard
  return (
    <>
      
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">管理ダッシュボード</h1>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            エラー: {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : submissions.length === 0 && !error ? (
          <div className="rounded-3xl border border-border bg-white p-12 text-center shadow-sm">
            <p className="text-muted-foreground">まだ相談がありません</p>
          </div>
        ) : (
          <>
            <KpiSummary
              total={submissions.length}
              representativeAction={representativeActionCount}
              counts={filterCounts}
              active={activeFilter}
              onChange={setActiveFilter}
            />

            <FilterTabs
              active={activeFilter}
              onChange={setActiveFilter}
              counts={filterCounts}
            />

            {visibleSubmissions.length === 0 ? (
              <div className="rounded-3xl border border-border bg-white p-12 text-center shadow-sm">
                <p className="text-muted-foreground">この条件に当てはまる相談はありません</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-hidden rounded-3xl border border-border bg-white shadow-sm md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-gray-50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-6 py-4 font-medium">受信日時</th>
                        <th className="px-6 py-4 font-medium">事業者名</th>
                        <th className="px-6 py-4 font-medium">業種</th>
                        <th className="px-6 py-4 font-medium">品質スコア</th>
                        <th className="px-6 py-4 font-medium">状態</th>
                        <th className="px-6 py-4 font-medium">操作 / アクセス先</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visibleSubmissions.map((s) => (
                        <tr key={s.id} className="transition hover:bg-gray-50">
                          <td
                            className="whitespace-nowrap px-6 py-4 text-muted-foreground cursor-pointer"
                            onClick={() => router.push(`/admin/${s.id}`)}
                          >
                            {formatDate(s.receivedAt)}
                          </td>
                          <td
                            className="px-6 py-4 font-medium text-foreground cursor-pointer"
                            onClick={() => router.push(`/admin/${s.id}`)}
                          >
                            {s.companyName}
                          </td>
                          <td
                            className="px-6 py-4 text-muted-foreground cursor-pointer"
                            onClick={() => router.push(`/admin/${s.id}`)}
                          >
                            {s.businessType}
                          </td>
                          <td
                            className="px-6 py-4 cursor-pointer"
                            onClick={() => router.push(`/admin/${s.id}`)}
                          >
                            <ScoreBar score={s.score} />
                          </td>
                          <td
                            className="px-6 py-4 cursor-pointer"
                            onClick={() => router.push(`/admin/${s.id}`)}
                          >
                            <StatusBadge status={s.status} />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-start gap-2">
                              <ActionCell submissionId={s.id} status={s.status} onActionSuccess={fetchSubmissions} />
                              <RouteAccessList submissionId={s.id} status={s.status} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {visibleSubmissions.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-3xl border border-border bg-white p-5 shadow-sm"
                    >
                      <div
                        className="cursor-pointer transition hover:bg-gray-50 -m-5 p-5 mb-2"
                        onClick={() => router.push(`/admin/${s.id}`)}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-semibold text-foreground">{s.companyName}</span>
                          <StatusBadge status={s.status} />
                        </div>
                        <div className="mb-3 text-sm text-muted-foreground">{s.businessType}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{formatDate(s.receivedAt)}</span>
                          <ScoreBar score={s.score} />
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border space-y-2">
                        <div className="flex justify-end">
                          <ActionCell submissionId={s.id} status={s.status} onActionSuccess={fetchSubmissions} />
                        </div>
                        <RouteAccessList submissionId={s.id} status={s.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
      
    </>
  );
}
