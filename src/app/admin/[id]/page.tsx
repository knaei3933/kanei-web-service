"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface ChecklistItem {
  key: string;
  label: string;
  status: "ok" | "weak" | "empty";
  value?: string;
  required?: boolean;
  reason?: string;
}

interface IntakeQuality {
  status: string;
  score: number;
  reasons: string[];
  requestedItems: string[];
  followupQuestions: string[];
}

interface FollowupHistoryEntry {
  sentAt?: string;
  message?: string;
  items?: string[];
}

interface ApprovalPackage {
  status: string;
  receivedAt: string;
  intakeQuality?: IntakeQuality | null;
  followupHistory?: FollowupHistoryEntry[];
  [key: string]: unknown;
}

interface SubmissionFile {
  filename?: string;
  url?: string;
  contentType?: string;
  size?: number;
  [key: string]: unknown;
}

interface SubmissionPayload {
  companyName?: string;
  enterpriseName?: string;
  businessType?: string;
  email?: string;
  contactEmail?: string;
  phone?: string;
  name?: string;
  [key: string]: unknown;
}

interface Submission {
  submissionId: string;
  receivedAt: string;
  payload: SubmissionPayload;
  fileCount?: number;
  files?: SubmissionFile[];
}

interface Brief {
  [key: string]: unknown;
}

interface ApiResponse {
  submission: Submission;
  brief?: Brief | null;
  approvalPackage?: ApprovalPackage | null;
  qualityChecklist?: ChecklistItem[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function badgeColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("followup") || s.includes("needs")) {
    return "bg-amber-100 text-amber-800";
  }
  if (s.includes("approved") || s.includes("approve")) {
    return "bg-emerald-100 text-emerald-800";
  }
  if (s.includes("reject")) {
    return "bg-rose-100 text-rose-800";
  }
  if (s.includes("plan") || s.includes("intake")) {
    return "bg-indigo-100 text-indigo-800";
  }
  return "bg-blue-100 text-blue-800";
}

function scoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

function statusIcon(status: ChecklistItem["status"]): string {
  switch (status) {
    case "ok":
      return "✅";
    case "weak":
      return "⚠️";
    default:
      return "❌";
  }
}

function checklistRowBg(status: ChecklistItem["status"]): string {
  switch (status) {
    case "ok":
      return "bg-emerald-50";
    case "weak":
      return "bg-amber-50";
    default:
      return "bg-rose-50";
  }
}

function statusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("awaiting")) return "承認待ち";
  if (s.includes("followup") || s.includes("needs")) return "追加確認中";
  if (s.includes("approved")) return "承認済み";
  if (s.includes("reject")) return "却下";
  if (s.includes("plan")) return "企画承認待ち";
  if (s.includes("intake")) return "受付中";
  return status;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [followupMessage, setFollowupMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  /* auth + fetch */
  useEffect(() => {
    const secret = sessionStorage.getItem("admin_secret");
    if (!secret) {
      router.replace("/admin");
      return;
    }
    if (!id) {
      setError("IDが不正です。");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/submissions/${encodeURIComponent(id)}`,
          { headers: { Authorization: `Bearer ${secret}` } },
        );
        if (cancelled) return;
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(
            `データ取得に失敗しました (${res.status})${txt ? `: ${txt}` : ""}`,
          );
        }
        const json: ApiResponse = await res.json();
        setData(json);

        // pre-check items that need follow-up (empty / weak)
        const initial: Record<string, boolean> = {};
        for (const item of json.qualityChecklist ?? []) {
          if (item.status === "empty" || item.status === "weak") {
            initial[item.key] = true;
          }
        }
        setCheckedItems(initial);

        // pre-fill followup textarea with AI-generated draft questions
        const questions = json.approvalPackage?.intakeQuality?.followupQuestions;
        if (questions && questions.length > 0) {
          setFollowupMessage(questions.map((q: string) => `・${q}`).join("\n"));
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "不明なエラーが発生しました。");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  /* derived values */
  const approval = data?.approvalPackage ?? null;
  const submission = data?.submission ?? null;
  const payload = submission?.payload ?? {};
  const checklist = data?.qualityChecklist ?? [];

  const companyName =
    payload.companyName || payload.enterpriseName || "（企業名未設定）";
  const businessType = payload.businessType || "—";
  const email = payload.email || payload.contactEmail || "—";
  const phone = payload.phone || "—";
  const name = payload.name || "—";

  const apStatus = approval?.status ?? "unknown";
  const score = approval?.intakeQuality?.score ?? 0;

  const incompleteItems = useMemo(
    () => checklist.filter((c) => (c.status === "empty" || c.status === "weak") && c.required !== false),
    [checklist],
  );

  const allOk = checklist.length > 0 && checklist.filter((c) => c.required !== false).every((c) => c.status === "ok");

  const followupHistory = approval?.followupHistory ?? [];

  /* handlers */
  async function handleSendFollowup() {
    const secret = sessionStorage.getItem("admin_secret");
    if (!secret) return;
    const items = Object.keys(checkedItems).filter((k) => checkedItems[k]);
    if (items.length === 0) {
      setActionMsg("送信する項目を1つ以上選択してください。");
      return;
    }
    setSending(true);
    setActionMsg(null);
    try {
      const res = await fetch(
        `/api/admin/submissions/${encodeURIComponent(id)}/followup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ selectedItems: Object.keys(checkedItems).filter(k => checkedItems[k]), customMessage: followupMessage, sendMail: true }),
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`送信に失敗しました (${res.status})${txt ? `: ${txt}` : ""}`);
      }
      setActionMsg("フォローアップメールを送信しました。");
      setFollowupMessage("");
      setCheckedItems({});
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : "送信エラーが発生しました。");
    } finally {
      setSending(false);
    }
  }

  async function handleApprove() {
    const secret = sessionStorage.getItem("admin_secret");
    if (!secret) return;
    setApproving(true);
    setActionMsg(null);
    try {
      const res = await fetch(
        `/api/admin/submissions/${encodeURIComponent(id)}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ memo: "" }),
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`承認に失敗しました (${res.status})${txt ? `: ${txt}` : ""}`);
      }
      setActionMsg("承認が完了しました。");
      router.refresh();
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : "承認エラーが発生しました。");
    } finally {
      setApproving(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (error || !data || !submission) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <Link
          href="/admin"
          className="mb-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ← 一覧に戻る
        </Link>
        <p className="text-rose-600">
          {error || "データを読み込めませんでした。"}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* back link */}
      <Link
        href="/admin"
        className="text-sm text-blue-600 hover:underline"
      >
        ← 一覧に戻る
      </Link>

      {/* ---- Header ---- */}
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {companyName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {businessType}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-4 py-1.5 text-sm font-semibold ${badgeColor(
              apStatus,
            )}`}
          >
            {statusLabel(apStatus)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span>
            受付日時:{" "}
            <span className="font-medium text-foreground">
              {fmtDate(approval?.receivedAt ?? submission.receivedAt)}
            </span>
          </span>
          {submission.submissionId && (
            <span>
              ID:{" "}
              <span className="font-mono text-xs text-foreground">
                {submission.submissionId}
              </span>
            </span>
          )}
        </div>

        {/* score bar */}
        <div className="mt-5">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">品質スコア</span>
            <span className="font-bold text-foreground">{score} / 100</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full transition-all ${scoreColor(score)}`}
              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
            />
          </div>
        </div>
      </section>

      {/* ---- Customer info ---- */}
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <h2 className="mb-4 text-lg font-bold text-foreground">お客様情報</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">メールアドレス</dt>
            <dd className="mt-0.5 break-all font-medium text-foreground">
              {email}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">電話番号</dt>
            <dd className="mt-0.5 font-medium text-foreground">{phone}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">ご担当者名</dt>
            <dd className="mt-0.5 font-medium text-foreground">{name}</dd>
          </div>
        </dl>
      </section>

      {/* ---- Quality checklist ---- */}
      {checklist.length > 0 && (
        <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-4 text-lg font-bold text-foreground">
            品質チェックリスト
          </h2>
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li
                key={item.key}
                className={`flex items-start gap-3 rounded-xl px-4 py-3 ${checklistRowBg(
                  item.status,
                )}`}
              >
                <span className="text-lg leading-none">
                  {statusIcon(item.status)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {item.label}
                    </p>
                    {item.required ? (
                      <span className="rounded border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">必須</span>
                    ) : (
                      <span className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">任意</span>
                    )}
                  </div>
                  {item.value && (
                    <p className="mt-0.5 break-words text-sm text-muted-foreground">
                      {item.value}
                    </p>
                  )}
                  {item.reason && (
                    <p className={`mt-1 text-xs ${item.status === "ok" ? "text-emerald-600" : item.required ? "text-rose-600" : "text-amber-600"}`}>
                      {item.reason}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- Follow-up ---- */}
      {incompleteItems.length > 0 && (
        <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-1 text-lg font-bold text-foreground">
            追加確認フォローアップ
          </h2>
          {(data?.approvalPackage?.intakeQuality?.reasons?.length ?? 0) > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="mb-1 text-xs font-semibold text-amber-700">🤖 AI品質チェック判定</p>
              <ul className="space-y-0.5">
                {data?.approvalPackage?.intakeQuality?.reasons?.map((r: string, i: number) => (
                  <li key={i} className="text-sm text-amber-800">{r}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="mb-3 text-sm text-muted-foreground">
            不足・薄弱項目についてお客様に確認メールを送信できます。内容を確認・編集してから送信してください。
          </p>
          <ul className="mb-4 space-y-2">
            {incompleteItems.map((item) => (
              <li
                  key={item.key}
                  className="flex items-start gap-3 rounded-lg bg-gray-50 px-3 py-2"
                >
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={!!checkedItems[item.key]}
                      onChange={(e) =>
                        setCheckedItems((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))
                      }
                      className="mt-0.5"
                    />
                    <span className="text-sm text-foreground">
                      {statusIcon(item.status)} {item.label}
                    </span>
                  </label>
                </li>
            ))}
          </ul>
          <textarea
            value={followupMessage}
            onChange={(e) => setFollowupMessage(e.target.value)}
            placeholder="お客様への追加メッセージ（任意）"
            rows={5}
            className="mb-1 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mb-3 text-right text-xs text-muted-foreground">AI品質チェックによる下書き（編集可能）</p>
          <button
            type="button"
            disabled={sending}
            onClick={handleSendFollowup}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? "送信中..." : "メール送信"}
          </button>
        </section>
      )}

      {/* ---- Follow-up history ---- */}
      {followupHistory.length > 0 && (
        <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-4 text-lg font-bold text-foreground">
            フォローアップ履歴
          </h2>
          <ul className="space-y-3">
            {followupHistory.map((h, i) => (
              <li
                key={i}
                className="rounded-xl border border-border bg-gray-50 px-4 py-3"
              >
                <p className="text-xs text-muted-foreground">
                  {fmtDate(h.sentAt)}
                </p>
                {h.items && h.items.length > 0 && (
                  <p className="mt-1 text-sm text-foreground">
                    確認項目: {h.items.join("、")}
                  </p>
                )}
                {h.message && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {h.message}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- Approve ---- */}
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <h2 className="mb-4 text-lg font-bold text-foreground">承認</h2>
        {allOk ? (
          <button
            type="button"
            disabled={approving}
            onClick={handleApprove}
            className="rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {approving ? "処理中..." : "✅ 承認する"}
          </button>
        ) : (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ すべてのチェックリスト項目が「OK」になるまで承認できません。
            {incompleteItems.length > 0 && (
              <span className="mt-1 block">
                未完了項目: {incompleteItems.length}件
              </span>
            )}
          </div>
        )}
      </section>

      {/* ---- action message ---- */}
      {actionMsg && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white shadow-lg">
          {actionMsg}
        </div>
      )}
    </div>
  );
}
