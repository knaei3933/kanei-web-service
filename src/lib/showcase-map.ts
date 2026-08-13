import type { ComponentType } from "react";

/**
 * showcase コンポーネントの静的レジストリ（単一の正）。
 *
 * /demo と /execution の両ルートから共有参照する。新しい submission の
 * showcase を追加したら、このマップにエントリを追加するだけで両画面へ
 * 同時に反映される。2 箇所へコピペすると片方だけ更新される不整合
 * （＝もう一方の画面でプレースホルダーが表示される）を防ぐため、
 * 定義はここに一本化する。
 *
 * このレジストリは実行ハンドオフ成果物（approval-package）の
 * 「オペレータが作成/更新すべき showcase パス」の正でもある。
 * runtime が読み込むパス（componentPath）をここに宣言しておくことで、
 * ハンドオフが古い submissionId ベースのファイル名を指示する事故を防ぐ。
 */
export interface ShowcaseEntry {
  loader: () => Promise<{ default: ComponentType }>;
  enterpriseName: string;
  businessType: string;
  /**
   * runtime の loader が実際に読み込む、安定した showcase のファイルパス。
   * 実行ハンドオフ（approval-package）がオペレータに示す
   * 「実際に使われるパス」として共有参照する正。
   * loader の import 先と常に一致させること。
   */
  componentPath: string;
}

export const SHOWCASE_MAP: Record<string, ShowcaseEntry> = {
  "20260808-130735-d901b09c": {
    loader: () =>
      import("@/components/sections/izakaya-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "テスト居酒屋",
    businessType: "飲食業",
    componentPath: "src/components/sections/izakaya-showcase.tsx",
  },
  "20260809-061637-e59e74cc": {
    loader: () =>
      import("@/components/sections/manufacturing-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "テスト製造株式会社",
    businessType: "製造業",
    componentPath: "src/components/sections/manufacturing-showcase.tsx",
  },
  "20260808-061647-a4b73e82": {
    // ファイル名は識別子ベースの安定名（phase2-manufacturing-showcase）にしておく。
    // 数字始まりの submissionId をファイル名にすると、Turbopack の動的 import で
    // モジュール解決が環境によって不安定になるため、意味的な名前に一本化。
    loader: () =>
      import("@/components/sections/phase2-manufacturing-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "Phase2最新検証株式会社",
    businessType: "製造業",
    componentPath: "src/components/sections/phase2-manufacturing-showcase.tsx",
  },
  "20260808-123604-e6663cd3": {
    // ファイル名は識別子ベースの安定名（hair-salon-showcase）にしておく。
    // 数字始まりの submissionId をファイル名にすると、Turbopack の動的 import で
    // モジュール解決が環境によって不安定になるため、意味的な名前に一本化。
    loader: () =>
      import("@/components/sections/hair-salon-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "HAIR SALON TANAKA",
    businessType: "美容室",
    componentPath: "src/components/sections/hair-salon-showcase.tsx",
  },
  "20260811-111405-4909e58d": {
    // ファイル名は識別子ベースの安定名（korean-manufacturing-showcase）にしておく。
    // 数字始まりの submissionId をファイル名にすると、Turbopack の動的 import で
    // モジュール解決が環境によって不安定になるため、意味的な名前に一本化。
    loader: () =>
      import("@/components/sections/korean-manufacturing-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "E2E-StaleBlockerFix-20260811-201404",
    businessType: "製造業",
    componentPath: "src/components/sections/korean-manufacturing-showcase.tsx",
  },
  "20260808-064916-01296544": {
    // ファイル名は識別子ベースの安定名（relay-equipment-showcase）にしておく。
    // 数字始まりの submissionId をファイル名にすると、Turbopack の動的 import で
    // モジュール解決が環境によって不安定になるため、意味的な名前に一本化。
    loader: () =>
      import("@/components/sections/relay-equipment-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "Relay添付Durable検証株式会社",
    businessType: "製造業",
    componentPath: "src/components/sections/relay-equipment-showcase.tsx",
  },
  "20260808-013727-b07def99": {
    // ファイル名は識別子ベースの安定名（test-manufacturing-showcase）にしておく。
    // 数字始まりの submissionId をファイル名にすると、Turbopack の動的 import で
    // モジュール解決が環境によって不安定になるため、意味的な名前に一本化。
    loader: () =>
      import("@/components/sections/test-manufacturing-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "テスト株式会社",
    businessType: "製造業",
    componentPath: "src/components/sections/test-manufacturing-showcase.tsx",
  },
  "20260808-123400-3c9a9f70": {
    // ファイル名は識別子ベースの安定名（toyoda-manufacturing-showcase）にしておく。
    // 数字始まりの submissionId をファイル名にすると、Turbopack の動的 import で
    // モジュール解決が環境によって不安定になるため、意味的な名前に一本化。
    loader: () =>
      import("@/components/sections/toyoda-manufacturing-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "豊田製作所",
    businessType: "製造業",
    componentPath: "src/components/sections/toyoda-manufacturing-showcase.tsx",
  },
  "20260808-123405-1576b300": {
    // ファイル名は識別子ベースの安定名（suzuki-construction-showcase）にしておく。
    // 数字始まりの submissionId をファイル名にすると、Turbopack の動的 import で
    // モジュール解決が環境によって不安定になるため、意味的な名前に一本化。
    loader: () =>
      import("@/components/sections/suzuki-construction-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "鈴木工務店",
    businessType: "建設業",
    componentPath: "src/components/sections/suzuki-construction-showcase.tsx",
  },
  "20260808-123411-2ac47001": {
    // ファイル名は識別子ベースの安定名（tanaka-beauty-salon-showcase）にしておく。
    // 数字始まりの submissionId をファイル名にすると、Turbopack の動的 import で
    // モジュール解決が環境によって不安定になるため、意味的な名前に一本化。
    loader: () =>
      import("@/components/sections/tanaka-beauty-salon-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "田中美容室",
    businessType: "美容室",
    componentPath: "src/components/sections/tanaka-beauty-salon-showcase.tsx",
  },
  "20260808-123557-79660a24": {
    // ファイル名は識別子ベースの安定名（suzuki-komuten-showcase）にしておく。
    // 数字始まりの submissionId をファイル名にすると、Turbopack の動的 import で
    // モジュール解決が環境によって不安定になるため、意味的な名前に一本化。
    loader: () =>
      import("@/components/sections/suzuki-komuten-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "鈴木工務店",
    businessType: "工務店",
    componentPath: "src/components/sections/suzuki-komuten-showcase.tsx",
  },
  "20260811-104502-ba37cc62": {
    // ファイル名は識別子ベースの安定名（e2e-manufacturing-showcase）にしておく。
    // 数字始まりの submissionId をファイル名にすると、Turbopack の動的 import で
    // モジュール解決が環境によって不安定になるため、意味的な名前に一本化。
    loader: () =>
      import("@/components/sections/e2e-manufacturing-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "E2E運用検証テスト-20260811-194502",
    businessType: "製造業",
    componentPath: "src/components/sections/e2e-manufacturing-showcase.tsx",
  },
};

/**
 * 指定 submissionId の showcase が SHOWCASE_MAP に登録されていれば、
 * runtime が実際に読み込む安定したコンポーネントパスを返す。
 *
 * ハンドオフ成果物（approval-package）はこのパスを正として扱う。
 * runtime と同じマップを見ることで、「ハンドオフが指示するパス」と
 * 「runtime が読み込むパス」が一致し続ける。
 *
 * 未登録（新規 submission）の場合は null。
 */
export function resolveShowcaseComponentPath(submissionId: string): string | null {
  const entry = SHOWCASE_MAP[submissionId];
  return entry ? entry.componentPath : null;
}
