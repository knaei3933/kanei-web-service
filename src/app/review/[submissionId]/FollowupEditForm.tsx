"use client";

import { useState, useTransition } from "react";

/* ------------------------------------------------------------------ */
/*  顧客向け追加情報入力フォーム（needs_followup 時に表示）              */
/*  サーバーコンポーネントの review ページから clsx なしで組み込み可能   */
/* ------------------------------------------------------------------ */

/** 品質評価でチェックされる戦略項目のキーとラベル（consult-quality.ts と同期） */
const STRATEGY_FIELDS = [
  { key: "targetCustomer", label: "ターゲット・理想のお客様" },
  { key: "sellingPoints", label: "強み・差別化ポイント" },
  { key: "mustIncludeInfo", label: "必ずホームページに載せたい情報" },
  { key: "desiredImage", label: "伝えたいイメージ" },
] as const;

/** features の選択肢（consult フォームと同期） */
const FEATURE_OPTIONS = [
  { value: "contact_form", label: "お問い合わせフォーム" },
  { value: "price_table", label: "料金表" },
  { value: "gallery", label: "実績ギャラリー" },
  { value: "blog", label: "ブログ・お知らせ" },
  { value: "map_access", label: "アクセスマップ" },
  { value: "online_booking", label: "オンライン予約" },
  { value: "faq", label: "よくある質問" },
  { value: "staff_profile", label: "スタッフ紹介" },
  { value: "testimonial", label: "お客様の声" },
  { value: "multi_language", label: "多言語対応" },
] as const;

interface FollowupEditFormProps {
  submissionId: string;
  initialPayload: Record<string, unknown>;
  initialScore: number;
  requestedItems: string[];
  followupQuestions: string[];
}

export function FollowupEditForm({
  submissionId,
  initialPayload,
  initialScore,
  requestedItems,
  followupQuestions,
}: FollowupEditFormProps) {
  // 各戦略項目の初期値を取り出す
  const getStrVal = (key: string): string =>
    typeof initialPayload[key] === "string"
      ? (initialPayload[key] as string)
      : "";

  const [targetCustomer, setTargetCustomer] = useState(getStrVal("targetCustomer"));
  const [sellingPoints, setSellingPoints] = useState(getStrVal("sellingPoints"));
  const [mustIncludeInfo, setMustIncludeInfo] = useState(getStrVal("mustIncludeInfo"));
  const [desiredImage, setDesiredImage] = useState(getStrVal("desiredImage"));

  // features の初期値（文字列配列 or カンマ/区切り文字列）
  const initialFeatures: string[] = (() => {
    const raw = initialPayload.features;
    if (Array.isArray(raw)) return raw.filter((f): f is string => typeof f === "string");
    if (typeof raw === "string") return raw.split(/[,、\s]+/).filter(Boolean);
    return [];
  })();
  const [features, setFeatures] = useState<Set<string>>(new Set(initialFeatures));

  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    ok: boolean;
    newScore?: number;
    newStatus?: string | null;
    error?: string;
    updatedFields?: string[];
  } | null>(null);

  function toggleFeature(value: string) {
    setFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);

    const payload: Record<string, unknown> = {
      targetCustomer: targetCustomer.trim(),
      sellingPoints: sellingPoints.trim(),
      mustIncludeInfo: mustIncludeInfo.trim(),
      desiredImage: desiredImage.trim(),
      features: Array.from(features),
    };

    startTransition(async () => {
      try {
        const res = await fetch(`/api/consult/${submissionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok) {
          setResult({
            ok: true,
            newScore: data.newScore,
            newStatus: data.newStatus,
            updatedFields: data.updatedFields,
          });
        } else {
          setResult({ ok: false, error: data.error || "更新に失敗しました。" });
        }
      } catch {
        setResult({ ok: false, error: "通信エラーが発生しました。" });
      }
    });
  }

  const scoreImproved = result?.ok && typeof result.newScore === "number" && result.newScore > initialScore;
  const transitionedToReview =
    result?.ok && result.newStatus === "awaiting_representative_approval";

  return (
    <div className="space-y-5">
      {/* フォローアップ要求内容 */}
      {(requestedItems.length > 0 || followupQuestions.length > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-900">追加情報のお願い</p>
          {requestedItems.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-bold text-amber-800">不足している項目:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {requestedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {followupQuestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-bold text-amber-800">質問:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {followupQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 戦略項目（4項目） */}
        {STRATEGY_FIELDS.map((field) => {
          const value =
            field.key === "targetCustomer"
              ? targetCustomer
              : field.key === "sellingPoints"
                ? sellingPoints
                : field.key === "mustIncludeInfo"
                  ? mustIncludeInfo
                  : desiredImage;
          const onChange =
            field.key === "targetCustomer"
              ? setTargetCustomer
              : field.key === "sellingPoints"
                ? setSellingPoints
                : field.key === "mustIncludeInfo"
                  ? setMustIncludeInfo
                  : setDesiredImage;

          return (
            <div key={field.key}>
              <label className="block text-sm font-bold text-foreground">
                {field.label}
              </label>
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                placeholder={`${field.label}を具体的に入力してください`}
              />
            </div>
          );
        })}

        {/* features（チェックボックス） */}
        <div>
          <label className="block text-sm font-bold text-foreground">
            必要なページ・機能
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {FEATURE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm text-foreground hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={features.has(opt.value)}
                  onChange={() => toggleFeature(opt.value)}
                  className="h-4 w-4"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* 送信ボタン */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "更新中..." : "情報を更新する"}
          </button>
          <span className="text-sm text-muted-foreground">
            現在のスコア: <span className="font-bold text-foreground">{initialScore}</span>
          </span>
        </div>

        {/* 結果表示 */}
        {result && (
          <div
            className={`rounded-2xl border p-4 text-sm leading-relaxed ${
              result.ok
                ? transitionedToReview
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : scoreImproved
                    ? "border-blue-200 bg-blue-50 text-blue-900"
                    : "border-slate-200 bg-slate-50 text-foreground"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {result.ok ? (
              transitionedToReview ? (
                <p>
                  ✅ スコアが <strong>{result.newScore}</strong> に向上し、すべての必須項目が充足しました。
                  ステータスを「代表確認待ち」に自動更新しました。担当者からの連絡をお待ちください。
                </p>
              ) : scoreImproved ? (
                <p>
                  ✅ スコアが <strong>{initialScore}</strong> → <strong>{result.newScore}</strong> に向上しました。
                  さらに情報を追加すると、よりスムーズに進められます。
                </p>
              ) : (
                <p>
                  更新しました（スコア: {result.newScore}）。
                  さらに詳しい情報を追加することをお勧めします。
                </p>
              )
            ) : (
              <p>❌ {result.error}</p>
            )}
            {transitionedToReview && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                画面を更新
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
