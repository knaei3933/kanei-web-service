"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  本制作前ヒアリング 回答フォーム（顧客向け・クライアント）            */
/* ------------------------------------------------------------------ */
/*  review ページの FollowupEditForm / demo の DemoFeedbackForm と同じ   */
/*  軽量パターン（useState + fetch）。派手なデザインは避ける。           */
/*                                                                        */
/*  - 回答は PATCH /api/consult/[submissionId]/interview へ送る（認証不要）*/
/*  - 追加素材は POST /api/consult/[submissionId]/materials へ送る（同上） */
/*  - 回答を送信すると状態が pre_production_review へ進むため、素材は     */
/*    回答の「前」にアップロードできるよう別ボタンを用意している。        */
/* ------------------------------------------------------------------ */

export interface InterviewQuestionInput {
  id: string;
  text: string;
  required: boolean;
  placeholder?: string;
}

interface InterviewFormProps {
  submissionId: string;
  questions: InterviewQuestionInput[];
  additionalMaterialCount: number;
}

type Status = "idle" | "uploading" | "submitting" | "success" | "error";

export function InterviewForm({
  submissionId,
  questions,
  additionalMaterialCount,
}: InterviewFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadedCount, setUploadedCount] = useState(additionalMaterialCount);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const isBusy = status === "uploading" || status === "submitting";

  /** 未回答の必須質問を抽出する */
  function missingRequired(): string[] {
    return questions
      .filter((q) => q.required && !(answers[q.id]?.trim() ?? "").length)
      .map((q) => q.text);
  }

  /** 追加素材だけを先にアップロードする（回答は送らない） */
  async function handleUploadOnly() {
    if (!files || files.length === 0) {
      setStatus("error");
      setMessage("アップロードするファイルを選んでください。");
      return;
    }
    setStatus("uploading");
    setMessage("");
    try {
      const formData = new FormData();
      for (const file of Array.from(files)) {
        formData.append("materials", file, file.name);
      }
      const res = await fetch(
        `/api/consult/${submissionId}/materials`,
        { method: "POST", body: formData }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "アップロードに失敗しました");
      }
      const data = (await res.json()) as { savedCount?: number };
      setUploadedCount((n) => n + (data.savedCount ?? 0));
      setFiles(null);
      setStatus("idle");
      setMessage(`${data.savedCount ?? 0} 件の素材を追加しました。`);
    } catch (e: unknown) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "アップロードに失敗しました。");
    }
  }

  /** 回答を送信する（ファイルがあれば先にアップロードしてから） */
  async function handleSubmit() {
    const missing = missingRequired();
    if (missing.length > 0) {
      setStatus("error");
      setMessage(`必須項目へのご回答をお願いします:\n${missing.join("\n")}`);
      return;
    }

    setStatus("submitting");
    setMessage("");
    try {
      // 回答前に追加素材があれば先に保存（回答後はステータスが進むため）
      if (files && files.length > 0) {
        const formData = new FormData();
        for (const file of Array.from(files)) {
          formData.append("materials", file, file.name);
        }
        const upRes = await fetch(`/api/consult/${submissionId}/materials`, {
          method: "POST",
          body: formData,
        });
        if (!upRes.ok) {
          const d = await upRes.json().catch(() => null);
          throw new Error(d?.error ?? "素材のアップロードに失敗しました");
        }
      }

      // 回答を組み立て（空の任意項目は送らない）
      const payload = questions
        .map((q) => ({ questionId: q.id, text: (answers[q.id] ?? "").trim() }))
        .filter((a) => a.text.length > 0);

      const res = await fetch(`/api/consult/${submissionId}/interview`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "回答の送信に失敗しました");
      }
      setStatus("success");
      setMessage("ご回答を受け付けました。ご協力ありがとうございます。");
    } catch (e: unknown) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "回答の送信に失敗しました。");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-2xl">✅</p>
        <h2 className="mt-3 text-lg font-bold text-emerald-900">
          ご回答ありがとうございました
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-800">
          {message}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-emerald-800">
          頂いた内容を確認のうえ、本制作の最終判断を進めます。追って担当者よりご連絡いたします。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- 質問への回答 ---- */}
      <div className="space-y-5">
        {questions.map((q, i) => (
          <div key={q.id}>
            <label htmlFor={`q-${q.id}`} className="block text-sm font-bold text-foreground">
              {i + 1}. {q.text}
              {q.required && (
                <span className="ml-2 rounded border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 align-middle">
                  必須
                </span>
              )}
            </label>
            <textarea
              id={`q-${q.id}`}
              rows={3}
              className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={q.placeholder ?? "ご自由にお書きください"}
              value={answers[q.id] ?? ""}
              disabled={isBusy}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
              }
            />
          </div>
        ))}
      </div>

      {/* ---- 追加素材 ---- */}
      <div className="rounded-2xl border border-border bg-accent/40 p-5">
        <p className="text-sm font-bold text-foreground">
          参考素材の追加（任意）
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          ロゴ・写真・資料など、本制作の参考になるデータがあれば追加してください。
          回答を送信する前にアップロードできます。
          {uploadedCount > 0 && (
            <span className="ml-1 font-medium text-foreground">
              （これまでに {uploadedCount} 件追加済み）
            </span>
          )}
        </p>
        <input
          type="file"
          multiple
          disabled={isBusy}
          onChange={(e) => setFiles(e.target.files)}
          className="mt-3 block w-full text-sm text-foreground file:mr-3 file:rounded-full file:border-0 file:bg-slate-200 file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-slate-300"
        />
        <button
          type="button"
          onClick={handleUploadOnly}
          disabled={isBusy || !files || files.length === 0}
          className="mt-3 inline-flex items-center justify-center rounded-full border border-primary/30 bg-white px-5 py-2 text-sm font-medium text-primary transition hover:bg-primary/5 disabled:opacity-50"
        >
          {status === "uploading" ? "アップロード中..." : "素材だけ追加する"}
        </button>
      </div>

      {/* ---- メッセージ ---- */}
      {status === "error" && message && (
        <div className="whitespace-pre-wrap rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-relaxed text-rose-800">
          {message}
        </div>
      )}
      {status === "idle" && message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800">
          {message}
        </div>
      )}

      {/* ---- 送信ボタン ---- */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isBusy}
        className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
      >
        {status === "submitting" ? "送信中..." : "回答を送信する"}
      </button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        回答を送信すると、内容を確認したうえで本制作の最終判断に進みます。
      </p>
    </div>
  );
}
