"use client";

import { useActionState, useState } from "react";
import { Button, TextInput } from "@/components/ui";
import {
  createAccount,
  resetPassword,
  toggleAccountActive,
  unlockAccount,
  type AccountFormState,
} from "@/server/accounts";

/** 発行された初期パスワードを1度だけ表示する。閉じると二度と見られない。 */
function IssuedPassword({ state }: { state: AccountFormState }) {
  if (!state.issuedPassword) return null;
  return (
    <div className="mb-4 border border-[#c3dbcc] bg-brand-100 px-4 py-3">
      <p className="mb-1.5 text-[13px] font-bold text-brand-800">
        {state.issuedFor} の初期パスワードを発行しました
      </p>
      <p className="mb-2 font-mono text-[20px] tracking-wider text-ink select-all">
        {state.issuedPassword}
      </p>
      <p className="text-[11.5px] leading-relaxed text-ink-2">
        この画面を閉じると二度と表示できません。控えたうえで協力会社へお伝えください。
        <br />
        パスワードは暗号化して保存されるため、管理者でも後から確認することはできません。
      </p>
    </div>
  );
}

export function NewAccountDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createAccount, {} as AccountFormState);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-[#2c5a80] hover:bg-[#24496a]">
        ＋ 追加
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-6"
          role="dialog"
          aria-modal="true"
          aria-label="アカウント新規登録"
        >
          <div className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center bg-brand-700 px-4 py-2.5 text-white">
              <span className="text-sm font-bold">アカウント 新規登録</span>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto px-1 text-base leading-none"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4">
              <IssuedPassword state={state} />

              {state.error && (
                <p role="alert" className="mb-3 border border-[#e8c4bc] bg-[#fdf2ef] px-3 py-2 text-[12.5px] text-alert">
                  {state.error}
                </p>
              )}

              {state.issuedPassword ? (
                <div className="flex justify-end">
                  <Button variant="ghost" onClick={() => { setOpen(false); location.reload(); }}>
                    閉じる
                  </Button>
                </div>
              ) : (
                <form action={action}>
                  <div className="mb-3 grid grid-cols-[110px_1fr] items-center gap-2.5">
                    <label htmlFor="accountId" className="text-right text-[13px] text-ink-2">アカウントID</label>
                    <TextInput id="accountId" name="accountId" required placeholder="ABC001" />
                  </div>
                  <div className="mb-3 grid grid-cols-[110px_1fr] items-center gap-2.5">
                    <label htmlFor="companyName" className="text-right text-[13px] text-ink-2">会社名</label>
                    <TextInput id="companyName" name="companyName" required />
                  </div>
                  <div className="mb-3 grid grid-cols-[110px_1fr] items-center gap-2.5">
                    <label htmlFor="email" className="text-right text-[13px] text-ink-2">メール</label>
                    <TextInput id="email" name="email" type="email" placeholder="任意" />
                  </div>
                  <div className="mb-1 grid grid-cols-[110px_1fr] items-start gap-2.5">
                    <label htmlFor="workers" className="pt-2 text-right text-[13px] text-ink-2">作業者</label>
                    <textarea
                      id="workers"
                      name="workers"
                      rows={4}
                      placeholder={"1行に1名（改行区切り）\n鈴木太郎\n加藤次郎"}
                      className="w-full rounded-sm border border-line px-2.5 py-2 text-[14px]
                        focus:border-brand-500 focus:outline-2 focus:-outline-offset-1 focus:outline-brand-500"
                    />
                  </div>
                  <p className="mb-4 pl-[120px] text-[11px] text-ink-3">
                    人数の上限はありません。登録後もマイページから追加できます。
                  </p>

                  <div className="flex justify-end gap-2.5">
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>キャンセル</Button>
                    <Button type="submit" disabled={pending}>{pending ? "登録中…" : "登録"}</Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** 一覧の各行に置く操作。パスワード再発行だけは結果表示が要るのでダイアログを出す。 */
export function RowActions({
  id,
  accountId,
  isLocked,
  isActive,
}: {
  id: string;
  accountId: string;
  isLocked: boolean;
  isActive: boolean;
}) {
  const [reset, resetAction, resetting] = useActionState(resetPassword, {} as AccountFormState);
  const [, unlockAction, unlocking] = useActionState(unlockAccount, {} as AccountFormState);
  const [, toggleAction, toggling] = useActionState(toggleAccountActive, {} as AccountFormState);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isLocked && (
        <form action={unlockAction}>
          <input type="hidden" name="id" value={id} />
          <button
            disabled={unlocking}
            className="rounded-full border border-[#8c5a05] bg-[#f3e6cb] px-2.5 py-1 text-[11px] text-[#7a5205] hover:bg-[#ecd9b3]"
          >
            {unlocking ? "解除中…" : "ロック解除"}
          </button>
        </form>
      )}

      <button
        onClick={() => setConfirmReset(true)}
        className="rounded-full border border-line-2 bg-white px-2.5 py-1 text-[11px] text-ink-2 hover:bg-brand-50"
      >
        PW再発行
      </button>

      <form action={toggleAction}>
        <input type="hidden" name="id" value={id} />
        <button
          disabled={toggling}
          className="rounded-full border border-line-2 bg-white px-2.5 py-1 text-[11px] text-ink-2 hover:bg-brand-50"
        >
          {isActive ? "利用停止" : "利用再開"}
        </button>
      </form>

      {confirmReset && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-[460px] bg-white p-6 shadow-2xl">
            <IssuedPassword state={reset} />

            {reset.issuedPassword ? (
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => { setConfirmReset(false); location.reload(); }}>
                  閉じる
                </Button>
              </div>
            ) : (
              <>
                <p className="mb-1 text-[14px] font-bold">{accountId} のパスワードを再発行します</p>
                <p className="mb-5 text-[12.5px] leading-relaxed text-ink-2">
                  現在のパスワードは使えなくなります。
                  この協力会社は全作業者が同じIDを共有しているため、
                  再発行後は現場の全員に新しいパスワードを伝える必要があります。
                </p>
                <div className="flex justify-end gap-2.5">
                  <Button type="button" variant="ghost" onClick={() => setConfirmReset(false)}>キャンセル</Button>
                  <form action={resetAction}>
                    <input type="hidden" name="id" value={id} />
                    <Button type="submit" disabled={resetting}>{resetting ? "発行中…" : "再発行する"}</Button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
