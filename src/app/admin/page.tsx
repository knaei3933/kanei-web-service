"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {submissions.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => router.push(`/admin/${s.id}`)}
                      className="cursor-pointer transition hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                        {formatDate(s.receivedAt)}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">{s.companyName}</td>
                      <td className="px-6 py-4 text-muted-foreground">{s.businessType}</td>
                      <td className="px-6 py-4"><ScoreBar score={s.score} /></td>
                      <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {submissions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/admin/${s.id}`)}
                  className="block w-full rounded-3xl border border-border bg-white p-5 text-left shadow-sm transition hover:shadow-md"
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
                </button>
              ))}
            </div>
          </>
        )}
      </main>
      
    </>
  );
}
