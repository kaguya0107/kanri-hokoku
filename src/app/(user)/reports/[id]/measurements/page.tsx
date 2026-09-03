import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { MeasurementsForm } from "@/components/measurements-form";
import { REPORT_STEPS, StepBar } from "@/components/ui";
import { loadMasters, loadReport } from "@/lib/report-queries";
import { getUserSession } from "@/lib/session";
import { saveMeasurements } from "@/server/reports";

export default async function MeasurementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getUserSession())!;
  const report = await loadReport(id, session.accountId);
  if (!report) notFound();

  const { modelNames, notes } = await loadMasters(session.accountId);

  return (
    <>
      <AppHeader />
      <StepBar steps={REPORT_STEPS} current={3} />
      <main className="flex-1 overflow-y-auto">
        <MeasurementsForm
          action={saveMeasurements}
          reportId={id}
          models={modelNames}
          notes={notes}
          initial={report.measurements.map((m) => ({
            roomName: m.roomName,
            modelName: m.modelName,
            runningHours: m.runningHours === null ? "" : String(m.runningHours),
            serialNo: m.serialNo,
            manufacturedYm: m.manufacturedYm,
          }))}
          reportBody={report.reportBody}
        />
      </main>
    </>
  );
}
