import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { getUserSession } from "@/lib/session";
import { duplicateReport } from "@/server/reports";

const STATUS: Record<string, string> = {
  DRAFT: "下書き", SUBMITTED: "提出済", INTERNAL: "社内用済", COMPLETED: "完",
};

export default async function ReportListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const session = (await getUserSession())!;
  const term = q.trim();

  // B-20: 概要書の一覧には絞り込みが無いが、999件をタブレットで辿るのは現実的でないため追加
  const reports = await db.report.findMany({
    where: {
      accountId: session.accountId,
      ...(term
        ? {
            OR: [
              { hospitalName: { contains: term, mode: "insensitive" } },
              { workTitle: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ workDateFrom: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: { internal: { select: { id: true } }, _count: { select: { mailLogs: true } } },
  });

  return (
    <>
      <AppHeader />
      <main className="flex-1 overflow-y-auto px-4.5 py-4">
        <form className="mb-2.5 flex flex-wrap items-center gap-1.5" action="/reports">
          <Link href="/dashboard" className="rounded-full border border-brand-600 bg-white px-3 py-2 text-[12px] text-brand-600">
            ダッシュボード
          </Link>
          <input
            name="q"
            defaultValue={q}
            placeholder="病院名・作業件名で絞り込み"
            className="min-w-[120px] flex-1 rounded-sm border border-line px-2 py-2 text-[12.5px]
              focus:border-brand-500 focus:outline-2 focus:-outline-offset-1 focus:outline-brand-500"
          />
          <button className="rounded-full bg-brand-600 px-3 py-2 text-[12px] text-white">検索</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                {["No.", "作業日／作成日", "病院名", "作業者", "署名", "PDF", "Mail", "社内用", "状態", ""].map((h) => (
                  <th key={h} className="bg-brand-500 px-1 py-1.5 text-[10.5px] font-bold leading-tight text-white">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-2 py-10 text-center text-[13px] text-ink-3">
                    {term ? `「${term}」に一致する報告書はありません` : "報告書がまだありません"}
                  </td>
                </tr>
              )}
              {reports.map((r) => (
                <tr key={r.id} className="even:bg-brand-50">
                  <td className="border-b border-[#e3eae5] px-1 py-2 text-center font-mono tabular-nums">{r.reportNo ?? "—"}</td>
                  <td className="border-b border-[#e3eae5] px-1 py-2 font-mono text-[10.5px] whitespace-nowrap">
                    {shortDate(r.workDateFrom)}<br />{shortDate(r.createdDate)}
                  </td>
                  <td className="border-b border-[#e3eae5] px-1 py-2">
                    <Link href={`/reports/${r.id}/basic`} className="text-[12.5px] text-brand-800 underline">
                      {r.hospitalName}
                    </Link>
                  </td>
                  <td className="border-b border-[#e3eae5] px-1 py-2 text-center">{r.workerNames[0] ?? "—"}</td>
                  <td className="border-b border-[#e3eae5] px-1 py-2 text-center">{r.signatureData ? "有" : "—"}</td>
                  <td className="border-b border-[#e3eae5] px-1 py-2 text-center">
                    {r.status === "DRAFT" ? "—" : <Link href={`/reports/${r.id}/preview`} className="text-brand-800">●</Link>}
                  </td>
                  <td className="border-b border-[#e3eae5] px-1 py-2 text-center tabular-nums">{r._count.mailLogs}</td>
                  <td className="border-b border-[#e3eae5] px-1 py-2 text-center">
                    {r.internal ? <Link href={`/reports/${r.id}/internal/preview`} className="text-brand-800">●</Link> : "—"}
                  </td>
                  <td className="border-b border-[#e3eae5] px-1 py-2 text-center text-[11px] font-bold text-brand-800">
                    {STATUS[r.status]}
                  </td>
                  <td className="border-b border-[#e3eae5] px-1 py-2 text-center">
                    <form action={duplicateReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="rounded-full border border-line-2 bg-white px-2 py-1 text-[10.5px] text-ink-2">複製</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-2.5 text-[11px] leading-relaxed text-ink-3">
          「複製」は同じ病院・設備の再点検を想定した機能です。署名・PDF・メール履歴は引き継ぎません。
        </p>
      </main>
    </>
  );
}
