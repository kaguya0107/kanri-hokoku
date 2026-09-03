import Link from "next/link";
import { AdminTable, EmptyRow, Pager, Td, Th } from "@/components/admin-ui";
import { PartsImport } from "@/components/parts-import";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { KANA_ROWS } from "@/lib/kana";

const PAGE_SIZE = 100;

export default async function AdminPartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; row?: string; page?: string; inactive?: string }>;
}) {
  const { q = "", row = "", page = "1", inactive } = await searchParams;
  const current = Math.max(1, Number(page) || 1);
  const term = q.trim();
  const showInactive = inactive === "1";

  const where = {
    ...(showInactive ? {} : { isActive: true }),
    ...(row ? { kanaRow: row } : {}),
    ...(term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" as const } },
            { kana: { contains: term } },
            { code: { contains: term, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, parts, activeTotal] = await Promise.all([
    db.part.count({ where }),
    db.part.findMany({
      where,
      orderBy: [{ priority: "desc" }, { kana: "asc" }, { code: "asc" }],
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.part.count({ where: { isActive: true } }),
  ]);

  const qs = (next: Record<string, string>) => {
    const p = new URLSearchParams({ ...(term ? { q: term } : {}), ...(row ? { row } : {}), ...(showInactive ? { inactive: "1" } : {}), ...next });
    return `/admin/parts?${p.toString()}`;
  };

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <a
          href="/admin/parts/export"
          className="inline-flex min-h-[44px] items-center rounded-full bg-[#2c5a80] px-5 text-[13px] text-white hover:bg-[#24496a]"
        >
          ダウンロード
        </a>
        <PartsImport />
        <p className="text-[12px] text-ink-3">
          有効な部品 <span className="font-mono tabular-nums">{activeTotal.toLocaleString()}</span> 件
        </p>
        <Pager from={(current - 1) * PAGE_SIZE + 1} to={Math.min(current * PAGE_SIZE, total)} total={total} />
      </div>

      <form className="mb-3 flex flex-wrap items-center gap-2" action="/admin/parts">
        <input
          name="q"
          defaultValue={term}
          placeholder="部品名・読み・コードで検索"
          className="w-[280px] rounded-sm border border-line bg-white px-2.5 py-2 text-[13px]
            focus:border-brand-500 focus:outline-2 focus:-outline-offset-1 focus:outline-brand-500"
        />
        {row && <input type="hidden" name="row" value={row} />}
        {showInactive && <input type="hidden" name="inactive" value="1" />}
        <button className="rounded-full border border-line-2 bg-white px-4 py-2 text-[12.5px] hover:bg-brand-50">検索</button>
        {(term || row) && (
          <Link href="/admin/parts" className="text-[12px] text-ink-3 underline">条件をクリア</Link>
        )}
        <Link
          href={qs({ inactive: showInactive ? "" : "1", page: "1" })}
          className="ml-auto text-[12px] text-ink-3 underline"
        >
          {showInactive ? "無効を隠す" : "無効も表示"}
        </Link>
      </form>

      <div className="mb-3 flex flex-wrap gap-1">
        <Link
          href={qs({ row: "", page: "1" })}
          className={`flex h-8 w-9 items-center justify-center rounded-sm border text-[13px] ${
            row === "" ? "border-brand-600 bg-brand-600 font-bold text-white" : "border-line-2 bg-white text-ink-2 hover:bg-brand-50"
          }`}
        >
          全
        </Link>
        {KANA_ROWS.map((k) => (
          <Link
            key={k}
            href={qs({ row: k, page: "1" })}
            className={`flex h-8 w-9 items-center justify-center rounded-sm border text-[13px] ${
              row === k ? "border-brand-600 bg-brand-600 font-bold text-white" : "border-line-2 bg-white text-ink-2 hover:bg-brand-50"
            }`}
          >
            {k}
          </Link>
        ))}
      </div>

      <AdminTable>
        <thead>
          <tr>
            <Th width="90px">コード</Th>
            <Th>部品名</Th>
            <Th width="180px">読み</Th>
            <Th width="40px" className="text-center">行</Th>
            <Th width="60px" className="text-center">単位</Th>
            <Th width="90px" className="text-right">優先順位</Th>
            <Th width="100px">登録日</Th>
          </tr>
        </thead>
        <tbody>
          {parts.length === 0 && (
            <EmptyRow colSpan={7}>条件に一致する部品はありません</EmptyRow>
          )}
          {parts.map((p) => (
            <tr key={p.id} className={`even:bg-brand-50 ${p.isActive ? "" : "opacity-50"}`}>
              <Td className="font-mono text-[11px]">{p.code}</Td>
              <Td className={p.isActive ? "" : "line-through"}>{p.name}</Td>
              <Td className="text-ink-2">{p.kana}</Td>
              <Td className="text-center">{p.kanaRow}</Td>
              <Td className="text-center">{p.unit}</Td>
              <Td className="text-right font-mono tabular-nums">{p.priority}</Td>
              <Td className="font-mono text-[11px]">{shortDate(p.createdAt)}</Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      {total > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-end gap-3 font-mono text-xs">
          {current > 1 && <Link href={qs({ page: String(current - 1) })} className="text-brand-800 underline">＜ 前へ</Link>}
          <span className="text-ink-3">{current} / {Math.ceil(total / PAGE_SIZE)}</span>
          {current * PAGE_SIZE < total && <Link href={qs({ page: String(current + 1) })} className="text-brand-800 underline">次へ ＞</Link>}
        </div>
      )}
    </>
  );
}
