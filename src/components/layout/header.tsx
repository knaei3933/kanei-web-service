"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-container items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold">
          <span className="text-primary">KANEI</span>{" "}
          <span className="text-sm font-normal text-muted-foreground">
            Web Service
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="#features"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            特徴
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ご利用手順
          </Link>
          <Link
            href="#pricing"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            料金
          </Link>
          <Link
            href="#faq"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            よくある質問
          </Link>
          <Button size="sm">無料相談</Button>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="メニュー"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="border-t bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <Link href="#features" onClick={() => setOpen(false)}>
              特徴
            </Link>
            <Link href="#how-it-works" onClick={() => setOpen(false)}>
              ご利用手順
            </Link>
            <Link href="#pricing" onClick={() => setOpen(false)}>
              料金
            </Link>
            <Link href="#faq" onClick={() => setOpen(false)}>
              よくある質問
            </Link>
            <Button size="sm">無料相談</Button>
          </nav>
        </div>
      )}
    </header>
  );
}
