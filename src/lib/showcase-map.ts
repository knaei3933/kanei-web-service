import type { ComponentType } from "react";

/**
 * showcase コンポーネントの静的レジストリ（単一の正）。
 *
 * /demo と /execution の両ルートから共有参照する。新しい submission の
 * showcase を追加したら、このマップにエントリを追加するだけで両画面へ
 * 同時に反映される。2 箇所へコピペすると片方だけ更新される不整合
 * （＝もう一方の画面でプレースホルダーが表示される）を防ぐため、
 * 定義はここに一本化する。
 */
export interface ShowcaseEntry {
  loader: () => Promise<{ default: ComponentType }>;
  enterpriseName: string;
  businessType: string;
}

export const SHOWCASE_MAP: Record<string, ShowcaseEntry> = {
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
  "20260808-061647-a4b73e82": {
    // ファイル名は識別子ベースの安定名（phase2-manufacturing-showcase）にしておく。
    // 数字始まりの submissionId をファイル名にすると、Turbopack の動的 import で
    // モジュール解決が環境によって不安定になるため、意味的な名前に一本化。
    loader: () =>
      import("@/components/sections/phase2-manufacturing-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "Phase2最新検証株式会社",
    businessType: "製造業",
  },
};
