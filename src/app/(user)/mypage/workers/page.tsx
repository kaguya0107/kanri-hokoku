import { AppHeader } from "@/components/app-header";
import { WorkerTable } from "@/components/mypage-forms";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/session";

export default async function WorkersPage() {
  const session = (await getUserSession())!;
  const workers = await db.worker.findMany({
    where: { accountId: session.accountId },
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }],
  });

  return (
    <>
      <AppHeader />
      <main className="flex-1 overflow-y-auto">
        <WorkerTable workers={workers.map((w) => ({ id: w.id, name: w.name, isActive: w.isActive }))} />
      </main>
    </>
  );
}
