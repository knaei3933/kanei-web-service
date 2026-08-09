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

interface DemoFeedbackEntry {
  sentAt: string;
  type: 'request' | 'revision';
  message: string;
}

interface DemoStatusResponse {
  status: string;
  feedbackHistory?: DemoFeedbackEntry[];
  lastUpdated?: string;
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
  // 新しいステータス（具体的なマッチを優先）
  if (s === "demo_generating") return "bg-purple-100 text-purple-800";
  if (s === "demo_deployed") return "bg-sky-100 text-sky-800";
  if (s === "demo_revision_ready") return "bg-orange-100 text-orange-800";
  if (s === "demo_revised") return "bg-sky-100 text-sky-800";
  if (s === "customer_approved") return "bg-emerald-100 text-emerald-800";
  if (s === "pre_production_interview") return "bg-amber-100 text-amber-800";
  if (s === "pre_production_review") return "bg-indigo-100 text-indigo-800";
  if (s === "production_ready") return "bg-violet-100 text-violet-800";
  if (s === "delivered") return "bg-green-100 text-green-800";
  if (s === "approved_for_execution") return "bg-violet-100 text-violet-800";
  // 既存の汎用マッチ
  if (s.includes("followup") || s.includes("needs")) {
    return "bg-amber-100 text-amber-800";
  }
  if (s.includes("reject")) {
    return "bg-rose-100 text-rose-800";
  }
  if (s.includes("approved") || s.includes("approve")) {
    return "bg-emerald-100 text-emerald-800";
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
  // 新しいステータス（具体的なマッチを優先）
  if (s === "demo_generating") return "デモ生成中";
  if (s === "demo_deployed") return "顧客確認待ち";
  if (s === "demo_revision_ready") return "修正要望受付済み";
  if (s === "demo_revised") return "修正版確認待ち";
  if (s === "customer_approved") return "顧客承認済み（ヒアリング待ち）";
  if (s === "pre_production_interview") return "本制作前ヒアリング中";
  if (s === "pre_production_review") return "本制作前承認待ち（第3ゲート）";
  if (s === "production_ready") return "本制作待機中";
  if (s === "delivered") return "納品済み";
  if (s === "awaiting_plan_approval") return "企画承認待ち";
  if (s === "approved_for_execution") return "デモ実行待ち";
  if (s === "awaiting_representative_approval") return "代表者承認待ち";
  // 既存の汎用マッチ
  if (s.includes("followup") || s.includes("needs")) return "追加確認中";
  if (s.includes("reject")) return "却下";
  if (s.includes("intake")) return "受付中";
  if (s.includes("awaiting")) return "承認待ち";
  if (s.includes("approved") || s.includes("approve")) return "承認済み";
  if (s.includes("plan")) return "企画承認待ち";
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
  const [executing, setExecuting] = useState(false);
  const [demoStatus, setDemoStatus] = useState<DemoStatusResponse | null>(null);
  const [startingInterview, setStartingInterview] = useState(false);
  const [gate3Acting, setGate3Acting] = useState(false);
  const [delivering, setDelivering] = useState(false);

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

  async function handleApprovePlan() {
    const secret = sessionStorage.getItem("admin_secret");
    if (!secret) return;
    setApproving(true);
    setActionMsg(null);
    try {
      const res = await fetch(
        `/api/admin/submissions/${encodeURIComponent(id)}/approve-plan`,
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
        throw new Error(`計画承認に失敗しました (${res.status})${txt ? `: ${txt}` : ""}`);
      }
      setActionMsg("計画を承認しました。");
      router.refresh();
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : "計画承認エラーが発生しました。");
    } finally {
      setApproving(false);
    }
  }

  async function handleExecuteDemo(isRevision: boolean = false) {
    const secret = sessionStorage.getItem("admin_secret");
    if (!secret) return;
    setExecuting(true);
    setActionMsg(null);
    try {
      const res = await fetch(
        `/api/admin/submissions/${encodeURIComponent(id)}/execute-demo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isRevision }),
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`デモ生成に失敗しました (${res.status})${txt ? `: ${txt}` : ""}`);
      }
      setActionMsg(isRevision ? "修正版の生成を開始しました。" : "デモ生成を開始しました。");
      router.refresh();
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : "デモ生成エラーが発生しました。");
    } finally {
      setExecuting(false);
    }
  }

  // 本制作前ヒアリングを開始する（customer_approved → pre_production_interview）。
  // 従来の「本制作を開始（customer_approved → production_ready 直遷移）」は
  // 新しいステートマシンで無効化されたため、本制作へは必ずヒアリング → Gate3 を経由する。
  async function handleStartInterview() {
    const secret = sessionStorage.getItem("admin_secret");
    if (!secret) return;
    setStartingInterview(true);
    setActionMsg(null);
    try {
      const res = await fetch(
        `/api/consult/${encodeURIComponent(id)}/interview`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          // デフォルト質問セットで起票し、顧客へ依頼メールを送る
          body: JSON.stringify({ sendMail: true }),
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`ヒアリング開始に失敗しました (${res.status})${txt ? `: ${txt}` : ""}`);
      }
      setActionMsg("本制作前ヒアリングを開始し、顧客へ依頼メールを送信しました。");
      router.refresh();
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : "ヒアリング開始エラーが発生しました。");
    } finally {
      setStartingInterview(false);
    }
  }

  // 第3ゲート（本制作前最終承認）。
  //   approve: pre_production_review → production_ready
  //   reject : pre_production_review → pre_production_interview（追加ヒアリングへ差し戻し）
  async function handleGate3(action: "approve" | "reject") {
    const secret = sessionStorage.getItem("admin_secret");
    if (!secret) return;
    setGate3Acting(true);
    setActionMsg(null);
    try {
      const res = await fetch(
        `/api/admin/submissions/${encodeURIComponent(id)}/pre-production/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`第3ゲート処理に失敗しました (${res.status})${txt ? `: ${txt}` : ""}`);
      }
      setActionMsg(
        action === "approve"
          ? "本制作前最終承認（第3ゲート）を行いました。"
          : "本制作前ヒアリングへ差し戻しました。",
      );
      router.refresh();
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : "第3ゲート処理エラーが発生しました。");
    } finally {
      setGate3Acting(false);
    }
  }

  async function handleDeliver() {
    const secret = sessionStorage.getItem("admin_secret");
    if (!secret) return;
    setDelivering(true);
    setActionMsg(null);
    try {
      const res = await fetch(
        `/api/production/${encodeURIComponent(id)}/deliver`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "deliver", domain: "", hostingOption: "kanei" }),
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`納品処理に失敗しました (${res.status})${txt ? `: ${txt}` : ""}`);
      }
      setActionMsg("納品処理が完了しました。");
      router.refresh();
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : "納品エラーが発生しました。");
    } finally {
      setDelivering(false);
    }
  }

  /* demoStatus取得 */
  useEffect(() => {
    const secret = sessionStorage.getItem("admin_secret");
    if (!secret || !id) return;

    // demo_deployed, demo_revised ステータスの場合のみ demoStatus を取得
    if (apStatus !== "demo_deployed" && apStatus !== "demo_revised" && apStatus !== "demo_revision_ready") {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/demo/${encodeURIComponent(id)}/status`,
          { headers: { Authorization: `Bearer ${secret}` } },
        );
        if (cancelled) return;
        if (res.ok) {
          const json: DemoStatusResponse = await res.json();
          setDemoStatus(json);
        }
      } catch (e: unknown) {
        // demoStatus取得は必須ではないため、エラーは無視
        console.warn("demoStatus取得エラー:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, apStatus]);

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

      {/* ---- Approve / Actions ---- */}
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <h2 className="mb-4 text-lg font-bold text-foreground">アクション</h2>

        {/* awaiting_representative_approval: 既存の承認ボタン */}
        {apStatus === "awaiting_representative_approval" && (
          <>
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
          </>
        )}

        {/* awaiting_plan_approval: 計画承認ボタン */}
        {apStatus === "awaiting_plan_approval" && (
          <button
            type="button"
            disabled={approving}
            onClick={handleApprovePlan}
            className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {approving ? "処理中..." : "✅ 計画を承認する"}
          </button>
        )}

        {/* approved_for_execution: デモ生成ボタン */}
        {apStatus === "approved_for_execution" && (
          <div className="space-y-4">
            <button
              type="button"
              disabled={executing}
              onClick={() => handleExecuteDemo(false)}
              className="w-full rounded-xl bg-purple-600 px-8 py-4 text-base font-bold text-white transition hover:bg-purple-700 disabled:opacity-50 sm:w-auto"
            >
              {executing ? "生成中..." : "🚀 デモを生成する"}
            </button>
            <p className="text-sm text-muted-foreground">
              💡 Claude Code がデモサイトを生成します。数分かかる場合があります。
            </p>
          </div>
        )}

        {/* demo_deployed: 顧客確認待ち */}
        {apStatus === "demo_deployed" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Link
                href={`/demo/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                🔗 デモサイトを確認
              </Link>
              <span className="text-sm text-muted-foreground">
                顧客が確認中です
              </span>
            </div>
            {demoStatus?.feedbackHistory && demoStatus.feedbackHistory.length > 0 && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                <p className="mb-2 text-sm font-semibold text-sky-700">フィードバック履歴</p>
                <ul className="space-y-2">
                  {demoStatus.feedbackHistory.map((fb, i) => (
                    <li key={i} className="rounded-lg bg-white px-3 py-2 text-sm">
                      <p className="text-xs text-muted-foreground">{fmtDate(fb.sentAt)}</p>
                      <p className="mt-1 font-medium text-foreground">
                        {fb.type === 'request' ? '📝 修正要望' : '🔄 修正版'}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{fb.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* demo_revised: 修正版確認待ち */}
        {apStatus === "demo_revised" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Link
                href={`/demo/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                🔗 修正版デモを確認
              </Link>
              <span className="text-sm text-muted-foreground">
                顧客が修正版を確認中です
              </span>
            </div>
            {demoStatus?.feedbackHistory && demoStatus.feedbackHistory.length > 0 && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                <p className="mb-2 text-sm font-semibold text-sky-700">フィードバック履歴</p>
                <ul className="space-y-2">
                  {demoStatus.feedbackHistory.map((fb, i) => (
                    <li key={i} className="rounded-lg bg-white px-3 py-2 text-sm">
                      <p className="text-xs text-muted-foreground">{fmtDate(fb.sentAt)}</p>
                      <p className="mt-1 font-medium text-foreground">
                        {fb.type === 'request' ? '📝 修正要望' : '🔄 修正版'}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{fb.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* demo_revision_ready: 修正版生成ボタン */}
        {apStatus === "demo_revision_ready" && (
          <div className="space-y-4">
            <button
              type="button"
              disabled={executing}
              onClick={() => handleExecuteDemo(true)}
              className="w-full rounded-xl bg-orange-600 px-8 py-4 text-base font-bold text-white transition hover:bg-orange-700 disabled:opacity-50 sm:w-auto"
            >
              {executing ? "生成中..." : "🚀 修正版を生成する"}
            </button>
            <p className="text-sm text-muted-foreground">
              💡 顧客の修正要望に基づいてClaude Codeが修正版を生成します
            </p>
          </div>
        )}

        {/* customer_approved: 本制作前ヒアリングを開始 */}
        {/*
          従来の「本制作を開始（customer_approved → production_ready 直遷移）」は
          新ステートマシンで無効化済み。本制作へは必ずヒアリング → 再検証 → 第3ゲートを経由する。
          TODO(Phase C): ヒアリング質問をカスタマイズする UI があればここに統合する。
        */}
        {apStatus === "customer_approved" && (
          <div className="space-y-3">
            <button
              type="button"
              disabled={startingInterview}
              onClick={handleStartInterview}
              className="rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {startingInterview ? "処理中..." : "📝 本制作前ヒアリングを開始"}
            </button>
            <p className="text-sm text-muted-foreground">
              デフォルトの質問セットでヒアリングを起票し、顧客へ依頼メールを送信します。
              顧客は <span className="font-mono text-xs">/interview/{id}</span> で回答します。
            </p>
          </div>
        )}

        {/* pre_production_interview: 顧客の回答待ち */}
        {apStatus === "pre_production_interview" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/interview/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                🔗 ヒアリング回答ページを確認
              </Link>
              <span className="text-sm text-muted-foreground">
                顧客のヒアリング回答・追加素材を待っています
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              顧客が回答を送信すると、自動的に第3ゲート（本制作前最終承認待ち）へ進みます。
            </p>
          </div>
        )}

        {/* pre_production_review: 第3ゲート（本制作前最終承認） */}
        {apStatus === "pre_production_review" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ヒアリング回答・追加素材・本制作準備度を確認のうえ、本制作へ進めるか判断してください。
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={gate3Acting}
                onClick={() => handleGate3("approve")}
                className="rounded-xl bg-violet-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                {gate3Acting ? "処理中..." : "✅ 本制作を承認する（第3ゲート）"}
              </button>
              <button
                type="button"
                disabled={gate3Acting}
                onClick={() => handleGate3("reject")}
                className="rounded-xl bg-rose-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {gate3Acting ? "処理中..." : "↩️ ヒアリングへ差し戻す"}
              </button>
            </div>
            <Link
              href={`/review/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-blue-600 hover:underline"
            >
              レビュー画面で回答・準備度を確認する →
            </Link>
          </div>
        )}

        {/* production_ready: 納品処理ボタン */}
        {apStatus === "production_ready" && (
          <button
            type="button"
            disabled={delivering}
            onClick={handleDeliver}
            className="rounded-xl bg-violet-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            {delivering ? "処理中..." : "📤 納品処理"}
          </button>
        )}

        {/* delivered: 納品完了表示 */}
        {apStatus === "delivered" && (
          <div className="rounded-xl bg-green-50 px-6 py-4">
            <p className="text-center text-lg font-bold text-green-700">
              ✅ 納品完了
            </p>
          </div>
        )}

        {/* その他のステータス */}
        {![
          "awaiting_representative_approval",
          "awaiting_plan_approval",
          "approved_for_execution",
          "demo_deployed",
          "demo_revised",
          "demo_revision_ready",
          "customer_approved",
          "pre_production_interview",
          "pre_production_review",
          "production_ready",
          "delivered",
        ].includes(apStatus) && (
          <p className="text-sm text-muted-foreground">
            現在、実行可能なアクションはありません。
          </p>
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
