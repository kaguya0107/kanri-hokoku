import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { jpDateRange } from "@/lib/format";
import { loadReport } from "@/lib/report-queries";
import { getUserSession } from "@/lib/session";

export default async function DonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getUserSession())!;
  const report = await loadReport(id, session.accountId);
  if (!report) notFound();

  const links = [
    { href: `/reports/${id}/preview`, label: "報告書のプレビュー" },
    { href: `/reports/${id}/preview?print=1`, label: "印刷" },
    { href: `/reports/${id}/mail`, label: "メール送信" },
  ];

  return (
    <>
      <AppHeader />
      <main className="flex-1 overflow-y-auto px-4.5 py-4">
        <h2 className="mb-1 border-b border-dashed border-line pb-1.5 text-[14px] font-bold">▼ 完了画面</h2>

        {links.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="flex items-center gap-2.5 border-b border-[#edf2ee] px-1.5 py-4 text-[15px] hover:bg-brand-50"
          >
            {l.label}
            <span className="ml-auto text-brand-500">›</span>
          </Link>
        ))}

        <div className="mt-5 border border-[#c3dbcc] bg-brand-100 px-3.5 py-3 text-[12.5px] leading-relaxed">
          <p className="font-bold text-brand-800">サーバへ保存しました。</p>
          <p className="mt-1 text-ink-2">
            帳票No. <span className="font-mono">{report.reportNo ?? "未採番"}</span>　／　状態：提出済
            <br />
            {report.hospitalName}　{jpDateRange(report.workDateFrom, report.workDateTo)}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3 border-t border-line-2 pt-4">
          <Link href={`/reports/${id}/signoff`} className="flex h-[60px] w-[78px] flex-col items-center justify-center rounded-[10px] border-2 border-brand-600 bg-white text-[11px] leading-tight text-brand-600">
            <span className="text-[15px] leading-none">◀</span>もどる
          </Link>
          <Link href="/dashboard" className="flex h-[60px] w-[78px] flex-col items-center justify-center rounded-[10px] border-2 border-brand-600 bg-white text-[11px] leading-tight text-brand-600">
            ダッシュ<br />ボードへ
          </Link>
          <Link href="/reports" className="flex h-[60px] w-[78px] flex-col items-center justify-center rounded-[10px] border-2 border-brand-600 bg-white text-[11px] leading-tight text-brand-600">
            一覧へ
          </Link>
          <Link href={`/reports/${id}/internal/basic`} className="flex h-[60px] w-[78px] flex-col items-center justify-center rounded-[10px] border-2 border-brand-600 bg-brand-600 text-[11px] leading-tight text-white">
            <span className="text-[15px] leading-none">▶</span>社内用<br />報告書へ
          </Link>
        </div>
      </main>
    </>
  );
}
