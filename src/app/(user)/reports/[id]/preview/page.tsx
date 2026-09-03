import Link from "next/link";
import { notFound } from "next/navigation";
import { PdfViewer } from "@/components/pdf-viewer";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/session";

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { id } = await params;
  const { print } = await searchParams;
  const session = (await getUserSession())!;
  const report = await db.report.findFirst({
    where: { id, accountId: session.accountId },
    select: { id: true, hospitalName: true },
  });
  if (!report) notFound();

  return (
    <>
      <div className="flex flex-none items-center gap-2.5 border-b border-line-2 bg-[#e8ede9] px-3 py-2 text-[12px]">
        <span>{print ? "印刷" : "報告書プレビュー"}</span>
        <span className="truncate text-ink-3">{report.hospitalName}</span>
        <Link href={`/reports/${id}/done`} className="ml-auto whitespace-nowrap text-brand-800">
          ［×閉じる］
        </Link>
      </div>
      <PdfViewer src={`/reports/${id}/pdf`} autoPrint={print === "1"} />
    </>
  );
}
