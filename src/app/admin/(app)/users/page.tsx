import { NewAccountDialog, RowActions } from "@/components/account-actions";
import { AdminTable, EmptyRow, Pager, Td, Th } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { isLocked, lockRemainingMinutes } from "@/lib/lockout";

export default async function AdminUsersPage() {
  const accounts = await db.account.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      workers: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { name: true } },
      _count: { select: { reports: true } },
    },
  });

  return (
    <>
      <div className="mb-3.5 flex items-center gap-3">
        <NewAccountDialog />
        <p className="text-[12px] text-ink-3">
          アカウントは協力会社ごとに発行します（概要書「その他、仕様」）。
        </p>
        <Pager from={1} to={accounts.length} total={accounts.length} />
      </div>

      <AdminTable>
        <thead>
          <tr>
            <Th width="130px">アカウントID</Th>
            <Th>会社名</Th>
            <Th>作業者</Th>
            <Th width="70px" className="text-center">報告書</Th>
            <Th width="100px">登録日</Th>
            <Th width="110px" className="text-center">状態</Th>
            <Th width="230px">操作</Th>
          </tr>
        </thead>
        <tbody>
          {accounts.length === 0 && <EmptyRow colSpan={7}>アカウントがまだ登録されていません</EmptyRow>}
          {accounts.map((a) => {
            const locked = isLocked(a.lockedUntil);
            return (
              <tr key={a.id} className="even:bg-brand-50">
                <Td className="font-mono">{a.accountId}</Td>
                <Td className={a.isActive ? "" : "text-ink-3 line-through"}>{a.companyName}</Td>
                <Td className="text-ink-2">
                  {a.workers.length === 0 ? (
                    <span className="text-ink-3">—</span>
                  ) : (
                    <>
                      {a.workers.slice(0, 5).map((w) => w.name).join("、")}
                      {a.workers.length > 5 && (
                        <span className="text-ink-3"> 他{a.workers.length - 5}名</span>
                      )}
                    </>
                  )}
                </Td>
                <Td className="text-center tabular-nums">{a._count.reports}</Td>
                <Td className="font-mono text-[11px]">{shortDate(a.createdAt)}</Td>
                <Td className="text-center">
                  {!a.isActive ? (
                    <span className="rounded-full bg-[#e6e9e7] px-2 py-0.5 text-[11px] text-ink-3">利用停止</span>
                  ) : locked ? (
                    <span className="rounded-full bg-[#f3e6cb] px-2 py-0.5 text-[11px] font-bold text-[#7a5205]">
                      ロック中 {lockRemainingMinutes(a.lockedUntil)}分
                    </span>
                  ) : (
                    <span className="text-[11px] text-ink-3">—</span>
                  )}
                </Td>
                <Td>
                  <RowActions id={a.id} accountId={a.accountId} isLocked={locked} isActive={a.isActive} />
                </Td>
              </tr>
            );
          })}
        </tbody>
      </AdminTable>

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
        パスワードは暗号化して保存しているため、管理者でも内容を確認することはできません。
        忘れた場合は「PW再発行」で新しいパスワードを発行してください。
      </p>
    </>
  );
}
