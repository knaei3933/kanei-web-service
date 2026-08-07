/* ------------------------------------------------------------------ */
/*  メール送信の共通型                                                 */
/* ------------------------------------------------------------------ */
/*  相談パイプラインで使うメール送信の、プロバイダ非依存な型定義。      */
/*  SMTP / log のどちらのプロバイダでも同じ結果オブジェクトを返すため、 */
/*  呼び出し側（API Route 等）は配送結果を統一的に扱える。              */
/* ------------------------------------------------------------------ */

/** プロバイダ種別（環境変数 MAIL_PROVIDER で切り替え） */
export type MailProviderName = "smtp" | "log";

/** メールアドレス（表示名は任意） */
export interface MailAddress {
  /** 表示名（任意・日本語可） */
  name?: string;
  /** メールアドレス本体 */
  address: string;
}

/** プロバイダに渡す送信内容 */
export interface SendMailInput {
  /** 宛先（1件以上） */
  to: MailAddress[];
  /** 件名 */
  subject: string;
  /** プレーンテキスト本文（必須・全プロバイダ共通のフォールバック） */
  text: string;
  /** HTML 本文（任意・SMTP プロバイダで使用） */
  html?: string;
  /** 返信先（任意） */
  replyTo?: string;
  /** 関連づける送信 ID（ログファイル名等に利用） */
  submissionId?: string;
  /** メールの役割ラベル（internal / customer）— ログの分類に使う */
  purpose?: "internal-notification" | "customer-proposal";
}

/** 配送結果の状態 */
export type MailResultStatus = "sent" | "logged" | "error";

/**
 * 全プロバイダが返す構造化された配送結果。
 * - provider: 実際に使ったプロバイダ
 * - accepted: 受理したと判断した宛先アドレス一覧
 * - messageId: プロバイダが発行したメッセージ ID（log は合成 ID）
 * - status: 配送結果の大まかな状態
 * - error: エラー時の理由（利用可能な場合）
 * - artifactPath: log プロバイダが書き出した JSON 成果物のパス
 */
export interface MailResult {
  provider: MailProviderName;
  accepted: string[];
  messageId: string | null;
  status: MailResultStatus;
  error?: string;
  artifactPath?: string;
}

/** メールプロバイダが満たすべきインターフェース */
export interface MailProvider {
  /** プロバイダ名 */
  readonly name: MailProviderName;
  /** 実際にメールを送る（または記録する） */
  send(input: SendMailInput): Promise<MailResult>;
}

/** 社内向け通知メールの組み立てに必要な入力 */
export interface InternalConsultNotificationInput {
  /** 受領 ID */
  submissionId: string;
  /** 保存先の表示用パス（あれば） */
  storagePath?: string | null;
  /** 保存モード（local / serverless） */
  storageMode?: string;
  /** ブリーフ生成有無 */
  briefGenerated?: boolean;
  /** 提案 URL（生成できていれば） */
  proposalUrl?: string | null;
  /** 相談ペイロード（要約に使う） */
  payload: Record<string, unknown>;
  /** 添付ファイル数 */
  fileCount?: number;
}

/** お客様向け提案メールの組み立てに必要な入力 */
export interface CustomerProposalEmailInput {
  /** 宛先メールアドレス */
  to: string;
  /** 宛先のお名前（任意） */
  customerName?: string;
  /** 事業体名（表示に使う） */
  companyName?: string;
  /** 提案ページ URL */
  proposalUrl: string;
  /** 受領 ID */
  submissionId: string;
}

/** プロバイダ解決の診断情報（UI / ログ用） */
export interface MailConfigStatus {
  /** 現在有効なプロバイダ */
  activeProvider: MailProviderName;
  /** SMTP を選んだ理由 / log にフォールバックした理由 */
  reason: string;
  /** SMTP が利用可能と判断されたか */
  smtpAvailable: boolean;
  /** 設定上の宛先（社内通知宛） */
  internalTo: string;
  /** 差出人アドレス */
  from: string;
}
