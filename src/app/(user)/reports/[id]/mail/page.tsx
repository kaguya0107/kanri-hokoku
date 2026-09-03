import Link from "next/link";
import { notFound } from "next/navigation";
import { MailForm } from "@/components/mail-form";
import { db } from "@/lib/db";
import { jpDateRange, toISODate } from "@/lib/format";
import { pdfFilename } from "@/lib/pdf";
import { getUserSession } from "@/lib/session";

export default async function MailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getUserSession())!;
  const report = await db.report.findFirst({
    where: { id, accountId: session.accountId },
    select: { id: true, hospitalName: true, workDateFrom: true, workDateTo: true },
  });
  if (!report) notFound();

  const body =
    "いつもお世話になっております。\n" +
    `${jpDateRange(report.workDateFrom, report.workDateTo)}に実施いたしました保守点検作業が完了いたしましたので、\n` +
    "作業完了報告書を送付いたします。\n\nご査収のほどよろしくお願いいたします。";

  return (
    <>
      <div className="flex flex-none items-center gap-2.5 border-b border-line-2 bg-[#e8ede9] px-3 py-2 text-[12px]">
        <span>メール送信</span>
        <span className="truncate text-ink-3">{report.hospitalName}</span>
        <Link href={`/reports/${id}/done`} className="ml-auto whitespace-nowrap text-brand-800">
          ［×閉じる］
        </Link>
      </div>
      <main className="flex-1 overflow-y-auto">
        <MailForm
          reportId={id}
          hospitalName={report.hospitalName}
          filename={pdfFilename(report.hospitalName, toISODate(report.workDateFrom), "報告書")}
          defaultBody={body}
        />
      </main>
    </>
  );
}
