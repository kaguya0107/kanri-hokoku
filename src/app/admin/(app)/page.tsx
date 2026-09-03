import Link from "next/link";
import { AdminTable, EmptyRow, Pager, Td, Th } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "下書き",
  SUBMITTED: "提出済",
  INTERNAL: "社内用作成済",
  COMPLETED: "完了",
};

const PAGE_SIZE = 100;

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  const current = Math.max(1, Number(page) || 1);
  const term = q.trim();

  // 概要書K-2の検索欄。病院名・作業件名・作業場所・会社名を対象にする
  const where = term
    ? {
        OR: [
          { hospitalName: { contains: term, mode: "insensitive" as const } },
          { workTitle: { contains: term, mode: "insensitive" as const } },
          { workPlace: { contains: term, mode: "insensitive" as const } },
          { account: { companyName: { contains: term, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [total, reports] = await Promise.all([
    db.report.count({ where }),
    db.report.findMany({
      where,
      orderBy: [{ reportNo: "desc" }, { createdAt: "desc" }],
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        account: { select: { companyName: true } },
        internal: { select: { id: true } },
        _count: { select: { mailLogs: true } },
      },
    }),
  ]);

  return (
    <>
      <form className="mb-3.5 flex items-center gap-3" action="/admin">
        <label htmlFor="q" className="text-[13px] text-ink-2">検索：</label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="病院名・作業件名・作業場所・会社名"
          className="w-[330px] rounded-sm border border-line bg-white px-2.5 py-2 text-[13px]
            focus:border-brand-500 focus:outline-2 focus:-outline-offset-1 focus:outline-brand-500"
        />
        <button className="rounded-full bg-[#2c5a80] px-6 py-2 text-[13px] text-white hover:bg-[#24496a]">
          実行
        </button>
        {term && (
          <Link href="/admin" className="text-[12.5px] text-ink-3 underline">
            解除
          </Link>
        )}
        <Pager
          from={(current - 1) * PAGE_SIZE + 1}
          to={Math.min(current * PAGE_SIZE, total)}
          total={total}
        />
      </form>

      <AdminTable>
        <thead>
          <tr>
            <Th width="72px">No.</Th>
            <Th width="94px">作業日</Th>
            <Th width="94px">作成日</Th>
            <Th>病院名</Th>
            <Th width="160px">協力会社</Th>
            <Th width="96px">作業者</Th>
            <Th width="52px" className="text-center">署名</Th>
            <Th width="52px" className="text-center">PDF</Th>
            <Th width="52px" className="text-center">Mail</Th>
            <Th width="60px" className="text-center">社内用</Th>
            <Th width="96px" className="text-center">状態</Th>
          </tr>
        </thead>
        <tbody>
          {reports.length === 0 && (
            <EmptyRow colSpan={11}>
              {term ? `「${term}」に一致する報告書はありません` : "報告書がまだ登録されていません"}
            </EmptyRow>
          )}
          {reports.map((r) => (
            <tr key={r.id} className="even:bg-brand-50">
              <Td className="font-mono tabular-nums">{r.reportNo ?? "—"}</Td>
              <Td className="font-mono text-[11px] whitespace-nowrap">{shortDate(r.workDateFrom)}</Td>
              <Td className="font-mono text-[11px] whitespace-nowrap">{shortDate(r.createdDate)}</Td>
              <Td>
                <Link href={`/admin/reports/${r.id}`} className="text-brand-800 underline hover:no-underline">
                  {r.hospitalName}
                </Link>
              </Td>
              <Td className="text-ink-2">{r.account.companyName}</Td>
              <Td>{r.workerNames.join("、") || "—"}</Td>
              <Td className="text-center">{r.signatureData ? "有" : "—"}</Td>
              <Td className="text-center">
                {r.status === "DRAFT" ? "—" : (
                  <Link href={`/admin/reports/${r.id}/pdf`} className="text-brand-800" title="報告書PDFを表示">●</Link>
                )}
              </Td>
              <Td className="text-center tabular-nums">{r._count.mailLogs}</Td>
              <Td className="text-center">
                {r.internal ? (
                  <Link href={`/admin/reports/${r.id}/internal`} className="text-brand-800" title="社内用報告書PDFを表示">●</Link>
                ) : "—"}
              </Td>
              <Td className="text-center font-bold text-brand-800">{STATUS_LABEL[r.status]}</Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      {total > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-end gap-3 font-mono text-xs">
          {current > 1 && (
            <Link href={`/admin?q=${encodeURIComponent(q)}&page=${current - 1}`} className="text-brand-800 underline">＜ 前へ</Link>
          )}
          <span className="text-ink-3">{current} / {Math.ceil(total / PAGE_SIZE)}</span>
          {current * PAGE_SIZE < total && (
            <Link href={`/admin?q=${encodeURIComponent(q)}&page=${current + 1}`} className="text-brand-800 underline">次へ ＞</Link>
          )}
        </div>
      )}
    </>
  );
}
