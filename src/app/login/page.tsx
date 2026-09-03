import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getUserSession } from "@/lib/session";
import { loginUser } from "@/server/auth";

export default async function LoginPage() {
  if (await getUserSession()) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-[#eef1ee]">
      <header className="flex h-[46px] items-center bg-brand-700 px-3.5 text-white">
        <span className="text-[15px] font-bold tracking-wide">作業完了報告書SYSTEM</span>
      </header>
      <main className="mx-auto max-w-[768px] px-4 pt-14">
        <LoginForm
          action={loginUser}
          title="ユーザーログイン"
          note={"パスワードを3回間違えた場合は15分間ロックされます。\nお急ぎの場合は事務局にて即時解除いたします。"}
        />
        <p className="mt-6 text-center font-mono text-[11px] text-ink-3">
          デモ用アカウント： ABC000 / demopass
        </p>
      </main>
    </div>
  );
}
