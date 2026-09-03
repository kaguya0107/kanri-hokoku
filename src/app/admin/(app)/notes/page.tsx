import { AdminTable, EmptyRow, Pager, Td, Th } from "@/components/admin-ui";
import { MasterEditor } from "@/components/master-editor";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { saveNote, toggleNote } from "@/server/masters";

export default async function AdminNotesPage() {
  const notes = await db.noteTemplate.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });

  return (
    <>
      <div className="mb-3.5 flex items-center gap-3">
        <div className="inline-flex min-h-[44px] items-center rounded-full bg-[#2c5a80] px-5 text-[13px] text-white hover:bg-[#24496a]">
          <MasterEditor
            save={saveNote}
            toggle={toggleNote}
            field="body"
            label="報告事項"
            multiline
            trigger={<span className="text-white no-underline">＋ 追加</span>}
          />
        </div>
        <p className="text-[12px] text-ink-3">
          全協力会社に配布される定型文です。各社が独自に追加した分はマイページ側で管理されます。
        </p>
        <Pager from={1} to={notes.length} total={notes.length} />
      </div>

      <AdminTable>
        <thead>
          <tr>
            <Th width="70px">No.</Th>
            <Th>報告事項</Th>
            <Th width="110px" className="text-center">状態</Th>
            <Th width="120px">登録日</Th>
          </tr>
        </thead>
        <tbody>
          {notes.length === 0 && <EmptyRow colSpan={4}>報告事項がまだ登録されていません</EmptyRow>}
          {notes.map((n) => (
            <tr key={n.id} className={`even:bg-brand-50 ${n.isActive ? "" : "opacity-55"}`}>
              <Td className="font-mono tabular-nums">{n.id}</Td>
              <Td className={`leading-relaxed ${n.isActive ? "" : "line-through"}`}>
                <MasterEditor
                  save={saveNote}
                  toggle={toggleNote}
                  field="body"
                  label="報告事項"
                  multiline
                  item={{ id: n.id, value: n.body, isActive: n.isActive }}
                  trigger={n.body}
                />
              </Td>
              <Td className="text-center">
                {n.isActive
                  ? <span className="text-[11px] text-ink-3">有効</span>
                  : <span className="rounded-full bg-[#e6e9e7] px-2 py-0.5 text-[11px] text-ink-3">無効</span>}
              </Td>
              <Td className="font-mono text-[11px]">{shortDate(n.createdAt)}</Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </>
  );
}
