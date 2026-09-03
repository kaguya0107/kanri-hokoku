"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QuantityStepper } from "@/components/quantity-stepper";
import { NavButtons, NavSubmit, TextInput } from "@/components/ui";
import { KANA_ROWS } from "@/lib/kana";
import type { StepState } from "@/server/internal-reports";

type Part = { id: number; code: string; name: string; kana: string; unit: string };
type Selected = Part & { quantity: number };

/**
 * 再手配の必要な部材（4-3）。
 * B-11: 概要書は11品目の固定リストだが、客先提出用と同じ部品を扱うためマスタ検索に揃えている。
 */
export function ReorderPicker({
  action,
  reportId,
  initial,
}: {
  action: (prev: StepState, fd: FormData) => Promise<StepState>;
  reportId: string;
  initial: Selected[];
}) {
  const [state, setState] = useState<StepState>({});
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<Selected[]>(initial);
  const [q, setQ] = useState("");
  const [row, setRow] = useState("");
  const [items, setItems] = useState<Part[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  const search = useCallback(async (nq: string, nr: string, skip: number, append: boolean) => {
    const mine = ++reqId.current;
    setLoading(true);
    try {
      const p = new URLSearchParams({ take: "60", skip: String(skip) });
      if (nq) p.set("q", nq);
      if (nr) p.set("row", nr);
      const res = await fetch(`/api/parts?${p}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { total: number; items: Part[] };
      if (mine !== reqId.current) return;
      setTotal(data.total);
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
    } catch {
      if (mine === reqId.current) setState({ error: "部品の検索に失敗しました。通信状況をご確認ください。" });
    } finally {
      if (mine === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(q, row, 0, false), 250);
    return () => clearTimeout(t);
  }, [q, row, search]);

  return (
    <form
      action={async (fd) => {
        setPending(true);
        const res = await action({}, fd);
        setPending(false);
        if (res?.error) setState(res);
      }}
      className="px-4.5 py-4"
    >
      <input type="hidden" name="id" value={reportId} />
      {selected.map((s) => (
        <span key={s.id}>
          <input type="hidden" name="partId" value={s.id} />
          <input type="hidden" name="quantity" value={s.quantity} />
        </span>
      ))}

      {state.error && (
        <p role="alert" className="mb-3 border border-[#e8c4bc] bg-[#fdf2ef] px-3 py-2 text-[12.5px] text-alert">
          {state.error}
        </p>
      )}

      <div className="mb-2.5 flex gap-1.5">
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="部品名・読み・コードで検索" aria-label="部品の検索" />
        {(q || row) && (
          <button type="button" onClick={() => { setQ(""); setRow(""); }} className="flex-none rounded-full border border-line-2 bg-white px-3 text-[12px] text-ink-2">
            クリア
          </button>
        )}
      </div>

      <div className="mb-2.5 flex flex-wrap gap-1">
        <button type="button" onClick={() => setRow("")} aria-pressed={row === ""}
          className={`h-8 w-9 rounded-sm border text-[13px] ${row === "" ? "border-brand-600 bg-brand-600 font-bold text-white" : "border-line-2 bg-white"}`}>全</button>
        {KANA_ROWS.map((k) => (
          <button key={k} type="button" onClick={() => setRow(row === k ? "" : k)} aria-pressed={row === k}
            className={`h-8 w-9 rounded-sm border text-[13px] ${row === k ? "border-brand-600 bg-brand-600 font-bold text-white" : "border-line-2 bg-white"}`}>{k}</button>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="mb-2.5 border border-[#bfd8c8] bg-brand-100 px-2.5 py-2">
          <p className="mb-1 flex items-baseline gap-2 text-[11.5px] font-bold text-brand-800">
            再手配する部材
            <span className="ml-auto font-mono text-[10px] font-normal">{selected.length} 品目</span>
          </p>
          {selected.map((s) => (
            <div key={s.id} className="flex items-center gap-2 border-b border-[#d6e4db] py-2 last:border-0">
              <span className="min-w-0 flex-1 truncate text-[13px]">
                {s.name}<span className="ml-1 font-mono text-[10.5px] text-ink-3">{s.code}</span>
              </span>
              <QuantityStepper defaultValue={s.quantity} min={1}
                onChange={(v) => setSelected((x) => x.map((y) => (y.id === s.id ? { ...y, quantity: v } : y)))} />
              <span className="w-5 flex-none text-[11.5px] text-ink-2">{s.unit}</span>
              <button type="button" onClick={() => setSelected((x) => x.filter((y) => y.id !== s.id))}
                className="flex-none px-1 text-[12px] text-[#8a5049] underline">削除</button>
            </div>
          ))}
        </div>
      )}

      <div className="h-[250px] overflow-y-auto border border-line-2 bg-white">
        {items.length === 0 && !loading && (
          <p className="px-3 py-10 text-center text-[13px] text-ink-3">
            {q || row ? "条件に一致する部品はありません" : "検索するか、50音で絞り込んでください"}
          </p>
        )}
        {items.map((p) => {
          const on = selected.some((s) => s.id === p.id);
          return (
            <button type="button" key={p.id}
              onClick={() => setSelected((s) => on ? s.filter((x) => x.id !== p.id) : [...s, { ...p, quantity: 1 }])}
              className={`flex w-full items-center gap-2 border-b border-[#edf2ee] px-2.5 py-2.5 text-left ${on ? "bg-brand-100" : "hover:bg-brand-50"}`}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]">{p.name}</span>
                <span className="block truncate font-mono text-[10.5px] text-ink-3">{p.code}　{p.kana}</span>
              </span>
              <span className="w-5 flex-none text-[11.5px] text-ink-2">{p.unit}</span>
              <span className={`flex-none text-[15px] ${on ? "text-brand-600" : "text-line"}`}>{on ? "✓" : "＋"}</span>
            </button>
          );
        })}
        {items.length < total && (
          <button type="button" onClick={() => search(q, row, items.length, true)} disabled={loading}
            className="w-full py-3 text-center text-[12.5px] text-brand-800 underline">
            {loading ? "読み込み中…" : `さらに表示（残り ${(total - items.length).toLocaleString()} 件）`}
          </button>
        )}
      </div>
      <p className="mt-1.5 text-right font-mono text-[11px] text-ink-3 tabular-nums">
        {loading ? "検索中…" : `${items.length.toLocaleString()} / ${total.toLocaleString()} 件`}
      </p>

      <NavButtons backHref={`/reports/${reportId}/internal/remaining`}>
        <NavSubmit disabled={pending} label={pending ? "保存中" : "つぎへ"} />
      </NavButtons>
    </form>
  );
}
