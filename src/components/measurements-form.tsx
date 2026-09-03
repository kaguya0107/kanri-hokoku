"use client";

import { useActionState, useState } from "react";
import { FormPersist } from "@/components/form-persist";
import { MicButton } from "@/components/mic-input";
import { Button, NavButtons, NavSubmit, Select, TextArea, TextInput } from "@/components/ui";
import type { StepState } from "@/server/reports";

type Row = { roomName: string; modelName: string; runningHours: string; serialNo: string; manufacturedYm: string };

const blank = (): Row => ({ roomName: "", modelName: "", runningHours: "", serialNo: "", manufacturedYm: "" });

/** 測定値・報告事項（2-4）。B-07: 行は追加・削除できる。 */
export function MeasurementsForm({
  action,
  reportId,
  models,
  notes,
  initial,
  reportBody,
}: {
  action: (prev: StepState, fd: FormData) => Promise<StepState>;
  reportId: string;
  models: string[];
  notes: { body: string; own: boolean }[];
  initial: Row[];
  reportBody: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as StepState);
  const [rows, setRows] = useState<Row[]>(initial.length ? initial : [blank(), blank(), blank()]);
  const [pickNote, setPickNote] = useState(false);

  const insertNote = (body: string) => {
    const el = document.getElementById("reportBody") as HTMLTextAreaElement | null;
    if (el) {
      el.value = el.value ? `${el.value}\n${body}` : body;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setPickNote(false);
  };

  return (
    <form id="measForm" action={formAction} className="px-4.5 py-4">
      <FormPersist formId="measForm" storageKey={`wcr:${reportId}:meas`} />
      <input type="hidden" name="id" value={reportId} />

      {state.error && (
        <p role="alert" className="mb-3 border border-[#e8c4bc] bg-[#fdf2ef] px-3 py-2 text-[12.5px] text-alert">
          {state.error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["部屋名", "型式", "積算時間", "製造No.", "製造年月", ""].map((h) => (
                <th key={h} className="whitespace-nowrap bg-brand-500 px-1 py-1.5 text-[11px] font-bold text-white">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="border-b border-[#edf2ee] px-0.5 py-1">
                  <TextInput name="roomName" defaultValue={r.roomName} className="w-[76px] px-1.5 py-2 text-[13.5px]" />
                </td>
                <td className="border-b border-[#edf2ee] px-0.5 py-1">
                  <Select name="measModelName" defaultValue={r.modelName} className="w-[108px] px-1 py-2 text-[13px]">
                    <option value=""></option>
                    {models.map((m) => <option key={m} value={m}>{m}</option>)}
                  </Select>
                </td>
                <td className="border-b border-[#edf2ee] px-0.5 py-1">
                  <TextInput
                    name="runningHours" inputMode="numeric" defaultValue={r.runningHours}
                    className="w-[64px] px-1.5 py-2 text-[13.5px]" aria-label="積算時間"
                  />
                </td>
                <td className="border-b border-[#edf2ee] px-0.5 py-1">
                  <TextInput
                    name="serialNo" maxLength={6} defaultValue={r.serialNo}
                    className="w-[66px] px-1.5 py-2 text-[13.5px]" aria-label="製造No."
                  />
                </td>
                <td className="border-b border-[#edf2ee] px-0.5 py-1">
                  <TextInput type="month" name="manufacturedYm" defaultValue={r.manufacturedYm} className="w-[118px] px-1.5 py-2 text-[13px]" />
                </td>
                <td className="border-b border-[#edf2ee] px-0.5 py-1">
                  <button
                    type="button"
                    onClick={() => setRows((s) => s.filter((_, j) => j !== i))}
                    disabled={rows.length === 1}
                    aria-label={`${i + 1}行目を削除`}
                    className="px-1 text-[15px] leading-none text-[#8a5049] disabled:text-line-2"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 mb-4 flex items-center gap-2.5">
        <Button type="button" variant="ghost" size="sm" onClick={() => setRows((s) => [...s, blank()])}>
          ＋ 行を追加
        </Button>
        <span className="text-[11.5px] text-ink-3">積算時間は0〜100,000h／製造No.は6文字以内</span>
      </div>

      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[13.5px] font-bold">報告事項</span>
        <Button type="button" size="sm" onClick={() => setPickNote(true)}>選択</Button>
        <MicButton targetId="reportBody" />
      </div>
      <TextArea id="reportBody" name="reportBody" rows={7} defaultValue={reportBody} />

      {pickNote && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-5" role="dialog" aria-modal="true" aria-label="報告事項の選択">
          <div className="flex max-h-[80vh] w-full max-w-[430px] flex-col bg-white shadow-2xl">
            <div className="flex flex-none items-center bg-brand-700 px-4 py-2.5 text-white">
              <span className="text-sm font-bold">報告事項の選択</span>
              <button type="button" onClick={() => setPickNote(false)} className="ml-auto px-1 text-base leading-none" aria-label="閉じる">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {notes.length === 0 && <p className="py-8 text-center text-[13px] text-ink-3">登録されている報告事項がありません</p>}
              {notes.map((n, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => insertNote(n.body)}
                  className="mb-2 block w-full border border-[#e3eae5] border-l-[3px] border-l-brand-500 bg-brand-50 px-3 py-2.5 text-left text-[13px] leading-relaxed hover:bg-brand-100"
                >
                  {n.body}
                  {n.own && <span className="ml-1 text-[10.5px] text-ink-3">（自社登録）</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <NavButtons backHref={`/reports/${reportId}/parts`}>
        <NavSubmit disabled={pending} label={pending ? "保存中" : "つぎへ"} />
      </NavButtons>
    </form>
  );
}
