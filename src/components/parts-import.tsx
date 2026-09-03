"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui";
import { commitImport, validateImport, type ImportPreview } from "@/server/parts";

/**
 * 取込は「検証 → 結果確認 → 確定」の3段階（B-24）。
 * 概要書は「書き込む前にDBをクリア」としているが、途中で失敗するとマスタが全損するため
 * コードをキーにした更新＋差分の無効化に変えている。
 */
export function PartsImport() {
  const [open, setOpen] = useState(false);
  const [check, checkAction, checking] = useActionState(validateImport, {} as ImportPreview);
  const [commit, commitAction, committing] = useActionState(commitImport, {} as ImportPreview);

  const v = check.validated;
  const done = commit.done;
  const blocked = (v?.issues.length ?? 0) > 0;

  const close = () => { setOpen(false); if (done) location.reload(); };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-[#2c5a80] hover:bg-[#24496a]">
        インポート
      </Button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-6" role="dialog" aria-modal="true" aria-label="交換部品マスタの取込">
          <div className="flex max-h-[88vh] w-full max-w-[720px] flex-col bg-white shadow-2xl">
            <div className="flex flex-none items-center bg-brand-700 px-4 py-2.5 text-white">
              <span className="text-sm font-bold">交換部品マスタ 取込</span>
              <button onClick={close} className="ml-auto px-1 text-base leading-none" aria-label="閉じる">×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {(check.error || commit.error) && (
                <p role="alert" className="mb-3 border border-[#e8c4bc] bg-[#fdf2ef] px-3 py-2 text-[12.5px] text-alert">
                  {check.error ?? commit.error}
                </p>
              )}

              {done ? (
                <div className="border border-[#c3dbcc] bg-brand-100 px-4 py-4">
                  <p className="mb-2 text-[14px] font-bold text-brand-800">取込が完了しました</p>
                  <ul className="space-y-1 text-[13px] text-ink-2">
                    <li>新規追加：<span className="font-mono tabular-nums">{done.inserted.toLocaleString()}</span> 件</li>
                    <li>更新：<span className="font-mono tabular-nums">{done.updated.toLocaleString()}</span> 件</li>
                    <li>無効化：<span className="font-mono tabular-nums">{done.deactivated.toLocaleString()}</span> 件</li>
                  </ul>
                  <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
                    CSVに含まれていない品目は削除せず「無効」にしました。
                    過去の報告書は部品名を控えているため、表示内容は変わりません。
                  </p>
                </div>
              ) : !v ? (
                <form action={checkAction}>
                  <p className="mb-3 text-[13px] leading-relaxed text-ink-2">
                    ダウンロードしたCSVを修正して読み込ませてください。
                    見出し行は <code className="bg-brand-50 px-1 font-mono text-[11.5px]">部品コード,部品名,読み,単位,優先順位</code> です。
                  </p>
                  <input
                    type="file"
                    name="file"
                    accept=".csv,text/csv"
                    required
                    className="mb-4 block w-full rounded-sm border border-line bg-white px-2.5 py-2 text-[13px]
                      file:mr-3 file:rounded-full file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-[12px] file:text-white"
                  />
                  <p className="mb-4 border-l-2 border-brand-500 bg-brand-50 px-3 py-2 text-[11.5px] leading-relaxed text-ink-2">
                    このボタンではまだ書き込みません。内容を検証し、追加・更新・無効化の件数を確認してから確定します。
                  </p>
                  <div className="flex justify-end gap-2.5">
                    <Button type="button" variant="ghost" onClick={close}>キャンセル</Button>
                    <Button type="submit" disabled={checking}>{checking ? "検証中…" : "内容を確認する"}</Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-3 gap-px border border-line-2 bg-line-2">
                    {[
                      ["新規追加", v.willInsert],
                      ["更新", v.willUpdate],
                      ["無効化", v.willDeactivate],
                    ].map(([label, n]) => (
                      <div key={label as string} className="bg-white px-3 py-2.5">
                        <p className="text-[11px] text-ink-3">{label as string}</p>
                        <p className="font-mono text-[19px] tabular-nums">{(n as number).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>

                  {v.issues.length > 0 ? (
                    <div className="mb-4">
                      <p className="mb-2 text-[13px] font-bold text-alert">
                        {v.issues.length} 行にエラーがあります。修正してから読み込ませてください。
                      </p>
                      <div className="max-h-[220px] overflow-y-auto border border-[#e8c4bc]">
                        <table className="w-full border-collapse text-[12px]">
                          <tbody>
                            {v.issues.slice(0, 200).map((is) => (
                              <tr key={is.line} className="border-b border-[#f0dcd7] last:border-0">
                                <td className="w-[70px] bg-[#fdf2ef] px-2.5 py-1.5 font-mono text-[11px] text-alert">
                                  {is.line}行目
                                </td>
                                <td className="px-2.5 py-1.5 text-ink-2">{is.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {v.issues.length > 200 && (
                        <p className="mt-1.5 text-[11px] text-ink-3">ほか {v.issues.length - 200} 件のエラーがあります</p>
                      )}
                    </div>
                  ) : (
                    <p className="mb-4 border border-[#c3dbcc] bg-brand-100 px-3 py-2 text-[12.5px] text-brand-800">
                      エラーはありません。{v.rows.length.toLocaleString()} 行を取り込みます。
                    </p>
                  )}

                  {v.willDeactivate > 0 && !blocked && (
                    <p className="mb-4 border-l-2 border-[#8c5a05] bg-[#f9f2e2] px-3 py-2 text-[11.5px] leading-relaxed text-[#7a5205]">
                      CSVに含まれていない {v.willDeactivate.toLocaleString()} 件は「無効」になり、
                      現場の部品選択に表示されなくなります。過去の報告書の記載は変わりません。
                    </p>
                  )}

                  <div className="flex justify-end gap-2.5">
                    <Button type="button" variant="ghost" onClick={close}>キャンセル</Button>
                    <form action={commitAction}>
                      <input type="hidden" name="token" value={v.token} />
                      <Button type="submit" disabled={committing || blocked}>
                        {committing ? "取込中…" : "この内容で確定する"}
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
