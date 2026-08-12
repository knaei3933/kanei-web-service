"use client";

import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "../ui/button";

/**
 * スクロール追随CTAボタン
 * ヒーローセクション（1044px以下）では非表示、それ以降で表示
 */
export default function FloatingCTA() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // ヒーローセクション領域（約1044px）を過ぎたら表示
      setIsVisible(window.scrollY > 1044);
    };

    // 初期チェック
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
      }`}
    >
      <Button
        asChild
        size="lg"
        className="rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
      >
        <a href="/consult" className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">無料相談</span>
          <span className="sm:hidden">相談</span>
        </a>
      </Button>
    </div>
  );
}
