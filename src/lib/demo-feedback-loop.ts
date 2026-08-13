/* ------------------------------------------------------------------ */
/*  デモ配信後の顧客フィードバックループ管理モジュール                     */
/* ------------------------------------------------------------------ */
/*  デモ完成通知 → 顧客フィードバック受領 → 修正プロンプト生成 →           */
/*  修正版デモ完成通知 のサイクルを管理する。                              */
/* ------------------------------------------------------------------ */

import {
  writeArtifact,
  readArtifact,
  isSafeSubmissionId,
} from "@/server/submission-storage";
import { readApprovalPackage } from "@/lib/approval-package";
import { resolveShowcaseComponentPath } from "@/lib/showcase-map";
import { resolveMailProvider } from "@/server/mail";
import type { MailResult, SendMailInput } from "@/server/mail/types";
import { DEMO_SECTION_OPTIONS, demoSectionName } from "@/lib/demo-sections";

/* ------------------------------------------------------------------ */
/*  型定義                                                              */
/* ------------------------------------------------------------------ */

/**
 * 顧客フィードバックデータ。
 * デモレビューページから送信される。
 */
export interface DemoFeedbackData {
  /** 評価（1-5） */
  rating: number;
  /** コメント */
  comment: string;
  /** 特定セクションへのフィードバック（任意） */
  sections?: Array<{
    sectionId: string;
    sectionName: string;
    feedback: string;
  }>;
  /** 참고 이미지/스크린샷 URL (任意) */
  referenceImages?: string[];
  /** フィードバック送信日時（ISO8601） */
  submittedAt: string;
}

/**
 * ラウンドの種類
 */
export type RoundKind = "revision" | "restore" | "reuse";

/**
 * (Phase L) セクション別フィードバック由来の構造化サマリ。
 * buildRevisionHandoff が revision-handoff.json に保存する「修正依頼 / 承認相当」の
 * コンパクトな内訳。最新フィードバックを入力として機械的に集計したものであり、
 * セクション別の「修正完了」を証明するものではない（note 参照）。
 */
export interface SectionFeedbackSummary {
  /** サマリ生成元の最新ラウンドの全体評価（1-5） */
  rating: number;
  /** 最新の全体コメント（原文・長い場合は表示側で切り詰め） */
  overallComment: string;
  /** 修正依頼ありセクション（顧客が修正対象として選択した箇所） */
  requestedSections: Array<{
    sectionId: string;
    sectionName: string;
    feedback: string;
  }>;
  /** 修正対象外（選択されなかった＝承認相当）セクション */
  approvedSections: Array<{
    sectionId: string;
    sectionName: string;
  }>;
  /** 機械処理・一覧用のコンパクトなテキストダイジェスト */
  summaryText: string;
  /** 真実性の注意書き（修正完了証明ではないことの明示） */
  note: string;
}

/**
 * 修正ハンドオフデータ。
 * フィードバックを受信し、Claude Code への修正指示をまとめたもの。
 * (Phase R3) restore/reuse に対応するため kind/parentRound/variantTag を拡張。
 */
export interface RevisionHandoff {
  /** スキーマバージョン */
  schemaVersion: string;
  /** submission ID */
  submissionId: string;
  /** 顧客フィードバック（revision の場合必須） */
  feedbackData?: DemoFeedbackData;
  /** Claude Code に渡す修正プロンプト */
  revisionPrompt: string;
  /** ターゲットとなる showcase コンポーネントパス */
  targetComponent: string | null;
  /** 修正ラウンド数（1-indexed） */
  round: number;
  /** 作成日時（ISO8601） */
  createdAt: string;
  /** (Phase R3) ラウンドの種類。省略時は "revision" */
  kind?: RoundKind;
  /** (Phase R3) 基点ラウンド（restore/reuse の場合のみ） */
  parentRound?: number | null;
  /** (Phase R3) バリアントタグ（reuse の場合、"A"/"B" 等） */
  variantTag?: string | null;
  /** (Phase L) セクション別フィードバック由来の構造化サマリ（修正完了証明ではない・入力用） */
  sectionFeedbackSummary?: SectionFeedbackSummary;
}

/**
 * フィードバック履歴（demo-feedback.json に保存）。
 */
export interface DemoFeedbackHistory {
  /** 最新のフィードバック（null = フィードバック未受信） */
  latest: DemoFeedbackData | null;
  /** フィードバック履歴（古い順） */
  history: Array<{
    round: number;
    feedback: DemoFeedbackData;
    submittedAt: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  メールテンプレートビルダ                                            */
/* ------------------------------------------------------------------ */

/**
 * HTML エスケープ（メール本文用） */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * デモ完成通知メールを組み立てる。
 */
function buildDemoReadyMail(
  toAddress: string,
  customerName: string | undefined,
  companyName: string,
  demoUrl: string,
  submissionId: string
): SendMailInput {
  const displayName = customerName || companyName || "ご依頼主様";
  const subject = `${companyName}様のホームページデモが完成しました`;

  const text = [
    `${displayName} 様`,
    "",
    `${companyName} 様`,
    "",
    "この度は、ホームページ制作のご相談をいただきありがとうございます。",
    "",
    "ご相談内容をもとに、AIが作成したデモが完成いたしました。",
    "下記のリンクより、すぐにご覧いただけます。",
    "",
    "【デモページ】",
    demoUrl,
    "",
    "デモページでは、ご要望に応じた構成・デザイン・コンテンツをご確認いただけます。",
    "実制作のイメージを掴むための参考用としてご覧ください。",
    "",
    "内容についてのご意見・ご要望がございましたら、",
    "デモページ下部のフォームよりお気軽にお寄せください。",
    "",
    "ご確認いただき、「このまま進めてください」と思われる場合は、",
    "同じくフォームから承認のお返事をいただけますと幸いです。",
    "",
    "引き続き、よろしくお願い申し上げます。",
    "",
    "金井ホームページ制作",
    "Email: info@kanei-trade.co.jp",
    `お問い合わせ ID: ${submissionId}`,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === "" && i > 1))
    .join("\n");

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Meiryo,sans-serif;color:#111827;max-width:600px;">
  <p style="font-size:15px;">${escapeHtml(displayName)} 様</p>
  <p style="font-size:14px;line-height:1.8;">
    <b>${escapeHtml(companyName)} 様</b><br/>
    この度は、ホームページ制作のご相談をいただきありがとうございます。
  </p>
  <p style="font-size:14px;line-height:1.8;">
    ご相談内容をもとに、<span style="font-weight:bold;">AIが作成したデモ</span>が完成いたしました。
  </p>
  <div style="margin:20px 0;padding:16px;border:1px solid #10b981;border-radius:12px;background:#f0fdf4;">
    <p style="margin:0 0 8px;font-size:13px;color:#047857;">デモページ</p>
    <p style="margin:0;"><a href="${escapeHtml(
      demoUrl
    )}" style="color:#059669;word-break:break-all;font-weight:bold;">${escapeHtml(
    demoUrl
  )}</a></p>
  </div>
  <p style="font-size:14px;line-height:1.8;">
    デモページでは、ご要望に応じた構成・デザイン・コンテンツをご確認いただけます。<br/>
    実制作のイメージを掴むための参考用としてご覧ください。
  </p>
  <div style="margin:20px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#374151;">ご確認方法</p>
    <ul style="margin:0;padding-left:20px;font-size:14px;color:#374151;line-height:1.7;">
      <li style="margin-bottom:8px;">デモページをご覧いただき、構成・デザイン・コンテンツを確認してください</li>
      <li style="margin-bottom:8px;">修正してほしい点がございましたら、下部のフォームからお知らせください</li>
      <li>そのまま進めてよろしい場合は、承認ボタン（またはフォーム）からお知らせください</li>
    </ul>
  </div>
  <p style="font-size:14px;line-height:1.8;">引き続き、よろしくお願い申し上げます。</p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
  <p style="font-size:13px;color:#6b7280;line-height:1.7;">
    金井ホームページ制作<br/>
    Email: info@kanei-trade.co.jp<br/>
    お問い合わせ ID: ${escapeHtml(submissionId)}
  </p>
</div>`;

  return {
    to: [{ address: toAddress, name: customerName || undefined }],
    subject,
    text,
    html,
    submissionId,
    purpose: "customer-demo-ready",
  };
}

/**
 * 修正版デモ完成通知メールを組み立てる。
 */
function buildRevisionCompleteMail(
  toAddress: string,
  customerName: string | undefined,
  companyName: string,
  demoUrl: string,
  submissionId: string,
  round: number
): SendMailInput {
  const displayName = customerName || companyName || "ご依頼主様";
  const subject = `${companyName}様のデモを修正いたしました（${round}回目）`;

  const text = [
    `${displayName} 様`,
    "",
    `${companyName} 様`,
    "",
    "先日はデモページのご確認をいただき、ありがとうございました。",
    "お寄せいただいたご意見を反映し、修正版のデモが完成いたしました。",
    "",
    "【修正版デモページ】",
    demoUrl,
    "",
    `（${round}回目の修正内容を反映しております）`,
    "",
    "修正内容をご確認いただき、問題がなければそのまま進めていただけますと幸いです。",
    "さらに修正してほしい点がございましたら、同様にフォームからお知らせください。",
    "",
    "引き続き、よろしくお願い申し上げます。",
    "",
    "金井ホームページ制作",
    "Email: info@kanei-trade.co.jp",
    `お問い合わせ ID: ${submissionId}`,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === "" && i > 1))
    .join("\n");

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Meiryo,sans-serif;color:#111827;max-width:600px;">
  <p style="font-size:15px;">${escapeHtml(displayName)} 様</p>
  <p style="font-size:14px;line-height:1.8;">
    <b>${escapeHtml(companyName)} 様</b><br/>
    先日はデモページのご確認をいただき、ありがとうございました。<br/>
    お寄せいただいたご意見を反映し、修正版のデモが完成いたしました。
  </p>
  <div style="margin:20px 0;padding:16px;border:1px solid #3b82f6;border-radius:12px;background:#eff6ff;">
    <p style="margin:0 0 8px;font-size:13px;color:#1d4ed8;">修正版デモページ（${round}回目の修正）</p>
    <p style="margin:0;"><a href="${escapeHtml(
      demoUrl
    )}" style="color:#2563eb;word-break:break-all;font-weight:bold;">${escapeHtml(
    demoUrl
  )}</a></p>
  </div>
  <p style="font-size:14px;line-height:1.8;">
    修正内容をご確認いただき、問題がなければそのまま進めていただけますと幸いです。<br/>
    さらに修正してほしい点がございましたら、同様にフォームからお知らせください。
  </p>
  <p style="font-size:14px;line-height:1.8;">引き続き、よろしくお願い申し上げます。</p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
  <p style="font-size:13px;color:#6b7280;line-height:1.7;">
    金井ホームページ制作<br/>
    Email: info@kanei-trade.co.jp<br/>
    お問い合わせ ID: ${escapeHtml(submissionId)}
  </p>
</div>`;

  return {
    to: [{ address: toAddress, name: customerName || undefined }],
    subject,
    text,
    html,
    submissionId,
    purpose: "customer-demo-revision",
  };
}

/* ------------------------------------------------------------------ */
/*  公開関数                                                            */
/* ------------------------------------------------------------------ */

/**
 * デモが完成したことを顧客に通知するメールを送信する。
 *
 * @param submissionId - 受領 ID
 * @param customerEmail - 顧客メールアドレス
 * @param customerName - 顧客名（任意）
 * @param companyName - 事業体名
 * @param demoUrl - デモページ URL
 * @returns MailResult - 送信結果
 */
export async function sendDemoReadyEmail(
  submissionId: string,
  customerEmail: string,
  customerName: string | undefined,
  companyName: string,
  demoUrl: string
): Promise<MailResult> {
  const provider = resolveMailProvider();

  // メールアドレスの簡易バリデーション
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
  if (!isValidEmail) {
    return {
      provider: provider.name,
      accepted: [],
      messageId: null,
      status: "error",
      error: "顧客メールアドレスが不正なため、デモ完成通知メールを送信できませんでした。",
    };
  }

  try {
    const replyTo = process.env.MAIL_REPLY_TO;
    const mail = buildDemoReadyMail(
      customerEmail,
      customerName,
      companyName,
      demoUrl,
      submissionId
    );
    return await provider.send({ ...mail, replyTo });
  } catch (err) {
    return {
      provider: provider.name,
      accepted: [customerEmail],
      messageId: null,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * 顧客フィードバックから Claude Code の修正プロンプトを自動生成する。
 *
 * @param submissionId - 受領 ID
 * @param feedbackData - 顧客フィードバックデータ
 * @returns Claude Code に渡せる修正プロンプト文字列
 */
export function generateRevisionPrompt(
  submissionId: string,
  feedbackData: DemoFeedbackData,
  targetComponentPath?: string | null
): string {
  const lines: string[] = [];
  lines.push(`# 顧客フィードバックに基づく修正指示 — ${submissionId}`);
  lines.push("");
  lines.push("## 顧客評価");
  lines.push(`評価: ${feedbackData.rating}/5`);
  lines.push("");

  if (feedbackData.comment) {
    lines.push("## 全般のコメント");
    lines.push(feedbackData.comment);
    lines.push("");
  }

  if (feedbackData.sections && feedbackData.sections.length > 0) {
    lines.push("## セクション別のフィードバック");
    for (const section of feedbackData.sections) {
      lines.push(`### ${section.sectionName} (${section.sectionId})`);
      lines.push(section.feedback || "- この 요소 중심으로 조정 요청");
      lines.push("");
    }
  }

  if (feedbackData.referenceImages && feedbackData.referenceImages.length > 0) {
    lines.push("## 参考画像 / スクリーンショット URL");
    for (const url of feedbackData.referenceImages) {
      lines.push(`- ${url}`);
    }
    lines.push("");
  }

  if (targetComponentPath) {
    lines.push("## 必ず編集する対象ファイル");
    lines.push(`- ${targetComponentPath}`);
    lines.push("- 新しい showcase ファイルを増やさず、上記の既存ファイルを直接修正すること");
    lines.push("- runtime が参照中の既存コンポーネントを更新し、差分が残ること");
    lines.push("");
  }

  lines.push("## 修正対応方針");
  lines.push(
    feedbackData.rating >= 4
      ? "- 全体的に好評・微調整程度で対応"
      : "- 評価が低め・フィードバック内容を優先的に反映"
  );
  lines.push("- 上記フィードバックを具体的な修正箇所・修正内容に落とし込んで実装");
  lines.push("- 日本語の自然さ・ビジネス表現を意識して修正");
  lines.push("");

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  (Phase L) セクション別フィードバック由来の構造化サマリ                  */
/* ------------------------------------------------------------------ */

/** ダイジェスト用に文字列を安全に切り詰める */
function truncateForDigest(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

/**
 * (Phase L) 最新のセクション別フィードバックから、ハンドオフ確認用の
 * 構造化サマリを組み立てる。純粋関数（同じ入力 → 同じ出力）。
 *
 * 顧客が修正対象として選択したセクション（修正依頼）と、選択されなかった
 * セクション（修正対象外＝承認相当）の内訳を DEMO_SECTION_OPTIONS マスターと
 * 照合して組み立てる。
 *
 * 【真実性の制約】これは「どのセクションが修正依頼されたか / されなかったか」の
 * 入力サマリであり、修正が完了したことを証明するものではない（note に明記）。
 * セクション単位の完了状態はラインデータから判定できないため、完成主張はしない。
 */
export function buildSectionFeedbackSummary(
  feedbackData: DemoFeedbackData
): SectionFeedbackSummary {
  const flagged = Array.isArray(feedbackData.sections) ? feedbackData.sections : [];
  const flaggedIds = new Set(flagged.map((s) => s.sectionId));

  const requestedSections = flagged.map((s) => ({
    sectionId: s.sectionId,
    sectionName: demoSectionName(s.sectionId, s.sectionName),
    feedback: s.feedback,
  }));

  const approvedSections = DEMO_SECTION_OPTIONS.filter(
    (s) => !flaggedIds.has(s.id)
  ).map((s) => ({ sectionId: s.id, sectionName: s.name }));

  const requestedText =
    requestedSections.map((s) => s.sectionName).join("・") || "（なし）";
  const approvedText =
    approvedSections.map((s) => s.sectionName).join("・") || "（なし）";
  const commentDigest = feedbackData.comment
    ? truncateForDigest(feedbackData.comment, 200)
    : "（なし）";

  const summaryText =
    `評価 ${feedbackData.rating}/5。` +
    `修正依頼: ${requestedText}。` +
    `修正対象外（承認相当）: ${approvedText}。` +
    `全体コメント: ${commentDigest}`;

  const note =
    "最新フィードバックからの入力サマリであり、セクション別の修正完了を証明するものではありません。";

  return {
    rating: feedbackData.rating,
    overallComment: feedbackData.comment,
    requestedSections,
    approvedSections,
    summaryText,
    note,
  };
}

/**
 * 修正ハンドオフ JSON を生成して保存する。
 *
 * @param submissionId - 受領 ID
 * @param feedbackData - 顧客フィードバックデータ
 * @returns RevisionHandoff - 生成したハンドオフデータ
 */
export async function buildRevisionHandoff(
  submissionId: string,
  feedbackData: DemoFeedbackData
): Promise<RevisionHandoff> {
  if (!isSafeSubmissionId(submissionId)) {
    throw new Error(`不正な submissionId: ${submissionId}`);
  }

  // 既存のフィードバック履歴を読み込んでラウンド数を決定
  const historyRaw = await readArtifact(submissionId, "demo-feedback.json");
  let round = 1;
  if (historyRaw) {
    try {
      const history = JSON.parse(historyRaw) as DemoFeedbackHistory;
      round = history.history.length + 1;
    } catch {
      // パース失敗は無視してラウンド1から
    }
  }

  // ターゲットコンポーネントを特定（runtime が実際に読む showcase パスを正として使う）
  const targetComponent = resolveShowcaseComponentPath(submissionId);

  // approval-package は存在確認と将来の拡張余地のために読むが、
  // targetComponent には使わない（会社名などの非パス値を混入させない）。
  await readApprovalPackage(submissionId);

  const revisionPrompt = generateRevisionPrompt(
    submissionId,
    feedbackData,
    targetComponent
  );

  const handoff: RevisionHandoff = {
    schemaVersion: "1.0.0",
    submissionId,
    feedbackData,
    revisionPrompt,
    targetComponent,
    round,
    createdAt: new Date().toISOString(),
    // (Phase L) セクション別フィードバック由来の構造化サマリ（修正完了証明ではない）
    sectionFeedbackSummary: buildSectionFeedbackSummary(feedbackData),
  };

  // revision-handoff.json として保存
  await writeArtifact(
    submissionId,
    "revision-handoff.json",
    JSON.stringify(handoff, null, 2)
  );

  return handoff;
}

/**
 * 修正版デモが完成したことを顧客に通知するメールを送信する。
 *
 * @param submissionId - 受領 ID
 * @param customerEmail - 顧客メールアドレス
 * @param customerName - 顧客名（任意）
 * @param companyName - 事業体名
 * @param round - 修正ラウンド数
 * @returns MailResult - 送信結果
 */
export async function sendRevisionCompleteEmail(
  submissionId: string,
  customerEmail: string,
  customerName: string | undefined,
  companyName: string,
  round: number
): Promise<MailResult> {
  const provider = resolveMailProvider();

  // メールアドレスの簡易バリデーション
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
  if (!isValidEmail) {
    return {
      provider: provider.name,
      accepted: [],
      messageId: null,
      status: "error",
      error: "顧客メールアドレスが不正なため、修正版完成通知メールを送信できませんでした。",
    };
  }

  // URL クエリパラメータでラウンド数を渡す
  const demoUrl = `https://kanei-web-service.vercel.app/demo/${submissionId}?round=${round}`;

  try {
    const replyTo = process.env.MAIL_REPLY_TO;
    const mail = buildRevisionCompleteMail(
      customerEmail,
      customerName,
      companyName,
      demoUrl,
      submissionId,
      round
    );
    return await provider.send({ ...mail, replyTo });
  } catch (err) {
    return {
      provider: provider.name,
      accepted: [customerEmail],
      messageId: null,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * フィードバック履歴を読み込む。
 *
 * @param submissionId - 受領 ID
 * @returns DemoFeedbackHistory | null - フィードバック履歴（不在時は null）
 */
export async function readDemoFeedbackHistory(
  submissionId: string
): Promise<DemoFeedbackHistory | null> {
  if (!isSafeSubmissionId(submissionId)) return null;

  try {
    const raw = await readArtifact(submissionId, "demo-feedback.json");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoFeedbackHistory;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * (Phase L) 保存済みの revision-handoff.json を読み込む。
 * 不在・パース失敗時は null。実行/レビュー画面でハンドオフサマリを表示するために使う。
 */
export async function readRevisionHandoff(
  submissionId: string
): Promise<RevisionHandoff | null> {
  if (!isSafeSubmissionId(submissionId)) return null;

  try {
    const raw = await readArtifact(submissionId, "revision-handoff.json");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as RevisionHandoff;
  } catch {
    return null;
  }
}

/**
 * フィードバックを履歴に追加して保存する。
 *
 * @param submissionId - 受領 ID
 * @param feedbackData - 顧客フィードバックデータ
 * @param round - 修正ラウンド数
 */
export async function appendDemoFeedback(
  submissionId: string,
  feedbackData: DemoFeedbackData,
  round: number
): Promise<void> {
  const existing = await readDemoFeedbackHistory(submissionId);
  const history: DemoFeedbackHistory = existing || {
    latest: null,
    history: [],
  };

  // 新しいフィードバックを追加
  history.latest = feedbackData;
  history.history.push({
    round,
    feedback: feedbackData,
    submittedAt: feedbackData.submittedAt,
  });

  // 保存（最大20件まで保持）
  const trimmedHistory =
    history.history.length > 20
      ? history.history.slice(history.history.length - 20)
      : history.history;
  history.history = trimmedHistory;

  await writeArtifact(
    submissionId,
    "demo-feedback.json",
    JSON.stringify(history, null, 2)
  );
}

/* ------------------------------------------------------------------ */
/*  (Phase C-4) 納品確認メール                                          */
/* ------------------------------------------------------------------ */

/**
 * 納品確認メールを組み立てる。
 */
function buildDeliveredMail(
  toAddress: string,
  customerName: string | undefined,
  companyName: string,
  deliveryInfo: { url?: string | null; deliveredAt: string }
): SendMailInput {
  const displayName = customerName || companyName || "ご依頼主様";
  const subject = `【金井貿易株式会社】ホームページ制作完了のお知らせ`;

  const deliveredDate = deliveryInfo.deliveredAt
    ? new Date(deliveryInfo.deliveredAt).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "";

  const text = [
    `${displayName} 様`,
    "",
    `${companyName} 様`,
    "",
    "この度は、ホームページ制作のご依頼をいただき、誠にありがとうございます。",
    "",
    "無事に本制作が完了し、納品いたしました。",
    "",
    deliveryInfo.url
      ? `【公開サイト】\n${deliveryInfo.url}`
      : "公開 URL につきましては、別途ご連絡いたします。",
    "",
    "サイトを公開いたしましたので、ぜひご確認ください。",
    "今後も運用・更新のご支援がございましたら、お気軽にお問い合わせください。",
    "",
    "引き続き、よろしくお願い申し上げます。",
    "",
    "金井ホームページ制作",
    "Email: info@kanei-trade.co.jp",
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === "" && i > 1))
    .join("\n");

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Meiryo,sans-serif;color:#111827;max-width:600px;">
  <p style="font-size:15px;">${escapeHtml(displayName)} 様</p>
  <p style="font-size:14px;line-height:1.8;">
    <b>${escapeHtml(companyName)} 様</b><br/>
    この度は、ホームページ制作のご依頼をいただき、誠にありがとうございます。
  </p>
  <p style="font-size:14px;line-height:1.8;">
    無事に<span style="font-weight:bold;">本制作が完了し、納品いたしました</span>。
  </p>
  ${
    deliveryInfo.url
      ? `<div style="margin:20px 0;padding:16px;border:1px solid #10b981;border-radius:12px;background:#f0fdf4;">
    <p style="margin:0 0 8px;font-size:13px;color:#047857;">公開サイト</p>
    <p style="margin:0;"><a href="${escapeHtml(
      deliveryInfo.url
    )}" style="color:#059669;word-break:break-all;font-weight:bold;">${escapeHtml(
      deliveryInfo.url
    )}</a></p>
  </div>`
      : `<div style="margin:20px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
    <p style="margin:0;font-size:13px;color:#374151;">公開 URL につきましては、別途ご連絡いたします。</p>
  </div>`
  }
  <p style="font-size:14px;line-height:1.8;">
    サイトを公開いたしましたので、ぜひご確認ください。<br/>
    今後も運用・更新のご支援がございましたら、お気軽にお問い合わせください。
  </p>
  <p style="font-size:14px;line-height:1.8;">引き続き、よろしくお願い申し上げます。</p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
  <p style="font-size:13px;color:#6b7280;line-height:1.7;">
    金井ホームページ制作<br/>
    Email: info@kanei-trade.co.jp
  </p>
</div>`;

  return {
    to: [{ address: toAddress, name: customerName || undefined }],
    subject,
    text,
    html,
    submissionId: "", // 納品時は submissionId が不要だが型のため空文字
    purpose: "customer-delivered",
  };
}

/**
 * 納品確認メールを送信する。
 *
 * @param submissionId - 受領 ID
 * @param deliveryInfo - 納品情報（delivery-info.json の内容）
 * @returns MailResult - 送信結果
 */
export async function sendDeliveredEmail(
  submissionId: string,
  deliveryInfo: Record<string, unknown>
): Promise<MailResult> {
  const provider = resolveMailProvider();

  // submission.json から顧客情報を取得
  try {
    const submissionRaw = await readArtifact(submissionId, "submission.json");
    if (!submissionRaw) {
      return {
        provider: provider.name,
        accepted: [],
        messageId: null,
        status: "error",
        error: "submission.json が見つからないため、納品メールを送信できませんでした。",
      };
    }

    const submission = JSON.parse(submissionRaw) as Record<string, unknown>;
    const payload =
      submission &&
      typeof submission === "object" &&
      submission.payload &&
      typeof submission.payload === "object"
        ? (submission.payload as Record<string, unknown>)
        : {};

    const customerName = typeof payload.name === "string" ? payload.name : undefined;
    const companyName =
      typeof payload.companyName === "string"
        ? payload.companyName
        : typeof payload.enterpriseName === "string"
          ? payload.enterpriseName
          : "貴社";
    const customerEmail =
      typeof payload.email === "string"
        ? payload.email
        : typeof payload.contactEmail === "string"
          ? payload.contactEmail
          : "";

    // メールアドレスの簡易バリデーション
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
    if (!isValidEmail) {
      return {
        provider: provider.name,
        accepted: [],
        messageId: null,
        status: "error",
        error: "顧客メールアドレスが不正なため、納品メールを送信できませんでした。",
      };
    }

    // deliveryInfo から URL を取得
    const url =
      typeof deliveryInfo.url === "string"
        ? deliveryInfo.url
        : typeof deliveryInfo.deliveryUrl === "string"
          ? deliveryInfo.deliveryUrl
          : null;
    const deliveredAt =
      typeof deliveryInfo.deliveredAt === "string"
        ? deliveryInfo.deliveredAt
        : new Date().toISOString();

    try {
      const replyTo = process.env.MAIL_REPLY_TO;
      const mail = buildDeliveredMail(customerEmail, customerName, companyName, {
        url,
        deliveredAt,
      });
      return await provider.send({ ...mail, replyTo });
    } catch (err) {
      return {
        provider: provider.name,
        accepted: [customerEmail],
        messageId: null,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  } catch (err) {
    return {
      provider: provider.name,
      accepted: [],
      messageId: null,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
