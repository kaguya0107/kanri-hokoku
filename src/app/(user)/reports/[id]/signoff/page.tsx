import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { SignOffForm } from "@/components/signoff-form";
import { REPORT_STEPS, StepBar } from "@/components/ui";
import { loadMasters, loadReport } from "@/lib/report-queries";
import { getUserSession } from "@/lib/session";
import { submitReport } from "@/server/reports";

export default async function SignOffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getUserSession())!;
  const report = await loadReport(id, session.accountId);
  if (!report) notFound();

  const { workerNames, confirmItems } = await loadMasters(session.accountId);

  return (
    <>
      <AppHeader />
      <StepBar steps={REPORT_STEPS} current={4} />
      <main className="flex-1 overflow-y-auto">
        <SignOffForm
          action={submitReport}
          reportId={id}
          confirmItems={confirmItems.map((c) => ({ id: c.id, body: c.body }))}
          checkedItems={report.checkedItems}
          workers={workerNames}
          signerName={report.signerName}
          signatureData={report.signatureData}
        />
      </main>
    </>
  );
}
