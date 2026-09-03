"use client";

import { useActionState, useState } from "react";
import { FormPersist } from "@/components/form-persist";
import { MicButton } from "@/components/mic-input";
import { QuantityStepper } from "@/components/quantity-stepper";
import { NavButtons, NavSubmit, TextArea } from "@/components/ui";
import type { StepState } from "@/server/reports";

type Row = { modelName: string; quantity: number };

/** 作業内容（2-2）。対象外は削除でき、戻すこともできる。 */
export function WorkItemsForm({
  action,
  reportId,
  allModels,
  initial,
  freeWorkNote,
}: {
  action: (prev: StepState, fd: FormData) => Promise<StepState>;
  reportId: string;
  allModels: string[];
  initial: Row[];
  freeWorkNote: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as StepState);

  // 保存済みがあればそれを、無ければマスタ全件を初期表示にする
  const [rows, setRows] = useState<Row[]>(
    initial.length ? initial : allModels.map((modelName) => ({ modelName, quantity: 0 })),
  );

  const removed = allModels.filter((m) => !rows.some((r) => r.modelName === m));

  return (
    <form id="workForm" action={formAction} className="px-4.5 py-4">
      <FormPersist formId="workForm" storageKey={`wcr:${reportId}:work`} />
      <input type="hidden" name="id" value={reportId} />

      {state.error && (
        <p role="alert" className="mb-3 border border-[#e8c4bc] bg-[#fdf2ef] px-3 py-2 text-[12.5px] text-alert">
          {state.error}
        </p>
      )}

      {rows.length === 0 && (
        <p className="py-6 text-center text-[13px] text-ink-3">
          対象の機種がありません。下の「機種を戻す」から追加してください。
        </p>
      )}

      {rows.map((r, i) => (
        <div key={r.modelName} className="flex items-center gap-2 border-b border-[#edf2ee] py-2">
          <span className="min-w-0 flex-1 truncate text-[14px]">{r.modelName}</span>
          <input type="hidden" name="modelName" value={r.modelName} />
          <QuantityStepper
            name="quantity"
            defaultValue={r.quantity}
            onChange={(v) => setRows((s) => s.map((x, j) => (j === i ? { ...x, quantity: v } : x)))}
          />
          <span className="w-6 flex-none text-[12.5px] text-ink-2">台</span>
          <button
            type="button"
            onClick={() => setRows((s) => s.filter((_, j) => j !== i))}
            className="flex-none px-1 text-[12px] text-[#8a5049] underline"
          >
            削除
          </button>
        </div>
      ))}

      {removed.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {removed.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setRows((s) => [...s, { modelName: m, quantity: 0 }])}
              className="rounded-full border border-line-2 bg-white px-3 py-1.5 text-[11.5px] text-ink-2 hover:bg-brand-50"
            >
              ＋ {m}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 mb-1.5 flex items-center gap-2">
        <span className="text-[12.5px] text-ink-2">任意入力</span>
        <MicButton targetId="freeWorkNote" />
      </div>
      <TextArea id="freeWorkNote" name="freeWorkNote" rows={3} defaultValue={freeWorkNote} />

      <NavButtons backHref={`/reports/${reportId}/basic`}>
        <NavSubmit disabled={pending} label={pending ? "保存中" : "つぎへ"} />
      </NavButtons>
    </form>
  );
}
