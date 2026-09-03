import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { getAdminSession } from "@/lib/session";
import { logoutAdmin } from "@/server/auth";

/** 管理者サイトは1600×900想定（概要書「その他、仕様」）。オフライン対応は不要。 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="flex min-h-dvh flex-col bg-[#f4f6f4]">
      <header className="flex h-[38px] flex-none items-center bg-brand-700 px-6 text-white">
        <span className="text-sm font-bold">作業完了報告書SYSTEM</span>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs">管理者（{session.loginId}）</span>
          <form action={logoutAdmin}>
            <button className="text-xs underline hover:no-underline">ログアウト</button>
          </form>
        </div>
      </header>
      <AdminNav />
      <main className="flex-1 overflow-auto px-6 py-5">{children}</main>
    </div>
  );
}
