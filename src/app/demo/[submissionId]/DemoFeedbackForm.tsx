"use client";

import { useState, useTransition } from "react";
import {
  Star,
  ThumbsUp,
  MessageSquare,
  Send,
  CheckCircle2,
} from "lucide-react";

interface DemoFeedbackFormProps {
  submissionId: string;
}

interface FeedbackState {
  rating: number;
  comment: string;
  action: "approve" | "revision" | null;
}

interface FormState {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
}

export function DemoFeedbackForm({ submissionId }: DemoFeedbackFormProps) {
  const [feedback, setFeedback] = useState<FeedbackState>({
    rating: 0,
    comment: "",
    action: null,
  });
  const [formState, setFormState] = useState<FormState>({
    status: "idle",
    message: "",
  });
  const [isPending, startTransition] = useTransition();

  const handleRatingChange = (rating: number) => {
    setFeedback((prev) => ({ ...prev, rating }));
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, 1000);
    setFeedback((prev) => ({ ...prev, comment: value }));
  };

  const handleSubmit = async (action: "approve" | "revision") => {
    if (feedback.rating === 0) {
      setFormState({
        status: "error",
        message: "評価を選択してください",
      });
      return;
    }

    setFeedback((prev) => ({ ...prev, action }));
    setFormState({ status: "submitting", message: "" });

    try {
      const response = await fetch(
        `/api/demo/${submissionId}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            rating: feedback.rating,
            comment: feedback.comment,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("送信に失敗しました");
      }

      const data = await response.json();
      setFormState({
        status: "success",
        message:
          action === "approve"
            ? "ご承認ありがとうございます。制作に進みます。"
            : "フィードバックを受け付けました。改めてご連絡いたします。",
      });
    } catch (error) {
      setFormState({
        status: "error",
        message: "送信に失敗しました。もう一度お試しください。",
      });
    }
  };

  if (formState.status === "success") {
    return (
      <div className="rounded-lg bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-600" />
        <h3 className="mb-2 text-lg font-semibold text-green-900">
          送信完了
        </h3>
        <p className="text-green-700">{formState.message}</p>
      </div>
    );
  }

  const isSubmitting = formState.status === "submitting" || isPending;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
      <h3 className="mb-6 text-center text-lg font-semibold text-amber-900">
        デモをご確認いただき、ありがとうございます。
      </h3>

      {/* 評価（星5つ） */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-amber-900">
          全体の評価
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingChange(star)}
              disabled={isSubmitting}
              className="transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`${star}星`}
            >
              <Star
                className={`h-8 w-8 ${
                  star <= feedback.rating
                    ? "fill-amber-500 text-amber-500"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* コメント */}
      <div className="mb-6">
        <label
          htmlFor="comment"
          className="mb-2 block text-sm font-medium text-amber-900"
        >
          ご意見・ご要望（任意）
        </label>
        <textarea
          id="comment"
          value={feedback.comment}
          onChange={handleCommentChange}
          disabled={isSubmitting}
          rows={4}
          maxLength={1000}
          className="w-full rounded-lg border-amber-200 bg-white px-4 py-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="気づいた点、改善してほしい点などをお聞かせください"
        />
        <p className="mt-1 text-xs text-amber-600">
          {feedback.comment.length}/1000文字
        </p>
      </div>

      {/* エラーメッセージ */}
      {formState.status === "error" && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {formState.message}
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => handleSubmit("approve")}
          disabled={isSubmitting || feedback.rating === 0}
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ThumbsUp className="h-4 w-4" />
          このまま進めてください
        </button>
        <button
          type="button"
          onClick={() => handleSubmit("revision")}
          disabled={isSubmitting || feedback.rating === 0}
          className="flex items-center justify-center gap-2 rounded-full border border-amber-400 bg-white px-6 py-3 font-medium text-amber-900 transition-all hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MessageSquare className="h-4 w-4" />
          修正をお願いします
        </button>
      </div>

      {isSubmitting && (
        <p className="mt-3 text-center text-sm text-amber-700">
          送信中...
        </p>
      )}
    </div>
  );
}
