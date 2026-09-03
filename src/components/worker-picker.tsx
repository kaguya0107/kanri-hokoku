"use client";

import { useState } from "react";
import { Button, TextInput } from "@/components/ui";

/** 作業者テーブルからの複数選択＋任意入力（概要書2-1） */
export function WorkerPicker({
  workers,
  defaultSelected,
}: {
  workers: string[];
  defaultSelected: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const toggle = (name: string) =>
    setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));

  const addCustom = () => {
    const v = custom.trim();
    if (v && !selected.includes(v)) setSelected((s) => [...s, v]);
    setCustom("");
  };

  return (
    <>
      {selected.map((n) => (
        <input key={n} type="hidden" name="workerNames" value={n} />
      ))}

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <div className="min-h-[44px] flex-1 rounded-sm border border-line bg-[#f7f9f7] px-2.5 py-2 text-[14px]">
          {selected.length ? selected.join("、") : <span className="text-ink-3">未選択</span>}
        </div>
        <Button type="button" size="sm" onClick={() => setOpen(true)}>選択</Button>
      </div>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-5" role="dialog" aria-modal="true" aria-label="作業者の選択">
          <div className="flex max-h-[80vh] w-full max-w-[430px] flex-col bg-white shadow-2xl">
            <div className="flex flex-none items-center bg-brand-700 px-4 py-2.5 text-white">
              <span className="text-sm font-bold">作業者の選択</span>
              <button onClick={() => setOpen(false)} className="ml-auto px-1 text-base leading-none" aria-label="閉じる">×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {workers.map((w) => (
                <label key={w} className="flex cursor-pointer items-center gap-2.5 border-b border-[#edf2ee] py-3 text-[14px]">
                  <input
                    type="checkbox"
                    checked={selected.includes(w)}
                    onChange={() => toggle(w)}
                    className="h-5 w-5 accent-brand-600"
                  />
                  {w}
                </label>
              ))}

              {selected.filter((s) => !workers.includes(s)).map((w) => (
                <label key={w} className="flex cursor-pointer items-center gap-2.5 border-b border-[#edf2ee] py-3 text-[14px]">
                  <input type="checkbox" checked onChange={() => toggle(w)} className="h-5 w-5 accent-brand-600" />
                  {w}<span className="text-[11px] text-ink-3">（任意入力）</span>
                </label>
              ))}

              <div className="mt-3 flex gap-1.5">
                <TextInput
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="一覧にない作業者を追加"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                />
                <Button type="button" size="sm" variant="ghost" onClick={addCustom}>追加</Button>
              </div>
            </div>

            <div className="flex flex-none justify-end gap-2.5 px-4 pb-4">
              <Button type="button" onClick={() => setOpen(false)}>決定</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
