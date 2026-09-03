"use client";

import { useActionState } from "react";
import { MicButton } from "@/components/mic-input";
import { Button, Field, TextArea, TextInput } from "@/components/ui";
import { sendReportMail, type MailState } from "@/server/mail";

/** メール送信（2-10） */
export function MailForm({
  reportId, hospitalName, filename, defaultBody,
}: {
  reportId: string; hospitalName: string; filename: string; defaultBody: string;
}) {
  const [state, action, pending] = useActionState(sendReportMail, {} as MailState);

  if (state.ok) {
    return (
      <div className="px-4.5 py-14 text-center">
        <p className="mb-1 text-[15px] font-bold text-brand-800">送信しました</p>
        <p className="mb-6 text-[12.5px] text-ink-2">{hospitalName} 宛に報告書を送信しました。</p>
        <a href={`/reports/${reportId}/done`} className="inline-flex min-h-[44px] items-center rounded-full bg-brand-600 px-6 text-sm text-white">
          完了画面へ戻る
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="px-4.5 py-4">
      <input type="hidden" name="id" value={reportId} />

      {state.error && (
        <p role="alert" className="mb-3 border border-[#e8c4bc] bg-[#fdf2ef] px-3 py-2 text-[12.5px] text-alert">
          {state.error}
        </p>
      )}

      <Field label="送信先" required hint="複数の場合はカンマで区切ってください">
        <TextInput type="text" name="to" placeholder="xxx@xxx.xx" required />
      </Field>
      <Field label="件名" required>
        <TextInput name="subject" defaultValue="作業完了報告書" required />
      </Field>
      <Field label="CC" hint="カンマ区切りで追加できます">
        <TextInput type="text" name="cc" />
      </Field>

      <div className="mt-3 mb-1.5 flex items-center gap-2">
        <span className="text-[12.5px] text-ink-2">本文</span>
        <MicButton targetId="mailBody" />
      </div>
      <TextArea id="mailBody" name="body" rows={7} defaultValue={defaultBody} />

      <p className="mt-3 border border-line-2 bg-[#f7f9f7] px-3 py-2.5 text-[12px] text-ink-2">
        添付：{filename}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
        送信の記録は一覧の「Mail」列に残ります。控えとして管理者にも同じ内容が送られます。
      </p>

      <div className="mt-5 flex justify-center gap-4">
        <a href={`/reports/${reportId}/done`} className="inline-flex min-h-[44px] items-center rounded-full border border-brand-600 bg-white px-4 text-sm text-brand-600">
          もどる
        </a>
        <Button type="submit" disabled={pending} className="px-10">
          {pending ? "送信中…" : "送信"}
        </Button>
      </div>
    </form>
  );
}
