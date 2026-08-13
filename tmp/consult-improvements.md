# /consult フォーム改善 — 3つのタスク

## 役割 (Role)
あなたは日本の中小企業向けHP制作サービスのフロントエンド開発者です。UXを重視し、顧客の入力負荷を最小限にしつつ、HP制作に必要な情報を確実に収集します。

## 目的 (Objective)
`src/app/consult/page.tsx` (3153行) に3つの改善を実装すること。

## 必要な文脈 (Context)
- **プロジェクト**: カーネイム役HP制作サービス (Next.js + Tailwind)
- **ファイル**: `/mnt/c/Users/kanei/claudecode/02.Homepage_Dev/kanei-web-service/src/app/consult/page.tsx`
- **構造**: 7ステップのヒアリングフォーム
  - Step 1: 事業について (businessType, currentWebsite, companyName)
  - Step 2: ターゲットと伝えたいこと (targetCustomer, sellingPoints, mustIncludeInfo, avoidItems, currentSiteIssues)
  - Step 3: どんなHPにしたいか (desiredImage, colorScheme, referenceSites, currentIssues)
  - Step 4: 目的と機能 (sitePurpose, features, timing)
  - Step 5: 予算 (budget)
  - Step 6: 素材
  - Step 7: 顧客情報
- **既存コンポーネント**: CheckboxTag, RadioCard, FieldLabel は既存
- **フォームデータ送信時**: `referenceSites` は meaningfulReferenceSites にフィルタ (URLが空なら除外)
- **FormData interface**: referenceSites: ReferenceSite[], currentSiteIssues: string

## 制約 (Constraints)
- **日本語テキストのみ** — 英語ラベル禁止
- **既存のスタイルパターンを維持** — fieldClass, rounded-2xl, border-2 など
- **ReferenceSite interface は変更しない** — 既存フィールド(type, url, whatToReference, likedSections, followLevel)を維持
- **バリデーションは既存パターンに従う** — CheckboxTag: チェック1件以上 OR テキスト入力
- **送信payload に新しいフィールドを追加する場合は既存の assessConsultIntake に影響しないこと**
- **破壊的変更禁止** — 既存のステップ番号・フィールド名・送信データ構造を壊さない

## 出力形式 (Output)
3つのタスクすべてを同じ `consult/page.tsx` ファイルに実装。

## 検証条件 (Verification)
- `npx tsc --noEmit` がエラーなしで通ること
- 既存のStep 1〜7のレイアウトが崩れていないこと

---

## タスク1: 参考サイト入力の簡略化

**現状の問題**: 1サイトに5フィールド（種類, URL, 参考にしたい部分, 好きな箇所, 再現度）があり、大部分の顧客はURLだけ入力したい。カードが大きすぎる。

**改善方針**:
1. ReferenceSiteCard の **デフォルト表示を最小化**:
   - URLフィールドだけを常に表示（必須ではなく「任意」のまま）
   - 種類(type)、参考にしたい部分、好きな箇所、再現度 → **「詳細を入力」ボタン/リンクをクリックで展開** する折りたたみUIにする
   - 展開時だけ5フィールド全て表示
2. 展開/折りたたみは各カード単位で管理（state を card ごとに持つか、site.id をキーに Set<string> で管理）
3. **「URLのみでもOK」の説明は既にあるので維持**
4. カードのデフォルト（折りたたみ時）の高さを大幅に削減

## タスク2: 競合と比べて劣る点の構造化質問

**現状**: Step 2 に `currentSiteIssues`（7チェックボックス）があるが、「競合と比べて劣る点」に特化した質問がない。

**追加箇所**: Step 2 の `currentSiteIssues` の **直後** に新しいセクションを追加。

**UI**:
- セクション名: 「競合他社と比べて自社のHPで見劣りする点（任意）」
- CheckboxTag パターン（既存の currentSiteIssues と同じスタイル）+ 自由入力テキストボックス
- チェックボックス項目:
  - 「デザインや見た目が劣る」
  - 「情報量が少ない・内容が薄い」
  - 「スマホ対応が不十分」
  - 「問い合わせフォームがない・使いにくい」
  - 「SEO対策ができていない（検索に出ない）」
  - 「更新頻度が低く古く見える」
  - 「写真や実績の提示が不足」
- 自由入力テキストボックス（placeholder: 「その他、気になる点があればご記入ください」）
- 送信時: `[...checkboxes, freeText].filter(Boolean).join(" / ")` で結合
- **prefer**: 新しいフィールド `competitorWeakness: string` を FormData interface に追加し、送信payload に含める。avoidItems はそのまま維持。
- バリデーション: チェックボックス1件以上 OR テキスト入力 で有効。全体として任意セクション。

## タスク3: 業種別プリセット（Step 1 選択時の自動プリフィル）

**現状**: Step 1 で業種(businessType)を選んでも、Step 2 以降の内容は空のままで顧客がすべて手入力。

**改善方針**:
1. 業種選択時に **Step 2 のおすすめ項目を自動チェック**（プリセット）
2. **必須ではない** — プリセットはあくまで推奨値であり、顧客は自由に変更・解除可能
3. プリセットの定義（定数オブジェクト）:

```typescript
const INDUSTRY_PRESETS: Record<string, {
  targetCustomer?: string[];
  sellingPoints?: string[];
  mustIncludeInfo?: string[];
}> = {
  "製造業": {
    targetCustomer: ["40代・50代", "男性"],
    sellingPoints: ["技術力・品質の高さ", "設備の充実度"],
    mustIncludeInfo: ["会社概要", "実績・事例", "設備紹介"],
  },
  "建設業": {
    targetCustomer: ["30代・40代", "男性", "地域のお客様"],
    sellingPoints: ["技術力・品質の高さ", "対応の早さ"],
    mustIncludeInfo: ["会社概要", "実績・事例", "施工事例"],
  },
  "飲食業": {
    targetCustomer: ["20代・30代", "女性", "地域のお客様"],
    sellingPoints: ["品質のこだわり", "立地・アクセスの良さ", "スタッフの対応"],
    mustIncludeInfo: ["メニュー・料金", "店舗情報・アクセス", "写真・雰囲気"],
  },
  "美容室": {
    targetCustomer: ["20代・30代", "女性"],
    sellingPoints: ["スタイリストの技術", "内装・雰囲気", "スタッフの対応"],
    mustIncludeInfo: ["スタイリスト紹介", "メニュー・料金", "写真・雰囲気"],
  },
  "整骨院・クリニック": {
    targetCustomer: ["30代・50代", "男女"],
    sellingPoints: ["専門性・資格", "スタッフの対応"],
    mustIncludeInfo: ["診療内容・メニュー", "施設・設備", "アクセス・営業時間"],
  },
  "IT・コンサルティング": {
    targetCustomer: ["30代・50代", "企業の決裁者"],
    sellingPoints: ["技術力・品質の高さ", "実績の豊富さ", "対応の早さ"],
    mustIncludeInfo: ["サービス内容", "実績・事例", "会社概要"],
  },
};
```

4. **トリガー**: Step 1 で businessType が変更された時 → 該当プリセットがある場合 → CheckboxTag の値をマージ（既存の選択を上書きせず追加）
5. **UX**: プリセット適用時に軽いトースト/メッセージで「業種に合わせておすすめ項目を設定しました。お好みで変更してください。」を表示（alert禁止）
6. **CheckboxTag の値の一致**: プリセットの文字列が CheckboxTag の各チェックボックスの value と完全一致するよう調整すること。対象 CheckboxTag は:
   - targetCustomer: Step 2 の年齢(5)/性別(3)/地域(4)/顧客層(3) グループ
   - sellingPoints: Step 2 の技術・品質(4)/サービス(4)/価格(3)/立地・設備(3)/スタッフ(4) グループ
   - mustIncludeInfo: Step 2 の基本(4)/サービス(4)/信頼性(4)/コンバージョン(4) グループ

各CheckboxTag グループの value 定義を確認し、プリセット値を完全に一致させること。
