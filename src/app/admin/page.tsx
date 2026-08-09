"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAdminQuickLinks } from "@/lib/admin-navigation";

type Submission = {
  id: string;
  status: string;
  companyName: string;
  receivedAt: string;
  score: number;
  businessType: string;
};

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
 * 各ページへジャンプするためのコンパクトなクイックリンク。
 * プライマリアクション（ActionCell）とは別のナビゲーションエリアとして表示する。
 * ステータスに応じた可用性ルールは getAdminQuickLinks に集約している。
 */
function QuickLinks({ submissionId, status }: { submissionId: string; status: string }) {
  const links = getAdminQuickLinks(status, submissionId);
  return (
    <div className="flex flex-wrap gap-1.5">
      {links.map((l) => (
        <a
          key={l.key}
          href={l.href}
          className="inline-flex items-center rounded-md border border-border bg-white px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:bg-slate-50 hover:text-foreground"
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}

export default function AdminListPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const secret = typeof window !== "undefined" ? sessionStorage.getItem("admin_secret") : null;
    if (secret) setAuthed(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    sessionStorage.setItem("admin_secret", password.trim());
    setAuthed(true);
  };

  const fetchSubmissions = useCallback(async () => {
    const token = sessionStorage.getItem("admin_secret");
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/submissions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setSubmissions(data.submissions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchSubmissions();
  }, [authed, fetchSubmissions]);

  // Login gate
  if (!authed) {
    return (
      <>
        
        <main className="flex min-h-[60vh] items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm">
            <form
              onSubmit={handleLogin}
              className="rounded-3xl border border-border bg-white p-8 shadow-sm"
            >
              <h1 className="mb-6 text-center text-xl font-bold text-foreground">
                管理者ログイン
              </h1>
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
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                ログイン
              </button>
            </form>
          </div>
        </main>
        
      </>
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
                    <th className="px-6 py-4 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {submissions.map((s) => (
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
                          <QuickLinks submissionId={s.id} status={s.status} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {submissions.map((s) => (
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
                    <QuickLinks submissionId={s.id} status={s.status} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      
    </>
  );
}
