/* ------------------------------------------------------------------ */
/*  相談パイプライン成果物の永続化アダプタ（型・定数）                  */
/* ------------------------------------------------------------------ */
/*  相談1件ごとの成果物（submission.json / brief.json /                 */
/*  approval-package.json / omc-plan.json / execution-handoff.json /   */
/*  execution-prompt.md）をどこに保存するかを環境で切り替えるための、   */
/*  プロバイダ非依存な型定義。                                         */
/*                                                                    */
/*  保存先は3モード（src/server/submission-storage/index.ts で解決）:  */
/*    - local     : ローカル開発のファイルシステム（data/...）         */
/*    - relay     : 本番(serverless)の HTTP リレーバックエンド         */
/*    - ephemeral : 本番でリレー未設定時の /tmp（一時・非恒久）        */
/*                                                                    */
/*  mail プロバイダ（src/server/mail/）と同じ「型だけを分離」構成。    */
/*  プロバイダ実装は types だけに依存し、index との循環参照を避ける。  */
/* ------------------------------------------------------------------ */

/**
 * 成果物の保存モード。
 * - local     : ローカル開発。data/consult-submissions/ へのファイルシステム保存。
 * - relay     : 本番(serverless)でリレー設定あり。HTTP リレー経由で恒久保存。
 * - ephemeral : 本番(serverless)でリレー未設定。/tmp への一時保存（インスタンス再利用で消える）。
 */
export type StorageMode = "local" | "relay" | "ephemeral";

/**
 * アダプタ経由で恒久保存する成果物のファイル名（固定セット）。
 * これ以外のファイル名はアダプタでもプロキシルートでも拒否する
 * （パストラバーサル・意図しないファイルの上書きを防ぐため）。
 *
 * ※ 添付ファイル本体（files/ 以下）はこのセットには含まない。
 *    添付は常にローカル/一時領域（local または /tmp）に置き、
 *    再起動・インスタンス再利用で失われる可能性がある。
 *    ただし添付の「メタデータ」は submission.json /
 *    approval-package.json に保持されるので、レビュー時には参照できる。
 */
export const ARTIFACT_FILE_NAMES = [
  "submission.json",
  "brief.json",
  "approval-package.json",
  "omc-plan.json",
  "execution-handoff.json",
  "execution-prompt.md",
] as const;

/** 成果物のファイル名（固定セットのいずれか） */
export type ArtifactFileName = (typeof ARTIFACT_FILE_NAMES)[number];

/**
 * 文字列が許可された成果物ファイル名かどうか。
 * 型ガイド付き（コンパイル時にリテラル型を絞り込める）。
 */
export function isArtifactFileName(name: string): name is ArtifactFileName {
  return (ARTIFACT_FILE_NAMES as readonly string[]).includes(name);
}

/**
 * パス区切りを含まない安全な submissionId か（トラバーサル対策）。
 * consult route の createSubmissionId が生成する形式（英数字・._-）に合致する。
 */
export function isSafeSubmissionId(id: string): boolean {
  return typeof id === "string" && id.length > 0 && /^[A-Za-z0-9._-]+$/.test(id);
}

/**
 * 成果物ストレージアダプタが満たすべきインターフェース。
 * 成果物はすべて UTF-8 テキスト（JSON も Markdown も文字列）として扱う。
 */
export interface SubmissionStorageAdapter {
  /** プロバイダ名（filesystem / relay） */
  readonly name: "filesystem" | "relay";
  /**
   * 成果物を書き込む（上書き）。ディレクトリは自動で作る。
   * リレー未設定などで書けない場合は例外を投げる（呼び出し側で判断）。
   */
  writeArtifact(
    submissionId: string,
    fileName: ArtifactFileName,
    content: string
  ): Promise<void>;
  /**
   * 成果物を読み込む。不在時・読み取り失敗時は null を返す
   * （ファイルシステム実装の「例外 → null」と同じ挙動に揃える）。
   */
  readArtifact(
    submissionId: string,
    fileName: ArtifactFileName
  ): Promise<string | null>;
  /** 成果物が存在するか。 */
  artifactExists(
    submissionId: string,
    fileName: ArtifactFileName
  ): Promise<boolean>;
}
