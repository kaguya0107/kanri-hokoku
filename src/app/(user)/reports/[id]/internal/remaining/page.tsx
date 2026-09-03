import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { InternalTextForm } from "@/components/internal-text-form";
import { INTERNAL_STEPS, StepBar } from "@/components/ui";
import { loadReport } from "@/lib/report-queries";
import { getUserSession } from "@/lib/session";
import { saveRemainingWork } from "@/server/internal-reports";

export default async function RemainingWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getUserSession())!;
  const report = await loadReport(id, session.accountId);
  if (!report) notFound();

  return (
    <>
      <AppHeader />
      <StepBar steps={INTERNAL_STEPS} current={1} />
      <main className="flex-1 overflow-y-auto">
        <InternalTextForm
          action={saveRemainingWork}
          reportId={id}
          backHref={`/reports/${id}/internal/basic`}
          storageKey={`wcr:${id}:remaining`}
          fields={[{
            name: "remainingWork",
            label: "今回作業時の残作業",
            rows: 9,
            defaultValue: report.internal?.remainingWork ?? "",
          }]}
        />
      </main>
    </>
  );
}
