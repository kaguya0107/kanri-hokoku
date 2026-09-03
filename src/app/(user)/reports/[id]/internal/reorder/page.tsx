import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ReorderPicker } from "@/components/reorder-picker";
import { INTERNAL_STEPS, StepBar } from "@/components/ui";
import { db } from "@/lib/db";
import { loadReport } from "@/lib/report-queries";
import { getUserSession } from "@/lib/session";
import { saveReorderItems } from "@/server/internal-reports";

export default async function ReorderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getUserSession())!;
  const report = await loadReport(id, session.accountId);
  if (!report) notFound();

  const items = report.internal
    ? await db.internalReorderItem.findMany({
        where: { internalReportId: report.internal.id },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  return (
    <>
      <AppHeader />
      <StepBar steps={INTERNAL_STEPS} current={2} />
      <main className="flex-1 overflow-y-auto">
        <ReorderPicker
          action={saveReorderItems}
          reportId={id}
          initial={items.map((i) => ({
            id: i.partId ?? 0, code: i.partCode, name: i.partName,
            kana: "", unit: i.unit, quantity: i.quantity,
          }))}
        />
      </main>
    </>
  );
}
