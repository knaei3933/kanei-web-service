/* ------------------------------------------------------------------ */
/*  Relay プロバイダ（SMTP 拒否時の HTTP リレー経由フォールバック）      */
/* ------------------------------------------------------------------ */
/*  本番（Vercel 等）で SMTP がプロバイダ拒否（554 client host rejected  */
/*  など）で失敗したときのセーフティネット。                             */
/*                                                                      */
/*  仕組み:                                                            */
/*    - Vercel 側からは直接 SMTP 送信できない（IP が拒否される）ため、   */
/*      代わりに社内 WSL のリレーサーバーへ JSON ペイロードを POST する。 */
/*    - リレーサーバー（kanei_mail_relay.py）が会社 SMTP から代理送信。  */
/*    - Vercel 側は MAIL_RELAY_URL / MAIL_RELAY_SECRET で認証する。      */
/*                                                                      */
/*  設計上のポイント:                                                   */
/*    - Node 18+ のグローバル fetch を使い、外部依存を増やさない。       */
/*    - MAIL_RELAY_URL / MAIL_RELAY_SECRET が未設定なら                */
/*      isRelayConfigured() が false を返し、フォールバック自体が無効。  */
/*    - 送信失敗時は例外を投げず status:"error" の MailResult を返す     */
/*      （パイプライン全体が止まらないようにするため）。                 */
/* ------------------------------------------------------------------ */

import type { MailProvider, MailResult, SendMailInput } from "../types";

/** リレーサーバーへ送る JSON ペイロード（リレーサーバーと共有する契約） */
interface RelayPayload {
  to: Array<{ name?: string; address: string }>;
  subject: string;
  text: string;
  html?: string | null;
  replyTo?: string | null;
  purpose?: string;
  submissionId?: string;
}

/** リレーサーバーが返す結果ボディ（緩い型 — 信用しきっては扱わない） */
interface RelayResponse {
  status?: string;
  messageId?: string | null;
  accepted?: string[];
  error?: string;
}

/** MAIL_RELAY_URL / MAIL_RELAY_SECRET がそろっているか（フォールバック有効判定） */
export function isRelayConfigured(): boolean {
  return Boolean(process.env.MAIL_RELAY_URL && process.env.MAIL_RELAY_SECRET);
}

/** Relay プロバイダの実装 */
export const relayProvider: MailProvider = {
  name: "relay",

  async send(input: SendMailInput): Promise<MailResult> {
    const accepted = input.to.map((a) => a.address);
    const url = process.env.MAIL_RELAY_URL;
    const secret = process.env.MAIL_RELAY_SECRET;

    if (!url || !secret) {
      return {
        provider: "relay",
        accepted,
        messageId: null,
        status: "error",
        error:
          "MAIL_RELAY_URL / MAIL_RELAY_SECRET が未設定のためリレー送信できません。",
      };
    }

    const payload: RelayPayload = {
      to: input.to.map((a) => ({ name: a.name, address: a.address })),
      subject: input.subject,
      text: input.text,
      html: input.html ?? null,
      replyTo: input.replyTo ?? null,
      purpose: input.purpose,
      submissionId: input.submissionId,
    };

    // リレー呼び出しはサーバーレス関数を長引かせないよう短めにタイムアウト。
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${secret}`, 
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = (await res.json().catch(() => null)) as RelayResponse | null;

      if (!res.ok || !data || data.status !== "sent") {
        return {
          provider: "relay",
          accepted,
          messageId: data?.messageId ?? null,
          status: "error",
          error:
            data?.error ??
            `リレーサーバーがエラーを返しました（HTTP ${res.status}）。`,
        };
      }

      return {
        provider: "relay",
        accepted: data.accepted?.length ? data.accepted : accepted,
        messageId: data.messageId ?? null,
        status: "sent",
      };
    } catch (err) {
      return {
        provider: "relay",
        accepted,
        messageId: null,
        status: "error",
        error: `リレー送信に失敗: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      clearTimeout(timer);
    }
  },
};
