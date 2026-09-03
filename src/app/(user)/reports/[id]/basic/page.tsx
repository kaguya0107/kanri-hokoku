import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BasicInfoForm } from "@/components/basic-info-form";
import { REPORT_STEPS, StepBar } from "@/components/ui";
import { loadMasters, loadReport, toBasicDefaults } from "@/lib/report-queries";
import { getUserSession } from "@/lib/session";
import { saveBasicInfo } from "@/server/reports";

export default async function BasicInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getUserSession())!;
  const report = await loadReport(id, session.accountId);
  if (!report) notFound();

  const { workerNames, hospitalNames } = await loadMasters(session.accountId);

  return (
    <>
      <AppHeader />
      <StepBar steps={REPORT_STEPS} current={0} />
      <main className="flex-1 overflow-y-auto">
        <BasicInfoForm
          action={saveBasicInfo}
          storageKey={`wcr:${id}:basic`}
          defaults={toBasicDefaults(report)!}
          workers={workerNames}
          hospitals={hospitalNames}
          backHref="/reports"
        />
      </main>
    </>
  );
}
