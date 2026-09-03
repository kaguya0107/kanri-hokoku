"use client";

import { useActionState } from "react";
import { FormPersist } from "@/components/form-persist";
import { MicButton } from "@/components/mic-input";
import { Field, NavButtons, NavSubmit, TextInput } from "@/components/ui";
import { WorkerPicker } from "@/components/worker-picker";
import type { StepState } from "@/server/reports";

export type BasicDefaults = {
  id?: string;
  uuid?: string;
  createdDate: string;
  hospitalName: string;
  workDateFrom: string;
  workDateTo: string;
  workPlace: string;
  workerNames: string[];
  workTitle: string;
};

export function BasicInfoForm({
  action,
  defaults,
  workers,
  hospitals,
  backHref,
  storageKey,
}: {
  action: (prev: StepState, fd: FormData) => Promise<StepState>;
  defaults: BasicDefaults;
  workers: string[];
  hospitals: string[];
  backHref?: string;
  storageKey: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as StepState);
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <form id="basicForm" action={formAction} className="px-4.5 py-4">
      <FormPersist formId="basicForm" storageKey={storageKey} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {defaults.uuid && <input type="hidden" name="uuid" value={defaults.uuid} />}

      {state.error && !state.fieldErrors && (
        <p role="alert" className="mb-3 border border-[#e8c4bc] bg-[#fdf2ef] px-3 py-2 text-[12.5px] text-alert">
          {state.error}
        </p>
      )}

      <Field label="作成日" required hint={err("createdDate")}>
        <TextInput type="date" name="createdDate" defaultValue={defaults.createdDate} required />
      </Field>

      <Field label="病院名" required hint={err("hospitalName")}>
        <TextInput id="hospitalName" name="hospitalName" list="hospitals" defaultValue={defaults.hospitalName} required />
        <MicButton targetId="hospitalName" />
      </Field>
      <datalist id="hospitals">
        {hospitals.map((h) => <option key={h} value={h} />)}
      </datalist>

      <Field label="作業日" required hint={err("workDateFrom")}>
        <TextInput type="date" name="workDateFrom" defaultValue={defaults.workDateFrom} required />
      </Field>

      <Field
        label="〜 終了日"
        hint={err("workDateTo") ?? "複数日にわたる作業のみ入力してください（1日で終わる場合は空欄）"}
      >
        <TextInput type="date" name="workDateTo" defaultValue={defaults.workDateTo} />
      </Field>

      <Field label="作業場所" required hint={err("workPlace")}>
        <TextInput id="workPlace" name="workPlace" defaultValue={defaults.workPlace} required />
        <MicButton targetId="workPlace" />
      </Field>

      <Field label="作業者" required hint={err("workerNames")}>
        <WorkerPicker workers={workers} defaultSelected={defaults.workerNames} />
      </Field>

      <Field label="作業件名" required hint={err("workTitle")}>
        <TextInput id="workTitle" name="workTitle" defaultValue={defaults.workTitle} required />
        <MicButton targetId="workTitle" />
      </Field>

      <NavButtons backHref={backHref}>
        <NavSubmit disabled={pending} label={pending ? "保存中" : "つぎへ"} />
      </NavButtons>
    </form>
  );
}
