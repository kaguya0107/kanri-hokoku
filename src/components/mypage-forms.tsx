"use client";

import { useActionState, useState } from "react";
import { Button, Field, TextArea, TextInput } from "@/components/ui";
import {
  deleteOwnNote, saveOwnNote, saveWorker, toggleWorker, updateAccount,
  type MyPageState,
} from "@/server/mypage";

function Notice({ state }: { state: MyPageState }) {
  if (state.error)
    return <p role="alert" className="mb-3 border border-[#e8c4bc] bg-[#fdf2ef] px-3 py-2 text-[12.5px] text-alert">{state.error}</p>;
  if (state.ok)
    return <p role="status" className="mb-3 border border-[#c3dbcc] bg-brand-100 px-3 py-2 text-[12.5px] text-brand-800">{state.ok}</p>;
  return null;
}

/** 5-1 ユーザー情報変更 */
export function AccountForm({
  loginId, email, companyName,
}: { loginId: string; email: string; companyName: string }) {
  const [state, action, pending] = useActionState(updateAccount, {} as MyPageState);

  return (
    <form action={action} className="px-4.5 py-4">
      <h2 className="mb-3.5 border-b-2 border-brand-500 pb-2 text-[15px] font-bold">ユーザー情報変更</h2>
      <Notice state={state} />

      <Field label="ID">
        <span className="py-2 font-mono text-[14px]">{loginId}</span>
      </Field>
      <Field label="現在のPW" required hint="共有アカウントのため、変更には現在のパスワードが必要です">
        <TextInput type="password" name="currentPassword" autoComplete="current-password" required />
      </Field>
      <Field label="新しいPW" hint="変更しない場合は空欄のままにしてください（8文字以上）">
        <TextInput type="password" name="newPassword" autoComplete="new-password" minLength={8} />
      </Field>
      <Field label="PW再入力">
        <TextInput type="password" name="confirmPassword" autoComplete="new-password" />
      </Field>
      <Field label="メール">
        <TextInput type="email" name="email" defaultValue={email} />
      </Field>
      <Field label="会社名" required>
        <TextInput name="companyName" defaultValue={companyName} required />
      </Field>

      <p className="mt-2 mb-4 border-l-2 border-[#8c5a05] bg-[#f9f2e2] px-3 py-2 text-[11.5px] leading-relaxed text-[#7a5205]">
        パスワードを変更すると、同じIDを使用している現場の作業者全員が新しいパスワードでのログインになります。
      </p>

      <div className="flex justify-center gap-4">
        <a href="/dashboard" className="inline-flex min-h-[44px] items-center rounded-full border border-brand-600 bg-white px-4 text-sm text-brand-600">もどる</a>
        <Button type="submit" disabled={pending}>{pending ? "保存中…" : "登録"}</Button>
      </div>
    </form>
  );
}

/** 5-2 作業者テーブル */
export function WorkerTable({
  workers,
}: { workers: { id: string; name: string; isActive: boolean }[] }) {
  const [state, action, pending] = useActionState(saveWorker, {} as MyPageState);
  const [, toggleAction] = useActionState(toggleWorker, {} as MyPageState);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="px-4.5 py-4">
      <h2 className="mb-3.5 border-b-2 border-brand-500 pb-2 text-[15px] font-bold">作業者テーブル変更</h2>
      <Notice state={state} />

      <div className="mb-3 flex items-center gap-2.5">
        <a href="/dashboard" className="inline-flex min-h-[36px] items-center rounded-full border border-brand-600 bg-white px-3 text-xs text-brand-600">もどる</a>
        <Button type="button" size="sm" onClick={() => { setAdding(true); setEditing(null); }}>＋ 追加</Button>
        <span className="ml-auto font-mono text-[11px] text-ink-3 tabular-nums">{workers.length} 名</span>
      </div>

      {adding && (
        <form action={action} className="mb-3 flex gap-1.5 border border-[#bfd8c8] bg-brand-100 p-2.5">
          <TextInput name="name" placeholder="作業者名" required autoFocus />
          <Button type="submit" size="sm" disabled={pending}>登録</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>中止</Button>
        </form>
      )}

      {workers.length === 0 && <p className="py-8 text-center text-[13px] text-ink-3">作業者が登録されていません</p>}

      {workers.map((w) => (
        <div key={w.id} className={`border-b border-[#edf2ee] py-2.5 ${w.isActive ? "" : "opacity-55"}`}>
          {editing === w.id ? (
            <form action={action} className="flex gap-1.5">
              <input type="hidden" name="workerId" value={w.id} />
              <TextInput name="name" defaultValue={w.name} required autoFocus />
              <Button type="submit" size="sm" disabled={pending}>保存</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>中止</Button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`flex-1 text-[14px] ${w.isActive ? "" : "line-through"}`}>{w.name}</span>
              <button type="button" onClick={() => { setEditing(w.id); setAdding(false); }}
                className="rounded-full border border-line-2 bg-white px-2.5 py-1 text-[11px] text-ink-2">修正</button>
              <form action={toggleAction}>
                <input type="hidden" name="workerId" value={w.id} />
                <button className="rounded-full border border-line-2 bg-white px-2.5 py-1 text-[11px] text-ink-2">
                  {w.isActive ? "一覧から外す" : "戻す"}
                </button>
              </form>
            </div>
          )}
        </div>
      ))}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
        過去の報告書には作成時の作業者名が保存されているため、一覧から外しても記録は変わりません。
      </p>
    </div>
  );
}

/** 5-3 報告事項テーブル */
export function NotesTable({
  shared, own,
}: {
  shared: { body: string }[];
  own: { id: number; body: string }[];
}) {
  const [state, action, pending] = useActionState(saveOwnNote, {} as MyPageState);
  const [, deleteAction] = useActionState(deleteOwnNote, {} as MyPageState);
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="px-4.5 py-4">
      <h2 className="mb-3.5 border-b-2 border-brand-500 pb-2 text-[15px] font-bold">報告事項テーブル</h2>
      <Notice state={state} />

      <div className="mb-3 flex items-center gap-2.5">
        <a href="/dashboard" className="inline-flex min-h-[36px] items-center rounded-full border border-brand-600 bg-white px-3 text-xs text-brand-600">もどる</a>
        <Button type="button" size="sm" onClick={() => { setAdding(true); setEditing(null); }}>＋ 追加</Button>
      </div>

      {adding && (
        <form action={action} className="mb-3 border border-[#bfd8c8] bg-brand-100 p-2.5">
          <TextArea name="body" rows={3} placeholder="よく使う報告事項" required autoFocus />
          <div className="mt-2 flex justify-end gap-1.5">
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>中止</Button>
            <Button type="submit" size="sm" disabled={pending}>登録</Button>
          </div>
        </form>
      )}

      <h3 className="mt-4 mb-1.5 text-[12px] font-bold text-ink-2">自社で登録した報告事項</h3>
      {own.length === 0 && <p className="py-4 text-center text-[12.5px] text-ink-3">まだ登録がありません</p>}
      {own.map((n) => (
        <div key={n.id} className="mb-2 border border-[#e3eae5] border-l-[3px] border-l-brand-500 bg-brand-50 px-3 py-2.5">
          {editing === n.id ? (
            <form action={action}>
              <input type="hidden" name="noteId" value={n.id} />
              <TextArea name="body" rows={3} defaultValue={n.body} required autoFocus />
              <div className="mt-2 flex justify-end gap-1.5">
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>中止</Button>
                <Button type="submit" size="sm" disabled={pending}>保存</Button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed">{n.body}</p>
              <div className="mt-1.5 flex justify-end gap-1.5">
                <button type="button" onClick={() => { setEditing(n.id); setAdding(false); }}
                  className="rounded-full border border-line-2 bg-white px-2.5 py-1 text-[11px] text-ink-2">修正</button>
                <form action={deleteAction}>
                  <input type="hidden" name="noteId" value={n.id} />
                  <button className="rounded-full border border-line-2 bg-white px-2.5 py-1 text-[11px] text-[#8a5049]">削除</button>
                </form>
              </div>
            </>
          )}
        </div>
      ))}

      <h3 className="mt-5 mb-1.5 text-[12px] font-bold text-ink-2">全社共通の報告事項（管理者が配布）</h3>
      {shared.map((n, i) => (
        <div key={i} className="mb-2 border border-line-2 bg-[#f7f9f7] px-3 py-2.5 text-[13px] leading-relaxed text-ink-2">
          {n.body}
        </div>
      ))}
      <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
        共通の報告事項は管理者が管理しています。自社専用の文面はこの画面で追加してください。
      </p>
    </div>
  );
}
