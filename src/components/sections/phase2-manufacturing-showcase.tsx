"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Send,
  Award,
  Users,
  TrendingUp,
  Wrench,
  Globe,
  Settings,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// メタデータ - この submission 専用
const META = {
  enterpriseName: "Phase2最新検証株式会社",
  submissionId: "20260808-061647-a4b73e82",
};

// FAQデータ
const FAQ_ITEMS = [
  {
    q: "対応可能な化粧品製造設備の種類は?",
    a: "充填機・乳化機・包装機など、化粧品製造ライン全般に対応しております。韓国メーカーの設備輸入実績も豊富です。",
  },
  {
    q: "導入後のサポート体制は?",
    a: "設備導入後の据付・試運転・操作研修まで日本語でサポートいたします。トラブル時も迅速な対応を保証します。",
  },
  {
    q: "対応エリアはどこまでですか?",
    a: "全国の化粧品メーカー様を対象としております。遠方のお客様とも現地訪問・オンラインで円滑にやり取りが可能です。",
  },
  {
    q: "海外設備の輸入実績は?",
    a: "韓国を中心に、化粧品製造設備の輸入実績50件以上。現地メーカーとの直接交渉でコスト削減を実現いたします。",
  },
  {
    q: "見積もりから納期までの流れは?",
    a: "ヒアリング〜現地視察（必要場合）〜見積もり〜契約〜輸入手続き〜据付〜試運転まで一貫してサポートいたします。",
  },
];

// 実績数値データ - 鮮明化
const STATS = [
  { value: "15年", label: "実績" },
  { value: "50件+", label: "導入" },
  { value: "完全", label: "日本語" },
  { value: "365日", label: "サポート" },
];

// 技術・設備データ
const FEATURES = [
  {
    icon: <Settings className="h-8 w-8" />,
    title: "充填機・乳化機",
    description: "高精度な計量と安定した乳化技術を提供。",
  },
  {
    icon: <Truck className="h-8 w-8" />,
    title: "包装機・ラベラー",
    description: "容器に合わせた柔軟な包装システム。",
  },
  {
    icon: <Globe className="h-8 w-8" />,
    title: "海外設備輸入",
    description: "韓国メーカー直結でコストパフォーマンス優秀。",
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: "導入後サポート",
    description: "操作研修・保守対応まで日本語で安心。",
  },
];

// お客様の声データ
const TESTIMONIALS = [
  {
    company: "○○化粧品株式会社",
    role: "製造部",
    content: "韓国製の充填機を導入。品質は日本製に匹敵し、コストは30%削減できました。日本語サポートも安心です。",
  },
  {
    company: "△△ビューティー株式会社",
    role: "技術開発部",
    content: "乳化機の導入から試運転まで手厚くサポートいただきました。操作も簡単で現場の評判も良好です。",
  },
  {
    company: "□□スキンケア株式会社",
    role: "工場長",
    content: "海外設備の輸入手続きすべてお任せできました。導入後の保守対応も迅速で大変満足しています。",
  },
];

// 設備カタログデータ
const EQUIPMENT_CATALOG = [
  {
    category: "充填機",
    items: ["液体充填機", "クリーム充填機", "パウダー充填機"],
  },
  {
    category: "乳化機",
    items: ["バッチ式乳化機", "連続式乳化機", "真空乳化機"],
  },
  {
    category: "包装機",
    items: ["チューブ充填包装機", "瓶詰包装機", "ラベラー"],
  },
  {
    category: "付帯設備",
    items: ["精製水装置", "コンプレッサー", "搬运システム"],
  },
];

// 沿革データ
const HISTORY = [
  { year: "2009", event: "創業（韓国設備輸入事業開始）" },
  { year: "2012", event: "韓国〇〇機械と独占販売契約" },
  { year: "2015", event: "導入実績20件達成" },
  { year: "2018", event: "サービス拠点を東京・大阪に拡大" },
  { year: "2021", event: "導入実績50件達成" },
  { year: "2024", event: "化粧品製造設備専門として事業強化" },
];

// FAQアコーディオンコンポーネント
function FAQItem({ q, a }: { q: string; a: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left font-medium text-slate-900 transition-colors hover:text-blue-600"
      >
        <span>{q}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0" />
        )}
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="pb-4 text-slate-600"
        >
          {a}
        </motion.div>
      )}
    </div>
  );
}

// メインコンポーネント
export default function SubmissionShowcase() {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    inquiry: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 実際の送信処理は省略（デモ用）
    alert("お問い合わせを受け付けました。担当者より折り返しご連絡いたします。");
  };

  return (
    <div className="bg-white">
      {/* ============================================================ */}
      {/*  ヒーローセクション                                            */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 inline-flex items-center rounded-full bg-amber-500/20 border border-amber-400/30 px-4 py-1.5 text-sm font-bold text-amber-300">
              <Award className="mr-2 h-4 w-4" />
              導入実績50件以上・15年の信頼
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              化粧品製造設備の
              <br />
              導入を日本語でサポート
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-blue-100 sm:text-xl">
              韓国設備輸入の経験と導入後の充実サポートで、
              <br className="hidden sm:block" />
              化粧品メーカーの設備投資を成功に導きます。
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-xl shadow-amber-500/30 transform hover:scale-105 transition-all" asChild>
                <a href="#contact">
                  <Send className="mr-2 h-5 w-5" />
                  今すぐ無料相談して最短1日で回答
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-slate-900 font-semibold"
                asChild
              >
                <a href="#equipment">
                  <ArrowRight className="mr-2 h-5 w-5" />
                  設備一覧を見る
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  実績の数値                                                  */}
      {/* ============================================================ */}
      <section className="border-b bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {STATS.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="mb-2 text-3xl font-bold text-blue-600 sm:text-4xl">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  強み・サービス紹介                                             */}
      {/* ============================================================ */}
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              化粧品メーカー様に選ばれる理由
            </h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              韓国設備輸入の経験と日本語対応で、
              <br />
              お客様の設備投資を安心してサポートします。
            </p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 text-blue-600">{feature.icon}</div>
                <h3 className="mb-2 font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  設備一覧カタログ                                             */}
      {/* ============================================================ */}
      <section id="equipment" className="border-b bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              取り扱い設備一覧
            </h2>
            <p className="text-slate-600">
              化粧品製造工程に必要な設備を幅広く取り揃えています
            </p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-2">
            {EQUIPMENT_CATALOG.map((catalog, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="mb-4 text-lg font-bold text-slate-900">
                  {catalog.category}
                </h3>
                <ul className="space-y-2">
                  {catalog.items.map((item) => (
                    <li key={item} className="flex items-center text-sm text-slate-600">
                      <CheckCircle2 className="mr-2 h-4 w-4 shrink-0 text-blue-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  導入実績・お客様の声                                         */}
      {/* ============================================================ */}
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              導入事例・お客様の声
            </h2>
            <p className="text-slate-600">
              化粧品メーカー様からの評価をご紹介します
            </p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <p className="mb-4 text-slate-700">&quot;{testimonial.content}&quot;</p>
                <div>
                  <div className="font-semibold text-slate-900">
                    {testimonial.company}
                  </div>
                  <div className="text-sm text-slate-500">{testimonial.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  会社概要・沿革                                               */}
      {/* ============================================================ */}
      <section className="border-b bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              会社概要・沿革
            </h2>
          </motion.div>
          <div className="grid gap-12 md:grid-cols-2">
            {/* 会社概要 */}
            <div>
              <h3 className="mb-6 text-xl font-bold text-slate-900">会社概要</h3>
              <dl className="space-y-3">
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-24 shrink-0 text-slate-500">会社名</dt>
                  <dd className="text-slate-900">Phase2最新検証株式会社</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-24 shrink-0 text-slate-500">設立</dt>
                  <dd className="text-slate-900">2009年4月1日</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-24 shrink-0 text-slate-500">資本金</dt>
                  <dd className="text-slate-900">1,500万円</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-24 shrink-0 text-slate-500">代表者</dt>
                  <dd className="text-slate-900">代表取締役 山田 太郎</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-24 shrink-0 text-slate-500">従業員</dt>
                  <dd className="text-slate-900">25名</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-24 shrink-0 text-slate-500">所在地</dt>
                  <dd className="text-slate-900">
                    〒100-0001
                    <br />
                    東京都千代田区千代田1-1-1
                  </dd>
                </div>
              </dl>
            </div>

            {/* 沿革 */}
            <div>
              <h3 className="mb-6 text-xl font-bold text-slate-900">沿革</h3>
              <div className="space-y-4">
                {HISTORY.map((item, index) => (
                  <div key={index} className="flex">
                    <div className="mr-4 w-16 shrink-0 font-bold text-blue-600">
                      {item.year}
                    </div>
                    <div className="text-slate-700">{item.event}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  よくある質問                                                 */}
      {/* ============================================================ */}
      <section className="border-b bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              よくある質問
            </h2>
            <p className="text-slate-600">
              化粧品メーカー様からよくいただくご質問
            </p>
          </motion.div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            {FAQ_ITEMS.map((item, index) => (
              <FAQItem key={index} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  アクセス・地図                                               */}
      {/* ============================================================ */}
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              会社所在地・アクセス
            </h2>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-2">
            {/* 地図（プレースホルダー） */}
            <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <div className="flex h-full items-center justify-center text-slate-400">
                <div className="text-center">
                  <MapPin className="mx-auto h-12 w-12 mb-3" />
                  <p>Google Map 埋め込み予定</p>
                </div>
              </div>
            </div>

            {/* アクセス情報 */}
            <div className="flex flex-col justify-center">
              <h3 className="mb-6 text-xl font-bold text-slate-900">
                Phase2最新検証株式会社
              </h3>
              <dl className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <dt className="font-semibold text-slate-900">住所</dt>
                    <dd className="text-slate-600">
                      〒100-0001
                      <br />
                      東京都千代田区千代田1-1-1
                    </dd>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <dt className="font-semibold text-slate-900">電話番号</dt>
                    <dd className="text-slate-600">03-1234-5678</dd>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <dt className="font-semibold text-slate-900">メール</dt>
                    <dd className="text-slate-600">
                      info@phase2validation.co.jp
                    </dd>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="mb-2 font-semibold text-slate-900">
                    最寄り駅からのアクセス
                  </dt>
                  <dd className="text-sm text-slate-600">
                    JR東京駅 丸の内北口より徒歩5分
                    <br />
                    東京メトロ丸ノ内線 東京駅より徒歩3分
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  お問い合わせフォーム                                         */}
      {/* ============================================================ */}
      <section id="contact" className="border-b bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              無料相談・お問い合わせ
            </h2>
            <p className="text-slate-600">
              設備導入のご相談・お見積もりはお気軽にお問い合わせください
            </p>
          </motion.div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="山田 太郎"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  会社名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="○○株式会社"
                />
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="info@example.com"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  電話番号
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="03-1234-5678"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                お問い合わせ内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={5}
                value={formData.inquiry}
                onChange={(e) =>
                  setFormData({ ...formData, inquiry: e.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="ご相談内容をご記入ください（例：充填機の導入を検討しています）"
              />
            </div>
            <div className="flex justify-center">
              <Button
                type="submit"
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-xl shadow-amber-500/30 transform hover:scale-105 transition-all px-12 py-6 text-lg"
              >
                <Send className="mr-2 h-5 w-5" />
                今すぐ無料相談して最短1日で回答
              </Button>
            </div>
          </form>
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-600">
              お電話でのお問い合わせも承っております
            </p>
            <a
              href="tel:03-1234-5678"
              className="mt-2 inline-flex items-center text-lg font-semibold text-blue-600 hover:text-blue-700"
            >
              <Phone className="mr-2 h-5 w-5" />
              03-1234-5678
            </a>
            <p className="mt-2 text-xs text-slate-500">
              受付時間: 平日 9:00〜18:00
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  フッター                                                     */}
      {/* ============================================================ */}
      <footer className="bg-slate-900 py-12 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <h3 className="mb-4 text-xl font-bold">
                Phase2最新検証株式会社
              </h3>
              <p className="mb-4 text-slate-400">
                韓国設備輸入の経験と導入後の充実サポートで、
                <br />
                化粧品メーカーの設備投資を成功に導きます。
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Globe className="h-4 w-4" />
                <span>化粧品製造設備専門</span>
              </div>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">取り扱い設備</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>充填機・乳化機</li>
                <li>包装機・ラベラー</li>
                <li>精製水装置</li>
                <li>海外設備輸入</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">会社情報</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>会社概要</li>
                <li>アクセス</li>
                <li>プライバシーポリシー</li>
                <li>特定商取引法に基づく表記</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
            <p>&copy; 2024 Phase2最新検証株式会社. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
