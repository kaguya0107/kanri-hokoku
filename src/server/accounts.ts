"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

async function requireAdmin() {
  const s = await getAdminSession();
  if (!s) throw new Error("管理者としてログインしてください");
  return s;
}

/** 発行しやすく読み上げやすい初期パスワード（紛らわしい文字を除外） */
function generatePassword(len = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export type AccountFormState = {
  error?: string;
  /** 発行直後の1回だけ平文を返す。DBには保存しない。 */
  issuedPassword?: string;
  issuedFor?: string;
  ok?: string;
};

const createSchema = z.object({
  accountId: z
    .string()
    .trim()
    .min(4, "アカウントIDは4文字以上で入力してください")
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, "アカウントIDは半角英数字・ハイフン・アンダースコアのみ使用できます"),
  companyName: z.string().trim().min(1, "会社名を入力してください").max(120),
  email: z.union([z.string().trim().email("メールアドレスの形式が正しくありません"), z.literal("")]),
  workers: z.string().optional(),
});

export async function createAccount(
  _prev: AccountFormState,
  fd: FormData,
): Promise<AccountFormState> {
  await requireAdmin();

  const parsed = createSchema.safeParse({
    accountId: fd.get("accountId"),
    companyName: fd.get("companyName"),
    email: fd.get("email") ?? "",
    workers: fd.get("workers") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { accountId, companyName, email, workers } = parsed.data;

  if (await db.account.findUnique({ where: { accountId } })) {
    return { error: `アカウントID「${accountId}」は既に使われています` };
  }

  // B-22: 概要書の登録ダイアログにはパスワード欄が無く発行方法が未定義のため、
  // ここで自動生成し、この画面で1回だけ表示する運用とする。
  const password = generatePassword();

  // B-15: 作業者は5名固定ではなく可変。改行区切りでまとめて登録できる。
  const names = (workers ?? "")
    .split(/[\n,、]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 99);

  await db.account.create({
    data: {
      accountId,
      companyName,
      email: email || null,
      passwordHash: await bcrypt.hash(password, 10),
      workers: { create: names.map((name, i) => ({ name, sortOrder: i })) },
    },
  });

  revalidatePath("/admin/users");
  return { issuedPassword: password, issuedFor: accountId };
}

export async function resetPassword(
  _prev: AccountFormState,
  fd: FormData,
): Promise<AccountFormState> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const account = await db.account.findUnique({ where: { id } });
  if (!account) return { error: "対象のアカウントが見つかりません" };

  const password = generatePassword();
  await db.account.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 10), failedCount: 0, lockedUntil: null },
  });

  revalidatePath("/admin/users");
  return { issuedPassword: password, issuedFor: account.accountId };
}

/** A-3: 15分待たずに事務局が即時解除する */
export async function unlockAccount(_prev: AccountFormState, fd: FormData): Promise<AccountFormState> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const account = await db.account.findUnique({ where: { id } });
  if (!account) return { error: "対象のアカウントが見つかりません" };

  await db.account.update({ where: { id }, data: { failedCount: 0, lockedUntil: null } });
  revalidatePath("/admin/users");
  return { ok: `${account.accountId} のロックを解除しました` };
}

export async function toggleAccountActive(
  _prev: AccountFormState,
  fd: FormData,
): Promise<AccountFormState> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const account = await db.account.findUnique({ where: { id } });
  if (!account) return { error: "対象のアカウントが見つかりません" };

  await db.account.update({ where: { id }, data: { isActive: !account.isActive } });
  revalidatePath("/admin/users");
  return { ok: `${account.accountId} を${account.isActive ? "利用停止" : "利用再開"}しました` };
}
