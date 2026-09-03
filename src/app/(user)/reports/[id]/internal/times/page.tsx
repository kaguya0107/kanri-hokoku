import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { INTERNAL_STEPS, StepBar } from "@/components/ui";
import { WorkTimesForm } from "@/components/work-times-form";
import { db } from "@/lib/db";
import { toISODate } from "@/lib/format";
import { loadReport } from "@/lib/report-queries";
import { getUserSession } from "@/lib/session";
import { saveWorkTimes } from "@/server/internal-reports";

export default async function WorkTimesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getUserSession())!;
  const report = await loadReport(id, session.accountId);
  if (!report) notFound();

  const times = report.internal
    ? await db.internalWorkTime.findMany({
        where: { internalReportId: report.internal.id },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  return (
    <>
      <AppHeader />
      <StepBar steps={INTERNAL_STEPS} current={3} />
      <main className="flex-1 overflow-y-auto">
        <WorkTimesForm
          action={saveWorkTimes}
          reportId={id}
          defaultDate={toISODate(report.workDateFrom)}
          initial={times.map((t) => ({
            workDate: toISODate(t.workDate),
            goStart: t.goStart, goEnd: t.goEnd,
            workStart: t.workStart, workEnd: t.workEnd,
            backStart: t.backStart, backEnd: t.backEnd,
          }))}
        />
      </main>
    </>
  );
}
