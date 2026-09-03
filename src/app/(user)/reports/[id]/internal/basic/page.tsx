import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { INTERNAL_STEPS, StepBar } from "@/components/ui";
import { jpDateRange } from "@/lib/format";
import { loadReport } from "@/lib/report-queries";
import { getUserSession } from "@/lib/session";
import { saveInternalBasic } from "@/server/internal-reports";

/** 4-1 基本情報。客先提出用の内容を引き継いで表示する。 */
export default async function InternalBasicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getUserSession())!;
  const report = await loadReport(id, session.accountId);
  if (!report) notFound();

  const rows = [
    ["作成日", jpDateRange(report.createdDate, null)],
    ["病院名", report.hospitalName],
    ["作業日", jpDateRange(report.workDateFrom, report.workDateTo)],
    ["作業場所", report.workPlace],
    ["作業者", report.workerNames.join("、")],
    ["作業件名", report.workTitle],
  ];

  return (
    <>
      <AppHeader />
      <StepBar steps={INTERNAL_STEPS} current={0} />
      <main className="flex-1 overflow-y-auto">
        <form action={saveInternalBasic} className="px-4.5 py-4">
          <input type="hidden" name="id" value={id} />

          <p className="mb-3.5 border border-[#c3dbcc] bg-brand-100 px-3 py-2.5 text-[12px] leading-relaxed text-brand-800">
            客先提出済の内容を引き継いでいます。基本情報を変更する場合は
            <a href={`/reports/${id}/basic`} className="underline">報告書の基本情報</a>
            から修正してください。
          </p>

          <dl className="border-t border-line-2">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[88px_1fr] gap-2.5 border-b border-line-2 px-1 py-2.5">
                <dt className="text-right text-[13px] text-ink-2">{k}</dt>
                <dd className="min-w-0 text-[14px] break-words">{v || "—"}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex justify-center gap-5 border-t border-line-2 pt-4">
            <a href={`/reports/${id}/done`} className="flex h-[60px] w-[78px] flex-col items-center justify-center rounded-[10px] border-2 border-brand-600 bg-white text-[11px] leading-tight text-brand-600">
              <span className="text-[15px] leading-none">◀</span>もどる
            </a>
            <button type="submit" className="flex h-[60px] w-[78px] flex-col items-center justify-center rounded-[10px] border-2 border-brand-600 bg-brand-600 text-[11px] leading-tight text-white">
              <span className="text-[15px] leading-none">▶</span>つぎへ
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
