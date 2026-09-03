"use client";

import { useActionState, useState } from "react";
import { Button, NavButtons, NavSubmit, TextInput } from "@/components/ui";
import { formatMinutes, minutesBetween } from "@/lib/format";
import type { StepState } from "@/server/internal-reports";

type Row = {
  workDate: string;
  goStart: string; goEnd: string;
  workStart: string; workEnd: string;
  backStart: string; backEnd: string;
};

/**
 * 移動および作業時間（4-4）。
 * B-12: 概要書には日付欄が無く、複数日の作業や日跨ぎ（22:00〜01:00）を記録できないため
 * 明細に日付を持たせ、合計も自動計算する。
 */
export function WorkTimesForm({
  action,
  reportId,
  initial,
  defaultDate,
}: {
  action: (prev: StepState, fd: FormData) => Promise<StepState>;
  reportId: string;
  initial: Row[];
  defaultDate: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as StepState);
  const [rows, setRows] = useState<Row[]>(
    initial.length
      ? initial
      : [{ workDate: defaultDate, goStart: "", goEnd: "", workStart: "", workEnd: "", backStart: "", backEnd: "" }],
  );

  const update = (i: number, key: keyof Row, value: string) =>
    setRows((s) => s.map((r, j) => (j === i ? { ...r, [key]: value } : r)));

  const travel = rows.reduce((sum, r) => sum + minutesBetween(r.goStart, r.goEnd) + minutesBetween(r.backStart, r.backEnd), 0);
  const work = rows.reduce((sum, r) => sum + minutesBetween(r.workStart, r.workEnd), 0);

  const spansMidnight = (a: string, b: string) =>
    Boolean(a && b) && Number(b.slice(0, 2)) * 60 + Number(b.slice(3)) < Number(a.slice(0, 2)) * 60 + Number(a.slice(3));

  const segments: { key: keyof Row; endKey: keyof Row; label: string }[] = [
    { key: "goStart", endKey: "goEnd", label: "I 往" },
    { key: "workStart", endKey: "workEnd", label: "S 作業" },
    { key: "backStart", endKey: "backEnd", label: "I 復" },
  ];

  return (
    <form action={formAction} className="px-4.5 py-4">
      <input type="hidden" name="id" value={reportId} />

      {state.error && (
        <p role="alert" className="mb-3 border border-[#e8c4bc] bg-[#fdf2ef] px-3 py-2 text-[12.5px] text-alert">
          {state.error}
        </p>
      )}

      <p className="mb-3 text-[12.5px] text-ink-2">移動時間・・・I　　作業時間・・・S</p>

      {rows.map((r, i) => (
        <div key={i} className="mb-3 border border-[#d6dfd9] px-3 py-2.5">
          <div className="mb-2 flex items-center gap-2">
            <TextInput
              type="date" name="workDate" value={r.workDate}
              onChange={(e) => update(i, "workDate", e.target.value)}
              className="w-[150px]" aria-label={`${i + 1}日目の日付`} required
            />
            {rows.length > 1 && (
              <button type="button" onClick={() => setRows((s) => s.filter((_, j) => j !== i))}
                aria-label={`${i + 1}日目を削除`} className="px-1 text-[15px] leading-none text-[#8a5049]">✕</button>
            )}
          </div>

          {segments.map((seg) => (
            <div key={seg.key} className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="w-[52px] flex-none text-[12.5px]">{seg.label}</span>
              <TextInput type="time" name={seg.key} value={r[seg.key]}
                onChange={(e) => update(i, seg.key, e.target.value)} className="w-[112px]" aria-label={`${seg.label} 開始`} />
              <span>〜</span>
              <TextInput type="time" name={seg.endKey} value={r[seg.endKey]}
                onChange={(e) => update(i, seg.endKey, e.target.value)} className="w-[112px]" aria-label={`${seg.label} 終了`} />
              {spansMidnight(r[seg.key], r[seg.endKey]) && (
                <span className="rounded-full bg-[#f3e6cb] px-2 py-0.5 text-[10.5px] text-[#7a5205]">翌日にまたがる</span>
              )}
            </div>
          ))}
        </div>
      ))}

      <Button type="button" variant="ghost" size="sm"
        onClick={() => setRows((s) => [...s, { workDate: defaultDate, goStart: "", goEnd: "", workStart: "", workEnd: "", backStart: "", backEnd: "" }])}>
        ＋ 日を追加
      </Button>

      <div className="mt-3.5 border border-[#c3dbcc] bg-brand-100 px-3.5 py-2.5 text-[13px]">
        合計　移動 <b className="font-mono">{formatMinutes(travel)}</b>　／　作業 <b className="font-mono">{formatMinutes(work)}</b>
      </div>

      <NavButtons backHref={`/reports/${reportId}/internal/reorder`}>
        <NavSubmit disabled={pending} label={pending ? "保存中" : "つぎへ"} />
      </NavButtons>
    </form>
  );
}
