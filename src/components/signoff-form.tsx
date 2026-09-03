"use client";

import { useActionState, useState } from "react";
import { SignaturePad } from "@/components/signature-pad";
import { Button, Field, NavButtons, NavSubmit, TextInput } from "@/components/ui";
import type { StepState } from "@/server/reports";

/**
 * 確認・署名（2-5）。
 * 5つの確認事項すべてにチェックが入るまで作業者欄と送信を操作できない。
 */
export function SignOffForm({
  action,
  reportId,
  confirmItems,
  checkedItems,
  workers,
  signerName,
  signatureData,
}: {
  action: (prev: StepState, fd: FormData) => Promise<StepState>;
  reportId: string;
  confirmItems: { id: number; body: string }[];
  checkedItems: number[];
  workers: string[];
  signerName: string;
  signatureData: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, {} as StepState);
  const [checked, setChecked] = useState<number[]>(checkedItems);
  const [sig, setSig] = useState<string | null>(signatureData);
  const [padOpen, setPadOpen] = useState(false);

  const allChecked = confirmItems.length > 0 && checked.length === confirmItems.length;

  const toggle = (id: number) =>
    setChecked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  if (padOpen) {
    return (
      <SignaturePad
        initial={sig}
        onSave={(d) => { setSig(d); setPadOpen(false); }}
        onCancel={() => setPadOpen(false)}
      />
    );
  }

  return (
    <form action={formAction} className="px-4.5 py-4">
      <input type="hidden" name="id" value={reportId} />
      {sig && <input type="hidden" name="signatureData" value={sig} />}
      {checked.map((id) => <input key={id} type="hidden" name="checkedItems" value={id} />)}

      {state.error && (
        <p role="alert" className="mb-3 border border-[#e8c4bc] bg-[#fdf2ef] px-3 py-2 text-[12.5px] text-alert">
          {state.error}
        </p>
      )}

      <div className="mb-1.5 text-center">
        <Button type="button" onClick={() => setPadOpen(true)}>サイン入力</Button>
      </div>

      <div className="mb-3.5 flex h-[120px] items-center justify-center overflow-hidden border-2 border-dashed border-[#8a968f] bg-[#fcfdfc]">
        {sig
          ? <img src={sig} alt="お客様の署名" className="max-h-full max-w-full" />
          : <span className="text-[12.5px] text-ink-3">こちらにお客様の署名が表示されます</span>}
      </div>

      <div className="mb-3 border border-[#e8c4bc] bg-[#fdf2ef] px-3.5 py-3">
        <p className="mb-1.5 text-[13px] font-bold text-alert">
          下記の注意事項の確認がとれたらチェックをいれてください
        </p>
        {confirmItems.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-start gap-2.5 py-2 text-[13.5px] leading-normal">
            <input
              type="checkbox"
              checked={checked.includes(c.id)}
              onChange={() => toggle(c.id)}
              className="mt-0.5 h-[22px] w-[22px] flex-none accent-brand-600"
            />
            <span>{c.body}</span>
          </label>
        ))}
      </div>

      {!allChecked && (
        <p className="mb-3 text-[11.5px] font-bold text-alert">
          ※上記がすべてチェック済にならないと作業者は登録できません（{checked.length}/{confirmItems.length}）
        </p>
      )}

      <Field label="作業者" required>
        <TextInput
          name="signerName"
          list="signerList"
          defaultValue={signerName}
          disabled={!allChecked}
          required
          placeholder={allChecked ? "選択または入力" : "確認事項をすべてチェックしてください"}
        />
      </Field>
      <datalist id="signerList">
        {workers.map((w) => <option key={w} value={w} />)}
      </datalist>

      <NavButtons backHref={`/reports/${reportId}/measurements`}>
        <NavSubmit disabled={!allChecked || pending} label={pending ? "登録中" : "つぎへ"} />
      </NavButtons>
    </form>
  );
}
