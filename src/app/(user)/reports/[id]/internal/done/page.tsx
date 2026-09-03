import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { CompleteButton } from "@/components/complete-button";
import { loadReport } from "@/lib/report-queries";
import { getUserSession } from "@/lib/session";

const STATUS: Record<string, string> = {
  DRAFT: "下書き", SUBMITTED: "提出済", INTERNAL: "社内用作成済", COMPLETED: "完了（請求済）",
};

export default async function InternalDonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getUserSession())!;
  const report = await loadReport(id, session.accountId);
  if (!report) notFound();

  return (
    <>
      <AppHeader />
      <main className="flex-1 overflow-y-auto px-4.5 py-4">
        <h2 className="mb-1 border-b border-dashed border-line pb-1.5 text-[14px] font-bold">
          ▼ 社内用報告書　PDF確認画面
        </h2>

        {[
          { href: `/reports/${id}/internal/preview`, label: "プレビュー" },
          { href: `/reports/${id}/internal/preview?print=1`, label: "印刷" },
        ].map((l) => (
          <Link key={l.label} href={l.href}
            className="flex items-center gap-2.5 border-b border-[#edf2ee] px-1.5 py-4 text-[15px] hover:bg-brand-50">
            {l.label}<span className="ml-auto text-brand-500">›</span>
          </Link>
        ))}

        <div className="mt-5 border border-line-2 bg-[#f7f9f7] px-3.5 py-3 text-[12.5px] leading-relaxed">
          帳票No. <span className="font-mono">{report.reportNo ?? "未採番"}</span>　／　
          状態：<b className="text-brand-800">{STATUS[report.status]}</b>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3 border-t border-line-2 pt-4">
          <Link href={`/reports/${id}/internal/sales`}
            className="flex h-[60px] w-[78px] flex-col items-center justify-center rounded-[10px] border-2 border-brand-600 bg-white text-[11px] leading-tight text-brand-600">
            <span className="text-[15px] leading-none">◀</span>もどる
          </Link>
          <Link href="/dashboard"
            className="flex h-[60px] w-[78px] flex-col items-center justify-center rounded-[10px] border-2 border-brand-600 bg-white text-[11px] leading-tight text-brand-600">
            ダッシュ<br />ボードへ
          </Link>
          <Link href="/reports"
            className="flex h-[60px] w-[78px] flex-col items-center justify-center rounded-[10px] border-2 border-brand-600 bg-white text-[11px] leading-tight text-brand-600">
            一覧へ
          </Link>
          <CompleteButton reportId={id} alreadyDone={report.status === "COMPLETED"} />
        </div>
      </main>
    </>
  );
}
