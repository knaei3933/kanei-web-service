/* ------------------------------------------------------------------ */
/*  デモフィードバックのセクション定義（フォーム & 内部レビュー共用）       */
/* ------------------------------------------------------------------ */
/*  顧客向けデモフィードバックフォームと、内部レビュー画面（/review）の     */
/*  両方から参照される「修正対象セクション」のマスターリスト。             */
/*                                                                        */
/*  設計のねらい:                                                          */
/*    - sectionId は保存データ（demo-feedback.json）の照合キーとして使う    */
/*      ため、一度決めたら変更しない（後方互換性）。                       */
/*    - name は日本語の表示名（顧客向け）。フォームとレビューで一致させる。 */
/*    - レビュー画面は sectionId でマッチングし、マスターの日本語名を       */
/*      優先表示するため、過去の保存データ（旧ラベル）でも表示が揃う。      */
/* ------------------------------------------------------------------ */

export interface DemoSectionOption {
  /** 機械処理用キー（保存データの照合に使う・変更不可） */
  id: string;
  /** 日本語表示名（顧客向け） */
  name: string;
}

/**
 * デモフィードバックで選択できるセクション一覧。
 * フォームの選択肢と、内部レビューの「承認 / 修正」マッピングで共用する。
 *
 * 注意: id の変更は保存データとの不整合を起こすため不可。
 * label の調整は、id を変えなければ安全。
 */
export const DEMO_SECTION_OPTIONS: readonly DemoSectionOption[] = [
  { id: "header", name: "ヘッダー / ナビゲーション" },
  { id: "hero", name: "メインビジュアル / ヒーロー" },
  { id: "trust", name: "信頼要素 / 強み紹介" },
  { id: "services", name: "サービス / 商品紹介" },
  { id: "content", name: "本文・キャッチコピー" },
  { id: "cta", name: "お問い合わせ誘導 / CTA" },
  { id: "footer", name: "フッター / 連絡先" },
];

/**
 * sectionId から表示名を引く。
 * レビュー画面で保存データの旧ラベルをマスターの日本語名で上書き表示するために使う。
 * 見つからない場合は fallback（保存データの sectionName 等）を返す。
 */
export function demoSectionName(
  sectionId: string,
  fallback?: string
): string {
  const found = DEMO_SECTION_OPTIONS.find((s) => s.id === sectionId);
  return found?.name ?? fallback ?? sectionId;
}
