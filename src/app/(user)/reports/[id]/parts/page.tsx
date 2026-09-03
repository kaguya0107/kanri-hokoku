import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PartsPicker } from "@/components/parts-picker";
import { REPORT_STEPS, StepBar } from "@/components/ui";
import { loadReport } from "@/lib/report-queries";
import { getUserSession } from "@/lib/session";
import { savePartItems } from "@/server/reports";

export default async function PartsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getUserSession())!;
  const report = await loadReport(id, session.accountId);
  if (!report) notFound();

  return (
    <>
      <AppHeader />
      <StepBar steps={REPORT_STEPS} current={2} />
      <main className="flex-1 overflow-y-auto">
        <PartsPicker
          action={savePartItems}
          reportId={id}
          initial={report.partItems.map((p) => ({
            id: p.partId ?? 0,
            code: p.partCode,
            name: p.partName,
            kana: "",
            unit: p.unit,
            quantity: p.quantity,
          }))}
          partsFreeNote={report.partsFreeNote}
        />
      </main>
    </>
  );
}
