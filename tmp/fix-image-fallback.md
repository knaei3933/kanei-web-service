# Fix image handling in demo generation prompts

## Role
Full-stack developer for kanei-web-service (Next.js + Tailwind + Vercel).

## Objective
Fix demo generation so that when customer provides no images, the generated demo still has rich visuals (CSS gradients, SVG patterns, lucide icons, geometric shapes) instead of text-only layout.

## Context
- Project: `/mnt/c/Users/kanei/claudecode/02.Homepage_Dev/kanei-web-service/`
- Current problem: When `assessImageFallback` returns `not_needed` but no images are actually provided, `buildImageFallbackPromptLines` outputs "AI仮画像は不要。顧客提供の写真・ロゴをそのまま使用する。" — Claude Code then builds a text-only demo with no visual elements.
- Root cause: `assessImageFallback` checks `missingAssets.includes("写真・画像")` but the brief's `declaredMissingRaw` uses English labels like "photos", "logo". The mapping in `buildInitialApprovalPackage` translates these but may not always produce "写真・画像" exactly.

## Files to modify

### 1. `src/lib/approval-package.ts` — `buildImageFallbackPromptLines` (around line 891)

**Current behavior (not_needed):**
```
## AI画像フォールバック方針（内部専用）
- 判定: AI仮画像は不要。顧客提供の写真・ロゴをそのまま使用する。
```

**New behavior (not_needed but no attachments):**
When `fb.status === "not_needed"` AND the package has zero image attachments, change the prompt to instruct Claude Code to use CSS-based visual placeholders:

```
## AI画像フォールバック方針（内部専用）
- 判定: 顧客から画像は提供されていません。
- 画像生成API（codex/dall-e）は使用禁止。Unsplash等の外部画像も禁止。
- 以下の方法でビジュアルを構成すること（外部画像URL・base64埋め込みは一切禁止）:
  1. CSS gradient（linear-gradient, radial-gradient）を背景に使用
  2. lucide-react アイコンを大きく配置（Wrench, Factory, Shield 等）
  3. SVG パターン（幾何学模様・ドット柄・波線）で装飾
  4. Tailwind CSS の色・影・グラデーションで視覚的な区切りを作る
  5. Framer Motion のアニメーションで動的な演出
- ヒーロー背景は写真ではなくCSS gradient（例: from-slate-900 to-blue-900）にする。
- 各セクションにlucide-reactアイコンを適切に配置し、テキスト主体でも視覚的にリッチにする。
- 画像プレースホルダーとして<img>タグや外部URLは使用しないこと。
```

When `fb.status === "not_needed"` AND there ARE image attachments, keep the current text ("AI仮画像は不要。顧客提供の写真・ロゴをそのまま使用する。").

### 2. `src/lib/approval-package.ts` — `buildExecutionPromptMarkdown` (around line 853)

Add a new section **after** the `buildImageFallbackPromptLines` output, called:

```
## 視覚設計方針（画像未提供時）
```

This section should only be added when no image attachments exist. It should contain:
- "すべてのビジュアルはCSS・SVG・lucide-reactアイコンのみで構成する"
- "外部画像URL、Unsplash、base64埋め込みは一切禁止"
- "ヒーロー: 大きな見出し＋サブテキスト＋CTAボタンをCSS gradient背景に配置"
- "実績・数値: lucide-reactアイコン（TrendingUp, Users等）＋大きな数字"
- "設備紹介: Wrench, Settings, Shield等のアイコン＋説明テキスト"
- "お客様の声: プレースホルダーアバター（CSSによるイニシャル丸＋色）＋引用テキスト"
- "全セクション: Tailwindのcolor/spacing/shadowで視覚的なリズムを作る"

### 3. `src/lib/approval-package.ts` — `buildExecutionSectionPromptsMarkdown` (around line 1238)

In `buildSectionPromptBlocks`, when `!hasImagerySupport` (no image fallback), inject into each section's implementation text a note:

For HERO section: "背景はCSS gradient（業種に応じた色調）で構成。写真は使用しない。"
For sections that normally need images: "lucide-reactアイコンでビジュアルを補う。外部画像は使用しない。"

### 4. `src/lib/image-fallback.ts` — `assessImageFallback` (around line 222)

The `not_needed` branch at line 222-227 should be tightened:
- If `status` would be `not_needed` BUT `attachmentCount === 0`, override to `allowed` with rationale "添付画像がなく、ビジュアルが必要なセクション（hero, gallery等）があるため、CSS/SVGベースの仮ビジュアルで補う。"

## Constraints
- Japanese text in code/comments
- No breaking API changes
- `npx tsc --noEmit` must pass
- Keep the `not_needed` behavior when images ARE actually provided
- Claude Code prompt instructions must be clear and directive (not optional)

## Verification
After editing, run `npx tsc --noEmit` in the project directory.
