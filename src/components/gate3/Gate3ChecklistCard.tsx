/**
 * 第3ゲート（本制作前最終承認）の 内部判断支援 チェックリストカード。
 *
 * コンパクトに「ひと目で分かる」判定支援表示を出す。トーンチップで
 * OK / 要確認 / 未完了 を示し、上部に内部専用サマリ、下部に免責
 * （自動承認エンジンではない）を添える。
 *
 * "use client" を付けない共有モジュール。クライアント専用 API を使わないため、
 * review（Server Component）と admin（Client Component）のどちらにも
 * import できる（Next.js 16 でも、共有 JS モジュールは両 module graph に
 * 取り込める）。hooks・状態を持たない純粋な表示コンポーネント。
 */
import {
  buildGate3Checklist,
  type Gate3ChecklistInput,
  type Gate3Tone,
} from "@/lib/gate3-checklist";

const TONE_LABEL: Record<Gate3Tone, string> = {
  ok: "OK",
  review: "要確認",
  incomplete: "未完了",
};

const TONE_CHIP: Record<Gate3Tone, string> = {
  ok: "border-emerald-200 bg-emerald-100 text-emerald-800",
  review: "border-amber-200 bg-amber-100 text-amber-800",
  incomplete: "border-rose-200 bg-rose-100 text-rose-800",
};

const TONE_DOT: Record<Gate3Tone, string> = {
  ok: "bg-emerald-500",
  review: "bg-amber-500",
  incomplete: "bg-rose-500",
};

export function Gate3ChecklistCard({
  input,
}: {
  input: Gate3ChecklistInput;
}) {
  const { rows, summary } = buildGate3Checklist(input);

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
      {/* 内部専用サマリ（1行） */}
      <div className="mb-3 flex items-start gap-2">
        <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
          内部判定
        </span>
        <p className="text-xs leading-relaxed text-foreground/80">{summary}</p>
      </div>

      {/* チェックリスト（7行・トーンチップ付き） */}
      <ul className="divide-y divide-border/60">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-start justify-between gap-3 py-2"
          >
            <div className="flex min-w-0 items-start gap-2">
              <span
                className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${TONE_DOT[row.tone]}`}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {row.label}
                </p>
                <p className="text-xs text-muted-foreground">{row.detail}</p>
              </div>
            </div>
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${TONE_CHIP[row.tone]}`}
            >
              {TONE_LABEL[row.tone]}
            </span>
          </li>
        ))}
      </ul>

      {/* 免責：自動承認ではない旨を明示 */}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        ※ これは承認可否の判断を支援する内部表示であり、自動承認エンジンではありません。最終判断はオペレーターが行ってください。
      </p>
    </div>
  );
}
