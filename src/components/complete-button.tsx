"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { completeReport } from "@/server/internal-reports";

/** 4-6「完了」。概要書どおり確認ダイアログを挟む。 */
export function CompleteButton({ reportId, alreadyDone }: { reportId: string; alreadyDone: boolean }) {
  const [open, setOpen] = useState(false);

  if (alreadyDone) {
    return (
      <span className="flex h-[60px] w-[78px] flex-col items-center justify-center rounded-[10px] border-2 border-line-2 bg-[#f2f4f2] text-[11px] leading-tight text-ink-3">
        完了済
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[60px] w-[78px] flex-col items-center justify-center rounded-[10px] border-2 border-alert bg-alert text-[11px] leading-tight font-bold text-white"
      >
        完了
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-6" role="dialog" aria-modal="true">
          <div className="w-[300px] bg-white p-5 text-center shadow-2xl">
            <p className="mb-1.5 text-[14px] font-bold">本当によいですか？</p>
            <p className="mb-5 text-[12px] leading-relaxed text-ink-2">
              ステータスを「完了（請求済）」に変更します。
            </p>
            <div className="flex justify-center gap-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>キャンセル</Button>
              <form action={completeReport}>
                <input type="hidden" name="id" value={reportId} />
                <Button type="submit">OK</Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
