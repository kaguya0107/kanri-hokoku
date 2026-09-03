import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/session";
import { logoutUser } from "@/server/auth";

export default async function DashboardPage() {
  const session = (await getUserSession())!;
  const draftCount = await db.report.count({
    where: { accountId: session.accountId, status: "DRAFT" },
  });

  const items = [
    { href: "/reports/new", label: "作成", caption: "（新規で作成）" },
    { href: "/reports", label: "一覧表", caption: "（コピーして作成、修正、プレビュー）" },
  ];
  const myPage = [
    { href: "/mypage/account", label: "ユーザー情報の変更" },
    { href: "/mypage/workers", label: "作業者テーブルの変更" },
    { href: "/mypage/notes", label: "報告事項テーブルの変更" },
  ];

  return (
    <>
      <AppHeader />
      <main className="flex-1 overflow-y-auto px-4.5 py-4">
        <p className="mb-3 text-[12px] text-ink-3">{session.companyName}　（ID: {session.loginId}）</p>

        <h2 className="mb-0.5 border-b border-dashed border-line pt-2 pb-1.5 text-[13.5px] font-bold text-ink-2">
          ▼ 報告書
        </h2>
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="flex items-center gap-2.5 border-b border-[#edf2ee] px-1.5 py-4 text-[15px] hover:bg-brand-50"
          >
            <span>{it.label}</span>
            <span className="text-[11.5px] text-ink-3">{it.caption}</span>
            {it.href === "/reports" && draftCount > 0 && (
              <span className="rounded-full bg-[#fbe8c8] px-2 py-0.5 text-[11px] font-bold text-[#7a5205]">
                下書き {draftCount}
              </span>
            )}
            <span className="ml-auto text-brand-500">›</span>
          </Link>
        ))}

        <h2 className="mb-0.5 border-b border-dashed border-line pt-4 pb-1.5 text-[13.5px] font-bold text-ink-2">
          ▼ マイページ
        </h2>
        {myPage.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="flex items-center gap-2.5 border-b border-[#edf2ee] px-1.5 py-4 text-[15px] hover:bg-brand-50"
          >
            <span>{it.label}</span>
            <span className="ml-auto text-brand-500">›</span>
          </Link>
        ))}

        <form action={logoutUser} className="mt-8 text-center">
          <button className="text-[12.5px] text-ink-3 underline">ログアウト</button>
        </form>
      </main>
    </>
  );
}
