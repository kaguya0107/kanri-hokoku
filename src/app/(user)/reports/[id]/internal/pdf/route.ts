import { internalReportHtml } from "@/lib/report-html";
import { pdfFilename, renderPdf } from "@/lib/pdf";
import { loadForPdf } from "@/lib/report-pdf-data";
import { toISODate } from "@/lib/format";
import { getUserSession } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getUserSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const report = await loadForPdf(id, session.accountId);
  if (!report) return new Response("Not Found", { status: 404 });
  if (!report.internal) return new Response("社内用報告書がまだ作成されていません", { status: 404 });

  try {
    const pdf = await renderPdf(internalReportHtml({ ...report, internal: report.internal }));
    const name = pdfFilename(report.hospitalName, toISODate(report.workDateFrom), "社内用報告書");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("PDF生成に失敗しました", e);
    return new Response("PDFの生成に失敗しました", { status: 500 });
  }
}
