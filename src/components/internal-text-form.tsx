"use client";

import { useActionState } from "react";
import { FormPersist } from "@/components/form-persist";
import { MicButton } from "@/components/mic-input";
import { NavButtons, NavSubmit, TextArea } from "@/components/ui";
import type { StepState } from "@/server/internal-reports";

/** 4-2 / 4-5 のような自由記述だけの画面で使い回す */
export function InternalTextForm({
  action,
  reportId,
  backHref,
  storageKey,
  fields,
}: {
  action: (prev: StepState, fd: FormData) => Promise<StepState>;
  reportId: string;
  backHref: string;
  storageKey: string;
  fields: { name: string; label: string; rows: number; defaultValue: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {} as StepState);

  return (
    <form id={storageKey} action={formAction} className="px-4.5 py-4">
      <FormPersist formId={storageKey} storageKey={storageKey} />
      <input type="hidden" name="id" value={reportId} />

      {state.error && (
        <p role="alert" className="mb-3 border border-[#e8c4bc] bg-[#fdf2ef] px-3 py-2 text-[12.5px] text-alert">
          {state.error}
        </p>
      )}

      {fields.map((f) => (
        <div key={f.name} className="mb-4">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[13.5px] font-bold">{f.label}</span>
            <MicButton targetId={f.name} />
          </div>
          <TextArea id={f.name} name={f.name} rows={f.rows} defaultValue={f.defaultValue} />
        </div>
      ))}

      <NavButtons backHref={backHref}>
        <NavSubmit disabled={pending} label={pending ? "保存中" : "つぎへ"} />
      </NavButtons>
    </form>
  );
}
