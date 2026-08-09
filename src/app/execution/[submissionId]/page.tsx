import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// showcase コンポーネントの静的マップ
// 新しい showcase が追加されたらここにエントリを追加
interface ShowcaseEntry {
  loader: () => Promise<{ default: React.ComponentType }>;
  enterpriseName: string;
  businessType: string;
}

const SHOWCASE_MAP: Record<string, ShowcaseEntry> = {
  "20260808-130735-d901b09c": {
    loader: () =>
      import("@/components/sections/izakaya-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "テスト居酒屋",
    businessType: "飲食業",
  },
  "20260809-061637-e59e74cc": {
    loader: () =>
      import("@/components/sections/manufacturing-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "テスト製造株式会社",
    businessType: "製造業",
  },
};

interface ExecutionPageProps {
  params: Promise<{ submissionId: string }> | { submissionId: string };
}

// デモ未生成時のプレースホルダーコンポーネント
function DemoNotGeneratedPlaceholder() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
      <div className="max-w-md text-center px-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
          <Sparkles className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-slate-900">
          デモはまだ生成されていません
        </h3>
        <p className="text-sm text-slate-600">
          実装が承認され次第、こちらにプレビューが表示されます。
        </p>
      </div>
    </div>
  );
}

export default async function ExecutionPage({ params }: ExecutionPageProps) {
  const { submissionId } = await params;

  // submissionId のバリデーション（基本的な形式チェック）
  if (!submissionId || typeof submissionId !== "string") {
    notFound();
  }

  // SHOWCASE_MAP にエントリがなければ 404
  const showcaseEntry = SHOWCASE_MAP[submissionId];
  if (!showcaseEntry) {
    notFound();
  }

  // エントリから情報を取得
  const { loader, enterpriseName, businessType } = showcaseEntry;
  const ShowcaseComponent = (await loader()).default;

  return (
    <div className="bg-slate-50">
      {/* ============================================================ */}
      {/*  管理バー（実装プレビューであることを示す）                       */}
      {/* ============================================================ */}
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-container items-start gap-3 px-4 py-3 sm:items-center">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 sm:mt-0" />
          <p className="text-sm leading-relaxed text-amber-900">
            これはご相談内容をもとに作成した
            <span className="font-bold">実装プレビュー</span>
            です。
            実際の制作では、デザイン・原稿・写真をさらに詰めてまいります。
            <span className="hidden sm:inline">
              {" "}
              （受領 ID: <span className="font-mono">{submissionId}</span>）
            </span>
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ヘッダー（戻るリンク）                                          */}
      {/* ============================================================ */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-container px-4 py-3">
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                トップに戻る
              </Link>
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{enterpriseName}</span>
              <span className="text-slate-300">/</span>
              <span>{businessType}</span>
              <span className="text-slate-300">/</span>
              <span>実装プレビュー</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  メインコンテンツ（動的 showcase コンポーネント）                    */}
      {/* ============================================================ */}
      <ShowcaseComponent />

      {/* ============================================================ */}
      {/*  フッターコメント                                               */}
      {/* ============================================================ */}
      <footer className="border-t bg-slate-100">
        <div className="mx-auto max-w-container px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            この実装プレビューはブリーフにもとづき自動生成されました。
          </p>
          <p className="mt-1 text-xs text-slate-400">
            最終的なサイトとはデザイン・原稿・写真が異なる場合があります。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href={`/review/${submissionId}`}>
                <ExternalLink className="mr-2 h-3 w-3" />
                元の相談を確認
              </Link>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 動的レンダリングを指定（実行時に決定するため）
export const dynamic = "force-dynamic";
