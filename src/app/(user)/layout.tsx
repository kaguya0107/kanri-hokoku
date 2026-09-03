import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/session";

/** ユーザーサイトは幅768px想定（概要書「その他、仕様」）。高さはスクロールで移動可能。 */
export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await getUserSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-dvh bg-[#6e7b74] py-0 md:py-6">
      <div className="mx-auto flex min-h-dvh w-full max-w-[768px] flex-col bg-white md:min-h-[1024px] md:shadow-2xl">
        {children}
      </div>
    </div>
  );
}
