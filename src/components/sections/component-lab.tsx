"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Factory,
  UtensilsCrossed,
  Scissors,
  Hospital,
  Laptop2,
  MousePointerClick,
  BadgeCheck,
  Sparkles,
} from "lucide-react";
import { Section } from "../ui/section";

const LABS = [
  {
    id: "corporate",
    label: "会社案内",
    icon: Building2,
    accent: "from-slate-950 via-slate-900 to-blue-950",
    badge: "信頼感",
    title: "会社の歴史・実績・拠点を、1ページで整理",
    description:
      "会社概要、沿革、代表メッセージ、実績、アクセスを一画面でまとめ、初見でも安心してもらえる構成です。",
    modules: ["会社概要", "沿革", "代表メッセージ", "実績", "アクセス"],
    testAction: "会社の信用情報を確認する",
    stats: ["離脱率 -18%", "商談化率 +22%", "電話クリック +31%"],
  },
  {
    id: "factory",
    label: "製造業",
    icon: Factory,
    accent: "from-blue-950 via-blue-900 to-cyan-900",
    badge: "図解向き",
    title: "設備・製品・納入実績を、営業資料のように見せる",
    description:
      "加工設備、対応材質、製品一覧、納入実績、品質管理をまとめ、見積もり依頼につなげる設計です。",
    modules: ["製品一覧", "設備紹介", "対応材質", "納入実績", "品質管理"],
    testAction: "設備紹介を見せる",
    stats: ["資料請求 +27%", "問い合わせ +19%", "回遊数 +34%"],
  },
  {
    id: "restaurant",
    label: "飲食店",
    icon: UtensilsCrossed,
    accent: "from-orange-500 via-amber-500 to-rose-500",
    badge: "来店導線",
    title: "メニュー・予約・地図・SNSをひとまとめに",
    description:
      "営業時間、地図、メニュー、予約、テイクアウトを分かりやすく配置し、来店前の不安をなくします。",
    modules: ["メニュー", "営業時間", "アクセス", "予約", "SNS"],
    testAction: "今すぐ予約へ進む",
    stats: ["予約率 +29%", "地図クリック +41%", "SNS遷移 +18%"],
  },
  {
    id: "salon",
    label: "美容院",
    icon: Scissors,
    accent: "from-pink-500 via-rose-500 to-fuchsia-600",
    badge: "予約特化",
    title: "スタッフ紹介と料金表で、予約の迷いをなくす",
    description:
      "施術メニュー、スタイリスト紹介、価格、空き状況、予約フォームを自然につなぎます。",
    modules: ["施術メニュー", "スタッフ", "料金表", "空き状況", "予約フォーム"],
    testAction: "空き状況を確認する",
    stats: ["予約完了 +33%", "指名率 +21%", "滞在時間 +26%"],
  },
  {
    id: "clinic",
    label: "整骨院",
    icon: Hospital,
    accent: "from-emerald-500 via-teal-500 to-cyan-500",
    badge: "安心設計",
    title: "症状別ページで、不安を解消して来院へ導く",
    description:
      "症状別案内、受付時間、院内写真、保険対応、アクセスを整理し、初めての方も安心できる構成です。",
    modules: ["症状別案内", "受付時間", "院内写真", "保険対応", "アクセス"],
    testAction: "症状別ページを見る",
    stats: ["初診問い合わせ +24%", "電話予約 +16%", "再訪率 +12%"],
  },
  {
    id: "b2b",
    label: "法人提案",
    icon: Laptop2,
    accent: "from-slate-900 via-indigo-900 to-slate-950",
    badge: "提案力",
    title: "サービス内容・事例・ブログ・資料請求を強く見せる",
    description:
      "導入事例、ノウハウ記事、料金の考え方、ホワイトペーパーなど、検討中の企業が知りたい情報を整理します。",
    modules: ["サービス", "導入事例", "ブログ", "資料請求", "お問い合わせ"],
    testAction: "資料請求を開く",
    stats: ["CVR +28%", "滞在時間 +19%", "資料DL +35%"],
  },
] as const;

function BrowserShell({
  accent,
  title,
  description,
  modules,
  testAction,
  stats,
}: {
  accent: string;
  title: string;
  description: string;
  modules: readonly string[];
  testAction: string;
  stats: readonly string[];
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border bg-card shadow-2xl shadow-slate-950/10">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <div className="ml-4 h-8 flex-1 rounded-full border bg-background px-4 py-1 text-sm text-muted-foreground">
          kanei-trade.co.jp / demo
        </div>
      </div>

      <div className="grid gap-5 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_#ffffff,_#f8fafc)] p-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">金井ホームページ制作</div>
              <div className="mt-2 text-2xl font-bold leading-tight text-slate-950">{title}</div>
            </div>
            <span className={`rounded-full bg-gradient-to-r ${accent} px-3 py-1 text-xs font-semibold text-white`}>
              実際の画面
            </span>
          </div>

          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {modules.slice(0, 3).map((module, index) => (
              <div key={module} className="rounded-2xl border bg-slate-50 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  0{index + 1}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{module}</div>
                <div className="mt-2 h-2 w-16 rounded-full bg-slate-200" />
                <div className="mt-3 h-16 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200" />
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gradient-to-r from-slate-950 to-blue-600 px-3 py-1 text-xs font-semibold text-white">
                {testAction}
              </span>
              <span className="text-sm text-muted-foreground">→ その場で導線と反応を確認できる実装画面</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat} className="rounded-xl bg-muted/40 px-3 py-3 text-sm font-medium text-slate-700">
                  {stat}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-[1.5rem] border bg-slate-950 p-5 text-white shadow-sm">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-sky-300/90">
              <MousePointerClick className="h-4 w-4" />
              導線確認
            </div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold">問い合わせ</div>
                <div className="mt-1 text-sm text-slate-300">電話 / フォーム / LINE / メール</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold">コンテンツ更新</div>
                <div className="mt-1 text-sm text-slate-300">お知らせ / ブログ / 実績追加</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold">信頼の見せ方</div>
                <div className="mt-1 text-sm text-slate-300">数字 / 事例 / 写真 / 地図</div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              <BadgeCheck className="h-4 w-4 text-emerald-500" />
              すぐ見える成果
            </div>
            <div className="mt-3 space-y-3">
              {stats.map((stat) => (
                <div key={stat}>
                  <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                    <span>{stat.split(" ")[0]}</span>
                    <span>{stat.split(" ")[1] ?? ""}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: "72%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComponentLab() {
  const [activeId, setActiveId] = useState<(typeof LABS)[number]["id"]>("corporate");
  const active = useMemo(() => LABS.find((item) => item.id === activeId) ?? LABS[0], [activeId]);
  const ActiveIcon = active.icon;

  return (
    <Section className="bg-muted/20" id="component-lab">
      <div className="mx-auto max-w-container">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
            <Sparkles className="h-4 w-4" />
            業種別完成プレビュー
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            どんな業種にも、専用の見せ方と機能を作れます
          </h2>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
            ただ同じ形を並べるのではなく、業種ごとに「最初に見せる情報」「押したくなる導線」「安心材料」を変えます。
            下の比較ビューは、クリックすると完成形が切り替わる実務向けの確認画面です。
          </p>
          <div className="mx-auto mt-8 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["ヒーローセクション", "最初の一画面で訴求とCTAを整理"],
              ["サービス紹介", "強みを比較しやすいカード設計"],
              ["実績・事例", "信頼材料を見せるセクション"],
              ["料金・プラン", "問い合わせ前の迷いを減らす"],
              ["よくある質問", "よくある不安を先回りして解消"],
              ["問い合わせ導線", "電話・フォーム・予約を一本化"],
              ["モバイル最適化", "スマホでの押しやすさを重視"],
              ["検索対策 / 更新性", "運用しやすい構成で納品"],
            ].map(([title, note]) => (
              <div key={title} className="rounded-2xl border bg-white px-4 py-3 text-left shadow-sm">
                <div className="text-sm font-semibold text-slate-950">{title}</div>
                <div className="mt-1 text-xs leading-relaxed text-slate-500">{note}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.34fr_0.66fr]">
          <div className="space-y-3">
            {LABS.map((lab, index) => {
              const LabIcon = lab.icon;
              const activeState = lab.id === active.id;
              return (
                <motion.button
                  key={lab.id}
                  onClick={() => setActiveId(lab.id)}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: index * 0.03 }}
                  className={`w-full rounded-3xl border p-4 text-left transition-all ${
                    activeState
                      ? "border-slate-900 bg-slate-950 text-white shadow-xl"
                      : "border-border bg-card hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-2xl p-3 ${activeState ? "bg-white/10" : "bg-blue-50"}`}>
                      <LabIcon className={`h-5 w-5 ${activeState ? "text-white" : "text-blue-600"}`} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        {lab.badge}
                      </div>
                      <div className="mt-1 text-base font-semibold">{lab.label}</div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className={`rounded-[2rem] bg-gradient-to-br ${active.accent} p-1 shadow-2xl shadow-slate-950/10`}>
              <div className="rounded-[1.9rem] bg-white p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-950 p-3 text-white">
                    <ActiveIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                      選択中の完成例
                    </div>
                    <h3 className="text-xl font-bold text-slate-950 sm:text-2xl">{active.title}</h3>
                  </div>
                </div>

                <BrowserShell
                  accent={active.accent}
                  title={active.label}
                  description={active.description}
                  modules={active.modules}
                  testAction={active.testAction}
                  stats={active.stats}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}
