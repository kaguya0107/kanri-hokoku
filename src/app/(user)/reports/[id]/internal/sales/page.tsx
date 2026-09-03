import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { InternalTextForm } from "@/components/internal-text-form";
import { INTERNAL_STEPS, StepBar } from "@/components/ui";
import { loadReport } from "@/lib/report-queries";
import { getUserSession } from "@/lib/session";
import { saveSalesAndRemarks } from "@/server/internal-reports";

export default async function SalesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getUserSession())!;
  const report = await loadReport(id, session.accountId);
  if (!report) notFound();

  return (
    <>
      <AppHeader />
      <StepBar steps={INTERNAL_STEPS} current={4} />
      <main className="flex-1 overflow-y-auto">
        <InternalTextForm
          action={saveSalesAndRemarks}
          reportId={id}
          backHref={`/reports/${id}/internal/times`}
          storageKey={`wcr:${id}:sales`}
          fields={[
            { name: "salesApproach", label: "客先への営業アプローチ", rows: 5, defaultValue: report.internal?.salesApproach ?? "" },
            { name: "remarks", label: "備考（社内への報告事項）", rows: 5, defaultValue: report.internal?.remarks ?? "" },
          ]}
        />
      </main>
    </>
  );
}
