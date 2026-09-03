"use client";

import { useActionState, useState } from "react";
import { Button, TextArea, TextInput } from "@/components/ui";
import type { MasterState } from "@/server/masters";

type Action = (prev: MasterState, fd: FormData) => Promise<MasterState>;

/** 機種名・報告事項マスタで共通のダイアログ。fieldは1項目のみ。 */
export function MasterEditor({
  save,
  toggle,
  field,
  label,
  multiline = false,
  item,
  trigger,
}: {
  save: Action;
  toggle: Action;
  field: string;
  label: string;
  multiline?: boolean;
  item?: { id: number; value: string; isActive: boolean };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(save, {} as MasterState);
  const [, toggleAction, toggling] = useActionState(toggle, {} as MasterState);

  if (state.ok && open) {
    setOpen(false);
    location.reload();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-left text-brand-800 underline hover:no-underline"
      >
        {trigger}
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-[560px] bg-white shadow-2xl">
            <div className="flex items-center bg-brand-700 px-4 py-2.5 text-white">
              <span className="text-sm font-bold">{label}{item ? " 修正" : " 新規登録"}</span>
              <button onClick={() => setOpen(false)} className="ml-auto px-1 text-base leading-none" aria-label="閉じる">×</button>
            </div>

            <div className="px-5 py-4">
              {state.error && (
                <p role="alert" className="mb-3 border border-[#e8c4bc] bg-[#fdf2ef] px-3 py-2 text-[12.5px] text-alert">
                  {state.error}
                </p>
              )}

              <form action={action}>
                {item && <input type="hidden" name="id" value={item.id} />}
                <label htmlFor={field} className="mb-1.5 block text-[13px] text-ink-2">{label}</label>
                {multiline ? (
                  <TextArea id={field} name={field} rows={4} defaultValue={item?.value ?? ""} required autoFocus />
                ) : (
                  <TextInput id={field} name={field} defaultValue={item?.value ?? ""} required autoFocus />
                )}

                <div className="mt-5 flex items-center justify-end gap-2.5">
                  {item && (
                    <form action={toggleAction} className="mr-auto">
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        disabled={toggling}
                        className="rounded-full border border-line-2 px-3 py-2 text-[12px] text-ink-2 hover:bg-brand-50"
                      >
                        {item.isActive ? "無効にする" : "有効に戻す"}
                      </button>
                    </form>
                  )}
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>キャンセル</Button>
                  <Button type="submit" disabled={pending}>{pending ? "保存中…" : "登録"}</Button>
                </div>
              </form>

              {item && (
                <p className="mt-3 border-t border-line-2 pt-2.5 text-[11px] leading-relaxed text-ink-3">
                  過去の報告書には登録時の名称が保存されているため、ここでの変更や無効化によって
                  作成済みの帳票の内容が変わることはありません。
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
