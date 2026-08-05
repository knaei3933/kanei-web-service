"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";

const NAV_ITEMS = [
  { href: "#showcase", label: "制作事例" },
  { href: "#playground", label: "完成プレビュー" },
  { href: "#comparison", label: "比較" },
  { href: "#pricing", label: "料金" },
  { href: "#how-it-works", label: "導入の流れ" },
  { href: "#faq", label: "よくある質問" },
] as const;

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-container items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold">
          <span className="text-primary">金井</span>{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ホームページ制作
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <Button asChild size="sm">
            <Link href="/consult">無料相談</Link>
          </Button>
        </nav>

        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="メニュー"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
            <Button asChild size="sm">
              <Link href="/consult" onClick={() => setOpen(false)}>
                無料相談
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
