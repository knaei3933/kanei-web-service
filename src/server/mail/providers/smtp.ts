/* ------------------------------------------------------------------ */
/*  SMTP プロバイダ（nodemailer による実際の配信）                     */
/* ------------------------------------------------------------------ */
/*  本番で実際にお客様/社内へメールを届けるプロバイダ。                  */
/*                                                                    */
/*  設計上のポイント:                                                   */
/*    - nodemailer は send() の中で動的 import する。log フォールバック  */
/*      経路では一切読み込まれず、依存が未導入でもビルドが壊れない。     */
/*    - SMTP_* 環境変数が不完全な場合は isConfigured() が false を返し、 */
/*      index.ts 側で log プロバイダへフォールバックする。               */
/*    - 送信失敗時は例外を投げず status:"error" の MailResult を返す     */
/*      （パイプライン全体が止まらないようにするため）。                */
/* ------------------------------------------------------------------ */

import type { Transporter } from "nodemailer";
import type { MailProvider, MailResult, SendMailInput } from "../types";

/** SMTP 接続設定（環境変数から読み取り） */
interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

/** SMTP_SECURE の "true"/"false" 文字列を真偽値に変換（既定は false） */
function parseSecure(raw: string | undefined): boolean {
  return String(raw ?? "").toLowerCase() === "true";
}

/**
 * SMTP_* 環境変数が最低限そろっているか。
 * host / user / pass は必須。port は無ければ 587、secure は無ければ false。
 */
export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return Boolean(host && user && pass);
}

/** 環境変数から SMTP 設定を組み立てる（未設定項目は既定値で補完） */
function readSmtpConfig(): SmtpConfig {
  return {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: parseSecure(process.env.SMTP_SECURE),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
  };
}

/** transporter の遅延キャッシュ（同一インスタンス内で再利用） */
let cachedTransporter: Transporter | null = null;

/** nodemailer transporter を取得（必要時だけ動的 import して構築） */
async function getTransporter(): Promise<Transporter> {
  if (cachedTransporter) return cachedTransporter;
  const cfg = readSmtpConfig();
  // 動的 import: log フォールバック経路では読み込まれない
  const nodemailer = await import("nodemailer");
  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
  return cachedTransporter;
}

/** SMTP プロバイダの実装 */
export const smtpProvider: MailProvider = {
  name: "smtp",

  async send(input: SendMailInput): Promise<MailResult> {
    const accepted = input.to.map((a) => a.address);

    // 設定不備（フォールバック漏れの二重安全）
    if (!isSmtpConfigured()) {
      return {
        provider: "smtp",
        accepted,
        messageId: null,
        status: "error",
        error:
          "SMTP_* 環境変数が未設定のため送信できません（SMTP_HOST / SMTP_USER / SMTP_PASS が必要）。",
      };
    }

    const fromAddress = process.env.MAIL_FROM || "no-reply@kanei-trade.co.jp";
    const replyTo = input.replyTo ?? process.env.MAIL_REPLY_TO;

    try {
      const transporter = await getTransporter();
      const info = await transporter.sendMail({
        from: fromAddress,
        to: input.to.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)),
        subject: input.subject,
        text: input.text,
        html: input.html,
        replyTo,
      });

      return {
        provider: "smtp",
        accepted,
        messageId: typeof info.messageId === "string" ? info.messageId : null,
        status: "sent",
      };
    } catch (err) {
      // 配送失敗でもパイプラインは止めない — 構造化エラーとして返す
      return {
        provider: "smtp",
        accepted,
        messageId: null,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
