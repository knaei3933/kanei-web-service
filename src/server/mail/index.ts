/* ------------------------------------------------------------------ */
/*  メール送信の公開 API（プロバイダ解決 + 2つの送信フロー）           */
/* ------------------------------------------------------------------ */
/*  相談パイプラインの mail 層の入り口。                                 */
/*                                                                    */
/*  環境変数:                                                           */
/*    MAIL_PROVIDER   = "smtp" | "log"（既定: log）                     */
/*    MAIL_FROM       差出人アドレス                                    */
/*    MAIL_REPLY_TO   返信先                                           */
/*    MAIL_INTERNAL_TO 社内通知の宛先（既定: arwg22@gmail.com）         */
/*    SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASS       */
/*                                                                    */
/*  振る舞い:                                                           */
/*    - MAIL_PROVIDER=smtp でも SMTP_* が未設定なら自動で log に落ちる  */
/*    - SMTP env 無しでもクラッシュしない（構造化ログフォールバック）   */
/*    - どのフローも「送信自体の失敗」で例外を投げず MailResult を返す   */
/* ------------------------------------------------------------------ */

import { logProvider } from "./providers/log";
import { smtpProvider, isSmtpConfigured } from "./providers/smtp";
import {
  buildInternalNotificationMail,
  buildCustomerProposalMail,
} from "./templates";
import type {
  CustomerProposalEmailInput,
  InternalConsultNotificationInput,
  MailConfigStatus,
  MailProvider,
  MailProviderName,
  MailResult,
} from "./types";

/** 社内通知の既定の宛先 */
const DEFAULT_INTERNAL_TO = "arwg22@gmail.com";
/** 差出人の既定アドレス */
const DEFAULT_FROM = "no-reply@kanei-trade.co.jp";

/** 簡易的なメールアドレス形式チェック */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** 現在の環境で有効なメールプロバイダを解決する */
export function resolveMailProvider(): MailProvider {
  const requested = (process.env.MAIL_PROVIDER ?? "log").toLowerCase();
  if (requested === "smtp" && isSmtpConfigured()) {
    return smtpProvider;
  }
  return logProvider;
}

/** プロバイダ選択の診断情報を返す（UI / ログ表示用） */
export function getMailConfigStatus(): MailConfigStatus {
  const requested = (process.env.MAIL_PROVIDER ?? "log").toLowerCase();
  const smtpReady = isSmtpConfigured();
  const activeProvider: MailProviderName =
    requested === "smtp" && smtpReady ? "smtp" : "log";

  let reason: string;
  if (requested === "smtp" && smtpReady) {
    reason = "MAIL_PROVIDER=smtp かつ SMTP_* 設定が揃っているため SMTP で送信します。";
  } else if (requested === "smtp" && !smtpReady) {
    reason =
      "MAIL_PROVIDER=smtp ですが SMTP_* が未設定のため、構造化ログへフォールバックします。";
  } else {
    reason = "MAIL_PROVIDER=log のため、構造化ログへ記録します（実際の配送は行いません）。";
  }

  return {
    activeProvider,
    reason,
    smtpAvailable: smtpReady,
    internalTo: process.env.MAIL_INTERNAL_TO ?? DEFAULT_INTERNAL_TO,
    from: process.env.MAIL_FROM ?? DEFAULT_FROM,
  };
}

/**
 * 社内向け通知メールを送る（または記録する）。
 * 失敗しても例外を投げず、status:"error" の MailResult を返す。
 */
export async function sendInternalConsultNotification(
  input: InternalConsultNotificationInput
): Promise<MailResult> {
  const internalTo = process.env.MAIL_INTERNAL_TO ?? DEFAULT_INTERNAL_TO;
  const replyTo = process.env.MAIL_REPLY_TO;
  const provider = resolveMailProvider();

  try {
    const mail = buildInternalNotificationMail(internalTo, input);
    return await provider.send({ ...mail, replyTo });
  } catch (err) {
    return {
      provider: provider.name,
      accepted: [internalTo],
      messageId: null,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * お客様へ提案ページのご案内メールを送る（または記録する）。
 * 宛先アドレスが不正な場合は送信せず status:"error" を返す。
 */
export async function sendCustomerProposalEmail(
  input: CustomerProposalEmailInput
): Promise<MailResult> {
  const provider = resolveMailProvider();

  // 宛先が無効なら送信しない（パイプラインは止めない）
  if (!isValidEmail(input.to)) {
    return {
      provider: provider.name,
      accepted: [],
      messageId: null,
      status: "error",
      error: "お客様メールアドレスが不正なため、フォローアップメールを送信できませんでした。",
    };
  }

  try {
    const replyTo = process.env.MAIL_REPLY_TO;
    const mail = buildCustomerProposalMail(input);
    return await provider.send({ ...mail, replyTo });
  } catch (err) {
    return {
      provider: provider.name,
      accepted: [input.to],
      messageId: null,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// 型の再エクスポート（呼び出し側の利便性）
export type {
  CustomerProposalEmailInput,
  InternalConsultNotificationInput,
  MailConfigStatus,
  MailProviderName,
  MailResult,
  MailResultStatus,
} from "./types";
