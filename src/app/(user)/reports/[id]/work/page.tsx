import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { REPORT_STEPS, StepBar } from "@/components/ui";
import { WorkItemsForm } from "@/components/work-items-form";
import { loadMasters, loadReport } from "@/lib/report-queries";
import { getUserSession } from "@/lib/session";
import { saveWorkItems } from "@/server/reports";

export default async function WorkItemsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getUserSession())!;
  const report = await loadReport(id, session.accountId);
  if (!report) notFound();

  const { modelNames } = await loadMasters(session.accountId);

  return (
    <>
      <AppHeader />
      <StepBar steps={REPORT_STEPS} current={1} />
      <main className="flex-1 overflow-y-auto">
        <WorkItemsForm
          action={saveWorkItems}
          reportId={id}
          allModels={modelNames}
          initial={report.workItems.map((w) => ({ modelName: w.modelName, quantity: w.quantity }))}
          freeWorkNote={report.freeWorkNote}
        />
      </main>
    </>
  );
}
