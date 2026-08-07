/* ------------------------------------------------------------------ */
/*  Log プロバイダ（SMTP が使えないときの構造化フォールバック）         */
/* ------------------------------------------------------------------ */
/*  実際の SMTP 配信を行わず、送信内容を JSON ファイルとしてディスク     */
/*  （ローカルは data/mail-log/、Vercel は /tmp/mail-log/）へ書き出す。  */
/*  これにより:                                                          */
/*    - 本番 SMTP 秘密鍵/クレデンシャルが未設定でもクラッシュしない       */
/*    - ローカル/プレビューで「何が送られる予定だったか」を確認できる     */
/*  ただし実際の受信箱には届かないため、結果 status は "logged" とする。  */
/* ------------------------------------------------------------------ */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import type { MailProvider, MailResult, SendMailInput } from "../types";

const IS_SERVERLESS = process.env.VERCEL === "1";

/** ログ成果物の保存ルート */
const LOG_DIR = IS_SERVERLESS
  ? join(tmpdir(), "mail-log")
  : join(process.cwd(), "data", "mail-log");

/** Log プロバイダの実装 */
export const logProvider: MailProvider = {
  name: "log",

  async send(input: SendMailInput): Promise<MailResult> {
    const now = new Date();
    const stamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = randomUUID().split("-")[0];
    const purpose = input.purpose ?? "mail";
    const fileName = `${stamp}-${purpose}-${rand}.json`;
    const filePath = join(LOG_DIR, fileName);

    const artifact = {
      provider: "log" as const,
      purpose,
      submissionId: input.submissionId ?? null,
      recordedAt: now.toISOString(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? null,
      replyTo: input.replyTo ?? null,
      note: "SMTP 未設定のため実際の配送は行われず、送信内容を記録しました。",
    };

    try {
      await mkdir(LOG_DIR, { recursive: true });
      await writeFile(filePath, JSON.stringify(artifact, null, 2), "utf8");
    } catch (err) {
      // ディスク書き込みに失敗しても「送信を試みた事実」は残す
      return {
        provider: "log",
        accepted: input.to.map((a) => a.address),
        messageId: null,
        status: "error",
        error: `ログの書き出しに失敗: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // 合成メッセージ ID（受信箱には届かないが、追跡用の一意識別子）
    const messageId = `<log-${stamp}-${rand}@kanei-web-service.local>`;

    return {
      provider: "log",
      accepted: input.to.map((a) => a.address),
      messageId,
      status: "logged",
      artifactPath: IS_SERVERLESS ? filePath : `data/mail-log/${fileName}`,
    };
  },
};

/** 2桁ゼロ埋め */
function pad(n: number): string {
  return String(n).padStart(2, "0");
}
