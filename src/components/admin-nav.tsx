"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/users", label: "ユーザー登録" },
  { href: "/admin/parts", label: "交換部品マスタ" },
  { href: "/admin/models", label: "機種名マスタ" },
  { href: "/admin/notes", label: "報告事項マスタ" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-none gap-6 border-b border-line-2 bg-white px-6">
      {TABS.map((t) => {
        const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`border-b-[3px] px-0.5 py-3 text-[13.5px] transition-colors ${
              active
                ? "border-alert font-bold text-alert"
                : "border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
