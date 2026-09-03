"use client";

import { useActionState } from "react";
import { Button, TextInput } from "@/components/ui";
import type { LoginState } from "@/server/auth";

export function LoginForm({
  action,
  title,
  note,
}: {
  action: (prev: LoginState, fd: FormData) => Promise<LoginState>;
  title: string;
  note?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mx-auto max-w-[400px] border border-[#d6dfd9] bg-[#eef2ef] px-6 py-7">
      <h1 className="mb-5 text-center text-[15px] font-bold">{title}</h1>

      {state.error && (
        <p role="alert" className="mb-4 border border-[#e8c4bc] bg-[#fdf2ef] px-3 py-2 text-[12.5px] text-alert">
          {state.error}
        </p>
      )}

      <div className="mb-3 grid grid-cols-[88px_1fr] items-center gap-2.5">
        <label htmlFor="loginId" className="text-right text-[13.5px] text-ink-2">ユーザーID</label>
        <TextInput id="loginId" name="loginId" autoComplete="username" required defaultValue="" />
      </div>
      <div className="mb-3 grid grid-cols-[88px_1fr] items-center gap-2.5">
        <label htmlFor="password" className="text-right text-[13.5px] text-ink-2">パスワード</label>
        <TextInput id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      <label className="mb-4 flex items-center justify-center gap-2 text-[13px] text-ink-2">
        <input type="checkbox" name="remember" className="h-5 w-5 accent-brand-600" />
        ユーザーID、パスワードを保持する
      </label>

      <div className="text-center">
        <Button type="submit" disabled={pending} className="px-10 py-3 text-[15px]">
          {pending ? "確認中…" : "ログイン"}
        </Button>
      </div>

      {note && <p className="mt-4 text-center text-[11.5px] leading-relaxed text-ink-3">{note}</p>}
    </form>
  );
}
