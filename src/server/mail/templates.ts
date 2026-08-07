/* ------------------------------------------------------------------ */
/*  メール本文テンプレート（日本語のみ）                               */
/* ------------------------------------------------------------------ */
/*  相談パイプラインで送る2種類のメール本文を組み立てる。               */
/*  - 社内向け通知: arwg22@gmail.com 等の社内アドレスへ                 */
/*  - お客様向け提案: 提案ページの URL を添えて案内                     */
/*                                                                    */
/*  text: 全プロバイダ共通のフォールバック本文                          */
/*  html: SMTP プロバイダで使う、インラインスタイルの軽量 HTML          */
/*  （メールクライアント互換のため Tailwind は使わず inline style）    */
/* ------------------------------------------------------------------ */

import type {
  CustomerProposalEmailInput,
  InternalConsultNotificationInput,
  SendMailInput,
} from "./types";

/** unknown を安全に文字列として取り出す */
function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** unknown を安全に文字列配列として取り出す */
function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const s = asString(item);
    if (s.length === 0 || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** 自由テキストを箇条書きに分割（読点・改行・中点等） */
function splitToItems(text: string, max = 6): string[] {
  if (!text || !text.trim()) return [];
  const bulletStrip = /^(?:[-*•・·]+|\d+[.)、]|\([\d.]+\)|[a-zA-Z][.)])\s*/;
  const parts = text
    .split(/[\r\n、,，；;／/|｜・]+/)
    .map((s) => s.trim().replace(bulletStrip, "").trim())
    .filter((s) => s.length > 0);
  return Array.from(new Set(parts)).slice(0, max);
}

/** HTML エスケープ（メール本文にユーザー入力を混ぜるため） */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 箇条書きを HTML の <li> に整形 */
function toListHtml(items: string[]): string {
  if (items.length === 0) return '<p style="color:#6b7280;">（記入なし）</p>';
  const lis = items.map((x) => `<li>${escapeHtml(x)}</li>`).join("");
  return `<ul style="margin:8px 0 0;padding-left:20px;line-height:1.7;">${lis}</ul>`;
}

/* ------------------------------------------------------------------ */
/*  社内向け通知メール                                                  */
/* ------------------------------------------------------------------ */

/**
 * 相談送信を受け付けたことを社内へ通知するメールを組み立てる。
 * 件名・本文・HTML を含む SendMailInput を返す。
 */
export function buildInternalNotificationMail(
  toAddress: string,
  input: InternalConsultNotificationInput
): SendMailInput {
  const p = input.payload ?? {};
  const businessType = asString(p.businessType);
  const companyName = asString(p.companyName) || asString(p.enterpriseName);
  const name = asString(p.name);
  const email = asString(p.email);
  const phone = asString(p.phone);
  const desiredImage = asString(p.desiredImage);
  const targetCustomer = asString(p.targetCustomer);
  const budget = asString(p.budget);
  const timing = asString(p.timing);

  const strengths = splitToItems(asString(p.sellingPoints));
  const mustInclude = splitToItems(asString(p.mustIncludeInfo));
  const features = asStringArray(p.features);

  const subject = `【新規相談】${companyName || businessType || "（事業体名未設定）"}様 — ${input.submissionId}`;

  const lines: string[] = [];
  lines.push(`新しいホームページ相談を受け付けました。`);
  lines.push(`受領 ID: ${input.submissionId}`);
  lines.push("");
  lines.push("▼ お客様情報");
  if (companyName) lines.push(`事業体名: ${companyName}`);
  if (businessType) lines.push(`事業種: ${businessType}`);
  if (name) lines.push(`ご担当者: ${name}`);
  if (email) lines.push(`メール: ${email}`);
  if (phone) lines.push(`電話: ${phone}`);
  lines.push("");
  lines.push("▼ ご希望・ヒアリング内容");
  if (desiredImage) lines.push(`伝えたいイメージ: ${desiredImage}`);
  if (targetCustomer) lines.push(`ターゲット: ${targetCustomer}`);
  if (strengths.length) lines.push(`強み:\n  - ${strengths.join("\n  - ")}`);
  if (mustInclude.length) lines.push(`必須掲載情報:\n  - ${mustInclude.join("\n  - ")}`);
  if (features.length) lines.push(`必要ページ・機能:\n  - ${features.join("\n  - ")}`);
  if (budget) lines.push(`予算: ${budget}`);
  if (timing) lines.push(`公開希望時期: ${timing}`);
  lines.push("");
  lines.push("▼ パイプライン状況");
  lines.push(`保存モード: ${input.storageMode ?? "—"}`);
  lines.push(`保存先: ${input.storagePath ?? "—"}`);
  lines.push(`添付ファイル数: ${input.fileCount ?? 0}`);
  lines.push(`ブリーフ生成: ${input.briefGenerated ? "成功" : "未生成"}`);
  lines.push(`提案 URL: ${input.proposalUrl ?? "未生成"}`);
  const text = lines.join("\n");

  // 軽量 HTML（インラインスタイル）
  const rows: string[] = [];
  const row = (label: string, value: string) =>
    value
      ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;white-space:nowrap;vertical-align:top;">${escapeHtml(
          label
        )}</td><td style="padding:4px 0;vertical-align:top;">${escapeHtml(value)}</td></tr>`
      : "";
  rows.push(row("事業体名", companyName));
  rows.push(row("事業種", businessType));
  rows.push(row("ご担当者", name));
  rows.push(row("メール", email));
  rows.push(row("電話", phone));
  rows.push(row("伝えたいイメージ", desiredImage));
  rows.push(row("ターゲット", targetCustomer));
  rows.push(row("予算", budget));
  rows.push(row("公開希望時期", timing));

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Meiryo,sans-serif;color:#111827;max-width:600px;">
  <p style="font-size:14px;line-height:1.7;">新しいホームページ相談を受け付けました。<br/><b>受領 ID: ${escapeHtml(
    input.submissionId
  )}</b></p>
  <h3 style="font-size:15px;margin:20px 0 6px;border-left:4px solid #2563eb;padding-left:8px;">お客様情報</h3>
  <table style="font-size:14px;border-collapse:collapse;">${rows.join("")}</table>
  <h3 style="font-size:15px;margin:20px 0 6px;border-left:4px solid #2563eb;padding-left:8px;">強み・差別化</h3>${toListHtml(
    strengths
  )}
  <h3 style="font-size:15px;margin:20px 0 6px;border-left:4px solid #2563eb;padding-left:8px;">必須掲載情報</h3>${toListHtml(
    mustInclude
  )}
  <h3 style="font-size:15px;margin:20px 0 6px;border-left:4px solid #2563eb;padding-left:8px;">必要なページ・機能</h3>${toListHtml(
    features
  )}
  <h3 style="font-size:15px;margin:20px 0 6px;border-left:4px solid #2563eb;padding-left:8px;">パイプライン状況</h3>
  <table style="font-size:13px;border-collapse:collapse;color:#374151;">
    <tr><td style="padding:3px 12px 3px 0;color:#6b7280;">保存モード</td><td>${escapeHtml(
      input.storageMode ?? "—"
    )}</td></tr>
    <tr><td style="padding:3px 12px 3px 0;color:#6b7280;">保存先</td><td>${escapeHtml(
      input.storagePath ?? "—"
    )}</td></tr>
    <tr><td style="padding:3px 12px 3px 0;color:#6b7280;">添付ファイル数</td><td>${String(
      input.fileCount ?? 0
    )}</td></tr>
    <tr><td style="padding:3px 12px 3px 0;color:#6b7280;">ブリーフ生成</td><td>${
      input.briefGenerated ? "成功" : "未生成"
    }</td></tr>
    <tr><td style="padding:3px 12px 3px 0;color:#6b7280;">提案 URL</td><td>${
      input.proposalUrl ? escapeHtml(input.proposalUrl) : "未生成"
    }</td></tr>
  </table>
</div>`;

  return {
    to: [{ address: toAddress }],
    subject,
    text,
    html,
    submissionId: input.submissionId,
    purpose: "internal-notification",
  };
}

/* ------------------------------------------------------------------ */
/*  お客様向け提案メール                                                */
/* ------------------------------------------------------------------ */

/**
 * お客様へ提案ページのご案内を送るメールを組み立てる。
 */
export function buildCustomerProposalMail(
  input: CustomerProposalEmailInput
): SendMailInput {
  const displayName = input.customerName || input.companyName || "ご依頼主様";
  const companyNameLine = input.companyName ? `${input.companyName} 様\n\n` : "";
  const subject = `【金井ホームページ制作】ご提案をお届けします — ${input.companyName || "ご依頼主様"}`;

  const text = [
    `${displayName} 様`,
    "",
    companyNameLine,
    "この度は、ホームページ制作のご相談をいただきありがとうございます。",
    "ご入力いただいた内容をもとに、お客様別のご提案ページを作成いたしました。",
    "下記のリンクより、すぐにご覧いただけます。",
    "",
    `【ご提案ページ】`,
    input.proposalUrl,
    "",
    "ご提案ページでは、お客様の事業に合わせた構成案・デザインの方向性・",
    "参考にした実績コンポーネントをご確認いただけます。",
    "内容についてご不明点やご要望がございましたら、そのままご返信ください。",
    "2営業日以内に、より詳しいお見積りをご提案させていただきます。",
    "",
    "引き続き、よろしくお願い申し上げます。",
    "",
    "金井ホームページ制作",
    "Email: info@kanei-trade.co.jp",
    `お問い合わせ ID: ${input.submissionId}`,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === "" && i > 1))
    .join("\n");

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Meiryo,sans-serif;color:#111827;max-width:600px;">
  <p style="font-size:15px;">${escapeHtml(displayName)} 様</p>
  <p style="font-size:14px;line-height:1.8;">
    この度は、ホームページ制作のご相談をいただきありがとうございます。<br/>
    ご入力いただいた内容をもとに、お客様別の<span style="font-weight:bold;">ご提案ページ</span>を作成いたしました。
  </p>
  <div style="margin:20px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">ご提案ページ</p>
    <p style="margin:0;"><a href="${escapeHtml(
      input.proposalUrl
    )}" style="color:#2563eb;word-break:break-all;font-weight:bold;">${escapeHtml(
    input.proposalUrl
  )}</a></p>
  </div>
  <p style="font-size:14px;line-height:1.8;">
    ご提案ページでは、お客様の事業に合わせた構成案・デザインの方向性・参考にした実績コンポーネントをご確認いただけます。<br/>
    内容についてご不明点やご要望がございましたら、そのままご返信ください。
  </p>
  <p style="font-size:14px;line-height:1.8;">引き続き、よろしくお願い申し上げます。</p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
  <p style="font-size:13px;color:#6b7280;line-height:1.7;">
    金井ホームページ制作<br/>
    Email: info@kanei-trade.co.jp<br/>
    お問い合わせ ID: ${escapeHtml(input.submissionId)}
  </p>
</div>`;

  return {
    to: [{ address: input.to, name: input.customerName || undefined }],
    subject,
    text,
    html,
    submissionId: input.submissionId,
    purpose: "customer-proposal",
  };
}
