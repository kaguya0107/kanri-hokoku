"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { isLocked, lockRemainingMinutes, nextLockState } from "@/lib/lockout";
import {
  createAdminSession,
  createUserSession,
  destroyAdminSession,
  destroyUserSession,
} from "@/lib/session";

const schema = z.object({
  loginId: z.string().trim().min(1, "ユーザーIDを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export type LoginState = { error?: string };

export async function loginUser(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    loginId: formData.get("loginId"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { loginId, password } = parsed.data;
  const account = await db.account.findUnique({ where: { accountId: loginId } });

  // 存在しないIDでも同じ文言を返し、IDの有無を推測させない
  const generic = { error: "ユーザーIDまたはパスワードが正しくありません" };
  if (!account || !account.isActive) return generic;

  if (isLocked(account.lockedUntil)) {
    return {
      error: `ロック中です。あと約${lockRemainingMinutes(account.lockedUntil)}分お待ちいただくか、事務局にご連絡ください`,
    };
  }

  const ok = await bcrypt.compare(password, account.passwordHash);
  if (!ok) {
    const next = nextLockState(account.failedCount);
    await db.account.update({ where: { id: account.id }, data: next });
    if (next.lockedUntil) {
      return { error: "3回連続で失敗したため15分間ロックしました。お急ぎの場合は事務局にご連絡ください" };
    }
    return generic;
  }

  await db.account.update({
    where: { id: account.id },
    data: { failedCount: 0, lockedUntil: null },
  });
  await createUserSession({
    accountId: account.id,
    loginId: account.accountId,
    companyName: account.companyName,
  });
  redirect("/dashboard");
}

export async function loginAdmin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    loginId: formData.get("loginId"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { loginId, password } = parsed.data;
  const admin = await db.admin.findUnique({ where: { accountId: loginId } });
  const generic = { error: "ユーザーIDまたはパスワードが正しくありません" };
  if (!admin) return generic;

  if (isLocked(admin.lockedUntil)) {
    return { error: `ロック中です。あと約${lockRemainingMinutes(admin.lockedUntil)}分お待ちください` };
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    const next = nextLockState(admin.failedCount);
    await db.admin.update({ where: { id: admin.id }, data: next });
    return next.lockedUntil
      ? { error: "3回連続で失敗したため15分間ロックしました" }
      : generic;
  }

  await db.admin.update({ where: { id: admin.id }, data: { failedCount: 0, lockedUntil: null } });
  await createAdminSession({ adminId: admin.id, loginId: admin.accountId });
  redirect("/admin");
}

export async function logoutUser() {
  await destroyUserSession();
  redirect("/login");
}

export async function logoutAdmin() {
  await destroyAdminSession();
  redirect("/admin/login");
}
