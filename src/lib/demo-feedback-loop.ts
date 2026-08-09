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
import { resolveMailProvider } from "@/server/mail";
import type { MailResult, SendMailInput } from "@/server/mail/types";

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
  /** フィードバック送信日時（ISO8601） */
  submittedAt: string;
}

/**
 * 修正ハンドオフデータ。
 * フィードバックを受信し、Claude Code への修正指示をまとめたもの。
 */
export interface RevisionHandoff {
  /** スキーマバージョン */
  schemaVersion: string;
  /** submission ID */
  submissionId: string;
  /** 顧客フィードバック */
  feedbackData: DemoFeedbackData;
  /** Claude Code に渡す修正プロンプト */
  revisionPrompt: string;
  /** ターゲットとなる showcase コンポーネント名 */
  targetComponent: string | null;
  /** 修正ラウンド数（1-indexed） */
  round: number;
  /** 作成日時（ISO8601） */
  createdAt: string;
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
  feedbackData: DemoFeedbackData
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
      lines.push(section.feedback);
      lines.push("");
    }
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

  // ターゲットコンポーネントを特定（SHOWCASE_MAP または approval-package.json から）
  const pkg = await readApprovalPackage(submissionId);
  const targetComponent = pkg
    ? pkg.reviewSummary.businessSummary.match(/事業体=([^/]+)/)?.[1] || null
    : null;

  const revisionPrompt = generateRevisionPrompt(submissionId, feedbackData);

  const handoff: RevisionHandoff = {
    schemaVersion: "1.0.0",
    submissionId,
    feedbackData,
    revisionPrompt,
    targetComponent,
    round,
    createdAt: new Date().toISOString(),
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
