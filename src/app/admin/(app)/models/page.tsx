import { AdminTable, EmptyRow, Pager, Td, Th } from "@/components/admin-ui";
import { MasterEditor } from "@/components/master-editor";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { saveModel, toggleModel } from "@/server/masters";

export default async function AdminModelsPage() {
  const models = await db.equipmentModel.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });

  return (
    <>
      <div className="mb-3.5 flex items-center gap-3">
        <div className="inline-flex min-h-[44px] items-center rounded-full bg-[#2c5a80] px-5 text-[13px] text-white hover:bg-[#24496a]">
          <MasterEditor
            save={saveModel}
            toggle={toggleModel}
            field="name"
            label="機種名"
            trigger={<span className="text-white no-underline">＋ 追加</span>}
          />
        </div>
        <p className="text-[12px] text-ink-3">作業内容・測定値の画面で選択肢になります。</p>
        <Pager from={1} to={models.length} total={models.length} />
      </div>

      <AdminTable>
        <thead>
          <tr>
            <Th width="70px">No.</Th>
            <Th>機種名</Th>
            <Th width="110px" className="text-center">状態</Th>
            <Th width="120px">登録日</Th>
          </tr>
        </thead>
        <tbody>
          {models.length === 0 && <EmptyRow colSpan={4}>機種名がまだ登録されていません</EmptyRow>}
          {models.map((m) => (
            <tr key={m.id} className={`even:bg-brand-50 ${m.isActive ? "" : "opacity-55"}`}>
              <Td className="font-mono tabular-nums">{m.id}</Td>
              <Td className={m.isActive ? "" : "line-through"}>
                <MasterEditor
                  save={saveModel}
                  toggle={toggleModel}
                  field="name"
                  label="機種名"
                  item={{ id: m.id, value: m.name, isActive: m.isActive }}
                  trigger={m.name}
                />
              </Td>
              <Td className="text-center">
                {m.isActive
                  ? <span className="text-[11px] text-ink-3">有効</span>
                  : <span className="rounded-full bg-[#e6e9e7] px-2 py-0.5 text-[11px] text-ink-3">無効</span>}
              </Td>
              <Td className="font-mono text-[11px]">{shortDate(m.createdAt)}</Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </>
  );
}
