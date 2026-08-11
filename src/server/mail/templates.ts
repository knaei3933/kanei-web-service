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
  CustomerFollowupEmailInput,
  CustomerPreProductionInterviewEmailInput,
  CustomerProposalEmailInput,
  CustomerReviewAcknowledgementEmailInput,
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

  // 自動ゲート通過時は件名にプレフィックスを追加
  const autoGateApproved = input.autoGate?.approved === true;
  const subjectPrefix = autoGateApproved ? "⚠️ 自動ゲート通過｜" : "";
  const subject = `${subjectPrefix}【新規相談】${companyName || businessType || "（事業体名未設定）"}様 — ${input.submissionId}`;

  const lines: string[] = [];
  lines.push(`新しいホームページ相談を受け付けました。`);
  lines.push(`受領 ID: ${input.submissionId}`);
  if (autoGateApproved) {
    lines.push("");
    lines.push("⚠️ 【自動ゲート通過】品質スコア100・必須項目全てOKのため2ゲートとも自動通過しました。");
    if (input.autoGate?.reason) {
      lines.push(`理由: ${input.autoGate.reason}`);
    }
  }
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
  if (input.reviewUrl) lines.push(`レビュー URL: ${input.reviewUrl}`);
  if (input.intakeQuality) {
    lines.push("");
    lines.push("▼ インテイク品質評価");
    lines.push(
      `ステータス: ${
        input.intakeQuality.status === "needs_followup"
          ? "要フォロー（提案保留）"
          : "ready（提案生成可）"
      }`
    );
    lines.push(`スコア: ${input.intakeQuality.score}`);
    if (input.intakeQuality.reasons.length > 0) {
      lines.push(`理由:\n  - ${input.intakeQuality.reasons.join("\n  - ")}`);
    }
  }
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
  )}</b></p>${
    autoGateApproved
      ? `<div style="margin:16px 0;padding:12px 16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;">
    <p style="margin:0;font-size:14px;font-weight:bold;color:#92400e;">⚠️ 自動ゲート通過</p>
    <p style="margin:4px 0 0;font-size:13px;color:#b45309;">品質スコア100・必須項目全てOKのため2ゲートとも自動通過しました。</p>${
      input.autoGate?.reason
        ? `<p style="margin:4px 0 0;font-size:12px;color:#b45309;">理由: ${escapeHtml(
            input.autoGate.reason
          )}</p>`
        : ""
    }</div>`
      : ""
  }<h3 style="font-size:15px;margin:20px 0 6px;border-left:4px solid #2563eb;padding-left:8px;">お客様情報</h3>
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
    }</td></tr>${
      input.reviewUrl
        ? `<tr><td style="padding:3px 12px 3px 0;color:#6b7280;">レビュー URL</td><td><a href="${escapeHtml(
            input.reviewUrl
          )}" style="color:#2563eb;word-break:break-all;">${escapeHtml(
            input.reviewUrl
          )}</a></td></tr>`
        : ""
    }
  </table>${
    input.intakeQuality
      ? `
  <h3 style="font-size:15px;margin:20px 0 6px;border-left:4px solid ${
    input.intakeQuality.status === "needs_followup" ? "#d97706" : "#2563eb"
  };padding-left:8px;">インテイク品質評価</h3>
  <p style="font-size:13px;line-height:1.7;color:#374151;">
    ステータス: <b>${
      input.intakeQuality.status === "needs_followup"
        ? "要フォロー（提案保留）"
        : "ready（提案生成可）"
    }</b> ／ スコア: ${input.intakeQuality.score}
  </p>${toListHtml(input.intakeQuality.reasons)}`
      : ""
  }
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

/* ------------------------------------------------------------------ */
/*  お客様向けフォローアップ依頼メール                                  */
/* ------------------------------------------------------------------ */

/**
 * 相談内容が不足していたとき、お客様へ追加情報をお願いするメールを組み立てる。
 * requestedItems / followupQuestions は assessConsultIntake の結果を使う。
 * 提案ページの URL は載せない（まだ生成していないため）。
 */
export function buildCustomerFollowupMail(
  input: CustomerFollowupEmailInput
): SendMailInput {
  const displayName = input.customerName || input.companyName || "ご依頼主様";
  const companyNameLine = input.companyName ? `${input.companyName} 様\n\n` : "";
  const subject = `【金井ホームページ制作】ご相談内容について追加でお伺いしたいことがございます — ${
    input.companyName || "ご依頼主様"
  }`;

  const questions = (input.followupQuestions ?? []).filter((q) => q.trim().length > 0);
  const items = (input.requestedItems ?? []).filter((i) => i.trim().length > 0);
  // 項目別の構造化補足要求（代表者差戻し／補足依頼）。
  // label・guidance が揃っているものだけ残し、currentValue は空なら null に正規化する。
  // データ形状は approval-package の IntakeSupplementRequest をそのまま受け取る。
  const supplements = (input.supplementRequests ?? [])
    .filter(
      (s) =>
        s &&
        typeof s.label === "string" &&
        s.label.trim().length > 0 &&
        typeof s.guidance === "string" &&
        s.guidance.trim().length > 0
    )
    .map((s) => ({
      label: s.label.trim(),
      guidance: s.guidance.trim(),
      currentValue:
        typeof s.currentValue === "string" && s.currentValue.trim().length > 0
          ? s.currentValue.trim()
          : null,
    }));

  const lines: string[] = [];
  lines.push(`${displayName} 様`);
  lines.push("");
  lines.push(companyNameLine);
  lines.push("この度は、ホームページ制作のご相談をいただきありがとうございます。");
  lines.push("ご入力いただいた内容は無事に受け取りました。");
  lines.push("");
  lines.push(
    "お客様に最適なご提案を用意するため、もう少しだけ詳しくお伺いしたいことがございます。"
  );
  lines.push(
    "以下の点について、このメールにそのままご返信いただくか、箇条書きで教えていただけますでしょうか。"
  );
  lines.push("");
  if (supplements.length > 0) {
    // 構造化補足要求があるときは項目別ブロックを優先（label・guidance・現在値を明示）
    lines.push("【ご確認・ご補足いただきたい項目】");
    supplements.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.label}`);
      lines.push(`   ご案内: ${s.guidance}`);
      if (s.currentValue) {
        lines.push(`   現在のご入力: ${s.currentValue}`);
      }
    });
    lines.push("");
  } else if (questions.length > 0) {
    lines.push("【お伺いしたいこと】");
    questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    lines.push("");
  } else if (items.length > 0) {
    lines.push("【ご教示いただきたい項目】");
    items.forEach((it) => lines.push(`・${it}`));
    lines.push("");
  }
  lines.push(
    "ご返答をいただき次第、お客様別の構成提案・お見積りをあらためてお届けいたします。"
  );
  lines.push("お手数をおかけして恐縮ですが、よろしくお願いいたします。");
  lines.push("");
  // followupUrl がある場合は追加情報入力ページへのリンクを追加
  if (input.followupUrl) {
    lines.push("【追加情報入力ページ】");
    lines.push("メールへの返信だけでなく、下記のページからも追加情報をご入力いただけます。");
    lines.push(input.followupUrl);
    lines.push("");
  }
  lines.push("金井ホームページ制作");
  lines.push("Email: info@kanei-trade.co.jp");
  lines.push(`お問い合わせ ID: ${input.submissionId}`);

  const text = lines
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === "" && i > 1))
    .join("\n");

  // 従来の質問/項目リスト（構造化補足要求がないときのフォールバック）
  const questionsHtml =
    questions.length > 0
      ? questions
          .map(
            (q, i) =>
              `<li style="margin-bottom:8px;line-height:1.7;">${i + 1}. ${escapeHtml(
                q
              )}</li>`
          )
          .join("")
      : items
          .map(
            (it) =>
              `<li style="margin-bottom:6px;line-height:1.7;">${escapeHtml(it)}</li>`
          )
          .join("");

  // 構造化補足要求の HTML ブロック（項目別カード: label / guidance / 現在値）
  const supplementsHtml = supplements.length > 0
    ? supplements
        .map((s, i) => {
          const currentValueLine = s.currentValue
            ? `<p style="margin:6px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">現在のご入力: ${escapeHtml(s.currentValue)}</p>`
            : "";
          return `<div style="padding:10px 12px;border:1px solid #fde68a;border-radius:8px;background:#ffffff;">
      <p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:#92400e;">${i + 1}. ${escapeHtml(s.label)}</p>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#111827;">${escapeHtml(s.guidance)}</p>${currentValueLine}
    </div>`;
        })
        .join("")
    : "";

  // 構造化補足要求があれば項目別カードを優先、なければ従来の質問リスト
  const contentBlockHtml = supplements.length > 0
    ? `<div style="margin:20px 0;padding:16px;border:1px solid #fcd34d;border-radius:12px;background:#fffbeb;">
    <p style="margin:0 0 10px;font-size:13px;font-weight:bold;color:#92400e;">ご確認・ご補足いただきたい項目</p>
    <div style="display:flex;flex-direction:column;gap:10px;">${supplementsHtml}</div>
  </div>`
    : `<div style="margin:20px 0;padding:16px;border:1px solid #fcd34d;border-radius:12px;background:#fffbeb;">
    <p style="margin:0 0 10px;font-size:13px;font-weight:bold;color:#92400e;">お伺いしたいこと</p>
    <ol style="margin:0;padding-left:20px;font-size:14px;color:#111827;">${questionsHtml}</ol>
  </div>`;

  // followupUrl がある場合は追加情報入力ページへのリンクブロックを追加
  const followupUrlHtml = input.followupUrl
    ? `<div style="margin:20px 0;padding:16px;border:1px solid #a78bfa;border-radius:12px;background:#f5f3ff;">
	    <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#6d28d9;">追加情報入力ページ</p>
	    <p style="margin:0 0 4px;font-size:13px;color:#4c1d95;">メールへの返信だけでなく、下記のページからも追加情報をご入力いただけます。</p>
	    <p style="margin:0;"><a href="${escapeHtml(
        input.followupUrl
      )}" style="color:#7c3aed;word-break:break-all;font-weight:bold;">${escapeHtml(
        input.followupUrl
      )}</a></p>
	  </div>`
    : "";

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Meiryo,sans-serif;color:#111827;max-width:600px;">
  <p style="font-size:15px;">${escapeHtml(displayName)} 様</p>
  <p style="font-size:14px;line-height:1.8;">
    この度は、ホームページ制作のご相談をいただきありがとうございます。<br/>
    ご入力いただいた内容は無事に受け取りました。
  </p>
  <p style="font-size:14px;line-height:1.8;">
    お客様に最適なご提案を用意するため、もう少しだけ詳しくお伺いしたいことがございます。<br/>
    以下の点について、このメールにそのままご返信いただくか、箇条書きで教えていただけますでしょうか。
  </p>
  ${contentBlockHtml}
  <p style="font-size:14px;line-height:1.8;">
    ご返答をいただき次第、お客様別の構成提案・お見積りをあらためてお届けいたします。<br/>
    お手数をおかけして恐縮ですが、よろしくお願いいたします。
  </p>
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
    purpose: "customer-followup",
  };
}

/* ------------------------------------------------------------------ */
/*  お客様向け「本制作前ヒアリングご依頼」メール                         */
/* ------------------------------------------------------------------ */

/**
 * デモをご承認いただいたあと、本制作を始める前の追加ヒアリング・素材収集を
 * お願いするメールを組み立てる。ヒアリング回答ページの URL を載せる。
 * まだ完成したとは伝えない（あくまで「最後にもう少しだけ」の位置づけ）。
 */
export function buildCustomerPreProductionInterviewMail(
  input: CustomerPreProductionInterviewEmailInput
): SendMailInput {
  const displayName = input.customerName || input.companyName || "ご依頼主様";
  const companyNameLine = input.companyName ? `${input.companyName} 様\n\n` : "";
  const subject = `【金井ホームページ制作】本制作を始める前に、もう少しお伺いします — ${
    input.companyName || "ご依頼主様"
  }`;

  const questions = (input.questions ?? []).filter((q) => q.trim().length > 0);

  const lines: string[] = [];
  lines.push(`${displayName} 様`);
  lines.push("");
  lines.push(companyNameLine);
  lines.push("この度は、デモページをご確認いただきありがとうございました。");
  lines.push(
    "ご承認いただきありがとうございます。いよいよ本制作に着手いたします。"
  );
  lines.push("");
  lines.push(
    "本制作を始めるにあたり、最後にもう少しだけ詳しくお伺いしたいことがございます。"
  );
  lines.push(
    "下記のページから、いくつかの質問にお答えいただき、追加の素材（写真や資料など）があれば"
  );
  lines.push("ご提出いただけますでしょうか。");
  lines.push("");
  lines.push("【本制作前ヒアリング ページ】");
  lines.push(input.interviewUrl);
  lines.push("");
  if (questions.length > 0) {
    lines.push("【お伺いしたいこと（ページでもご回答いただけます）】");
    questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    lines.push("");
  }
  lines.push(
    "いただいたご回答と素材をもとに、最終的なホームページを制作してまいります。"
  );
  lines.push("お手数をおかけいたしますが、よろしくお願いいたします。");
  lines.push("");
  lines.push("金井ホームページ制作");
  lines.push("Email: info@kanei-trade.co.jp");
  lines.push(`お問い合わせ ID: ${input.submissionId}`);

  const text = lines
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === "" && i > 1))
    .join("\n");

  const questionsHtml =
    questions.length > 0
      ? questions
          .map(
            (q, i) =>
              `<li style="margin-bottom:8px;line-height:1.7;">${i + 1}. ${escapeHtml(
                q
              )}</li>`
          )
          .join("")
      : "";

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Meiryo,sans-serif;color:#111827;max-width:600px;">
  <p style="font-size:15px;">${escapeHtml(displayName)} 様</p>
  <p style="font-size:14px;line-height:1.8;">
    この度は、デモページをご確認いただきありがとうございました。<br/>
    ご承認いただきありがとうございます。いよいよ<span style="font-weight:bold;">本制作</span>に着手いたします。
  </p>
  <p style="font-size:14px;line-height:1.8;">
    本制作を始めるにあたり、最後にもう少しだけ詳しくお伺いしたいことがございます。<br/>
    下記のページから、いくつかの質問にお答えいただき、追加の素材（写真や資料など）があればご提出いただけますでしょうか。
  </p>
  <div style="margin:20px 0;padding:16px;border:1px solid #a78bfa;border-radius:12px;background:#f5f3ff;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#6d28d9;">本制作前ヒアリング ページ</p>
    <p style="margin:0;"><a href="${escapeHtml(
      input.interviewUrl
    )}" style="color:#7c3aed;word-break:break-all;font-weight:bold;">${escapeHtml(
    input.interviewUrl
  )}</a></p>
  </div>${
    questionsHtml
      ? `<div style="margin:20px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
    <p style="margin:0 0 10px;font-size:13px;font-weight:bold;color:#374151;">お伺いしたいこと（ページでもご回答いただけます）</p>
    <ol style="margin:0;padding-left:20px;font-size:14px;color:#111827;">${questionsHtml}</ol>
  </div>`
      : ""
  }
  <p style="font-size:14px;line-height:1.8;">
    いただいたご回答と素材をもとに、最終的なホームページを制作してまいります。<br/>
    お手数をおかけいたしますが、よろしくお願いいたします。
  </p>
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
    purpose: "customer-pre-production-interview",
  };
}

/* ------------------------------------------------------------------ */
/*  お客様向け確認応答メール（内部レビュー中の案内）                     */
/* ------------------------------------------------------------------ */

/**
 * 相談内容が十分と判定され、社内レビューへ回ったときにお客様へ送る
 * 「受け付けた・現在内部で検討中」を伝えるメールを組み立てる。
 *
 * 重要:
 *   - 提案ページ URL は載せない（まだ承認・生成されていないため）。
 *   - 「提案が完成しました」等の、完成を想起させる表現は使わない。
 *   - 追加質問は載せない（それが必要な場合はフォローアップメールを使う）。
 */
export function buildCustomerReviewAcknowledgementMail(
  input: CustomerReviewAcknowledgementEmailInput
): SendMailInput {
  const displayName = input.customerName || input.companyName || "ご依頼主様";
  const companyNameLine = input.companyName ? `${input.companyName} 様\n\n` : "";
  const subject = `【金井ホームページ制作】ご相談を受け付けました — ${
    input.companyName || "ご依頼主様"
  }`;

  const lines: string[] = [];
  lines.push(`${displayName} 様`);
  lines.push("");
  lines.push(companyNameLine);
  lines.push("この度は、ホームページ制作のご相談をいただきありがとうございます。");
  lines.push("ご入力いただいた内容は無事に受け取りました。");
  lines.push("");
  lines.push(
    "いただいた内容をもとに、担当者が社内で確認を進めております。"
  );
  lines.push(
    "確認が整い次第、構成案や今後の進め方について改めてご連絡させていただきます。"
  );
  lines.push("今しばらくお待ちくださいますようお願いいたします。");
  lines.push("");
  lines.push(
    "なお、ご入力内容に追加・修正がございましたら、このメールにそのままご返信ください。"
  );
  lines.push("");
  lines.push("引き続き、よろしくお願い申し上げます。");
  lines.push("");
  lines.push("金井ホームページ制作");
  lines.push("Email: info@kanei-trade.co.jp");
  lines.push(`お問い合わせ ID: ${input.submissionId}`);

  const text = lines
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === "" && i > 1))
    .join("\n");

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Meiryo,sans-serif;color:#111827;max-width:600px;">
  <p style="font-size:15px;">${escapeHtml(displayName)} 様</p>
  <p style="font-size:14px;line-height:1.8;">
    この度は、ホームページ制作のご相談をいただきありがとうございます。<br/>
    ご入力いただいた内容は無事に受け取りました。
  </p>
  <div style="margin:20px 0;padding:16px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;">
    <p style="margin:0;font-size:14px;line-height:1.8;color:#1e3a8a;">
      いただいた内容をもとに、担当者が社内で確認を進めております。<br/>
      確認が整い次第、構成案や今後の進め方について改めてご連絡させていただきます。<br/>
      今しばらくお待ちくださいますようお願いいたします。
    </p>
  </div>
  <p style="font-size:14px;line-height:1.8;">
    なお、ご入力内容に追加・修正がございましたら、このメールにそのままご返信ください。
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
    purpose: "customer-review-acknowledgement",
  };
}
