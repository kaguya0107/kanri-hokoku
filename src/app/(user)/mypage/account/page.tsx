import { AppHeader } from "@/components/app-header";
import { AccountForm } from "@/components/mypage-forms";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/session";

export default async function AccountPage() {
  const session = (await getUserSession())!;
  const account = await db.account.findUniqueOrThrow({ where: { id: session.accountId } });

  return (
    <>
      <AppHeader />
      <main className="flex-1 overflow-y-auto">
        <AccountForm
          loginId={account.accountId}
          email={account.email ?? ""}
          companyName={account.companyName}
        />
      </main>
    </>
  );
}
