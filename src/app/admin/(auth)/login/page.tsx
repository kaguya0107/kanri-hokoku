import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getAdminSession } from "@/lib/session";
import { loginAdmin } from "@/server/auth";

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");

  return (
    <div className="min-h-dvh bg-[#eef1ee]">
      <header className="flex h-[38px] items-center bg-brand-700 px-4.5 text-white">
        <span className="text-sm font-bold">作業完了報告書SYSTEM</span>
        <span className="ml-auto text-xs">管理者</span>
      </header>
      <main className="px-4 pt-20">
        <LoginForm action={loginAdmin} title="管理サイトログイン" />
        <p className="mt-6 text-center font-mono text-[11px] text-ink-3">
          デモ用アカウント： admin / demopass
        </p>
      </main>
    </div>
  );
}
