import { AppHeader } from "@/components/app-header";
import { NotesTable } from "@/components/mypage-forms";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/session";

export default async function NotesPage() {
  const session = (await getUserSession())!;
  const [shared, own] = await Promise.all([
    db.noteTemplate.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.reportNoteTemplate.findMany({ where: { accountId: session.accountId }, orderBy: { id: "asc" } }),
  ]);

  return (
    <>
      <AppHeader />
      <main className="flex-1 overflow-y-auto">
        <NotesTable
          shared={shared.map((n) => ({ body: n.body }))}
          own={own.map((n) => ({ id: n.id, body: n.body }))}
        />
      </main>
    </>
  );
}
