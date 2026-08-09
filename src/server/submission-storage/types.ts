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
 * アダプタ経由で恒久保存する「テキスト成果物」のファイル名（固定セット）。
 * これ以外のファイル名はアダプタでもプロキシルートでも拒否する
 * （パストラバーサル・意図しないファイルの上書きを防ぐため）。
 *
 * ※ 添付ファイル本体（バイナリ）はこのホワイトリストとは別経路で扱う。
 *    専用の writeAttachment / readAttachment で files/<savedName> キーに
 *    読み書きし、relay モードでは上流リレーへバイナリとして恒久保存する。
 *    添付の「メタデータ」も引き続き submission.json /
 *    approval-package.json に保持され、レビュー時には参照できる。
 */
export const ARTIFACT_FILE_NAMES = [
  "submission.json",
  "brief.json",
  "approval-package.json",
  "omc-plan.json",
  "execution-handoff.json",
  "execution-prompt.md",
  "demo-feedback.json",
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
 * 添付ファイルの保存名（savedName）として安全か。
 * consult route の sanitizeFilename + 連番プレフィックス（"NN-..."）が生成する名前を想定。
 *
 * 許可: 多バイト文字（日本語を含む）・ドット（途中）・ハイフン等。
 * 拒否: 空文字・長すぎる（255 超）・パス区切り（/ \）・制御文字・
 *       カレント/親ディレクトリ参照（. ..）・先頭ドット（dotfile・トラバーサル抑止）。
 *
 * ※ savedName は常に files/ 配下に置かれるため、テキスト成果物の
 *    ホワイトリスト（ARTIFACT_FILE_NAMES）との衝突は起きない。
 */
export function isSafeAttachmentName(name: string): boolean {
  if (typeof name !== "string") return false;
  if (name.length === 0 || name.length > 255) return false;
  // パス区切り・制御文字(0x00-0x1F, 0x7F) を拒否
  if (/[\/\\\x00-\x1f\x7f]/.test(name)) return false;
  // カレント/親ディレクトリ参照そのもの・先頭ドットを拒否
  if (name === "." || name === ".." || name.startsWith(".")) return false;
  return true;
}

/**
 * 成果物ストレージアダプタが満たすべきインターフェース。
 *
 * 扱う対象は2種類:
 *  - テキスト成果物（writeArtifact / readArtifact）: JSON・Markdown など UTF-8 文字列。
 *  - バイナリ添付（writeAttachment / readAttachment）: 顧客アップロードの画像・PDF 等。
 *    キーは files/<savedName>。relay では上流へ application/octet-stream で恒久保存する。
 */
export interface SubmissionStorageAdapter {
  /** プロバイダ名（filesystem / relay） */
  readonly name: "filesystem" | "relay";
  /**
   * テキスト成果物を書き込む（上書き）。ディレクトリは自動で作る。
   * リレー未設定などで書けない場合は例外を投げる（呼び出し側で判断）。
   */
  writeArtifact(
    submissionId: string,
    fileName: ArtifactFileName,
    content: string
  ): Promise<void>;
  /**
   * テキスト成果物を読み込む。不在時・読み取り失敗時は null を返す
   * （ファイルシステム実装の「例外 → null」と同じ挙動に揃える）。
   */
  readArtifact(
    submissionId: string,
    fileName: ArtifactFileName
  ): Promise<string | null>;
  /** テキスト成果物が存在するか。 */
  artifactExists(
    submissionId: string,
    fileName: ArtifactFileName
  ): Promise<boolean>;
  /**
   * バイナリ添付を書き込む（上書き）。files/<savedName> に置く。
   * ディレクトリは自動で作る。relay 未設定等で書けない場合は例外を投げる。
   *
   * contentType はアップロード時の MIME タイプ。relay プロバイダはこれを
   * 上流へ content-type ヘッダーとして転送し、ダウンロード時に生かす。
   * filesystem プロバイダは本体を raw バイナリで保存し、MIME は
   * submission.json のメタデータ（type）が管理するため参照しない。
   */
  writeAttachment(
    submissionId: string,
    savedName: string,
    bytes: Uint8Array,
    contentType: string
  ): Promise<void>;
  /**
   * バイナリ添付を読み込む。不在時・読み取り失敗時は null を返す
   * （テキスト成果物と同じ挙動に揃える）。
   */
  readAttachment(
    submissionId: string,
    savedName: string
  ): Promise<Uint8Array | null>;
}
