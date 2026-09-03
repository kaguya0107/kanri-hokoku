"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/session";

async function requireUser() {
  const s = await getUserSession();
  if (!s) redirect("/login");
  return s;
}

export type MyPageState = { error?: string; ok?: string };

const accountSchema = z
  .object({
    currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
    newPassword: z.union([z.string().min(8, "新しいパスワードは8文字以上で入力してください").max(72), z.literal("")]),
    confirmPassword: z.string(),
    email: z.union([z.string().trim().email("メールアドレスの形式が正しくありません"), z.literal("")]),
    companyName: z.string().trim().min(1, "会社名を入力してください").max(120),
  })
  .refine((v) => !v.newPassword || v.newPassword === v.confirmPassword, {
    message: "新しいパスワードが一致しません",
    path: ["confirmPassword"],
  });

/**
 * 5-1 ユーザー情報変更。
 * B-17: アカウントが会社共有のため、確認なしに変更されると全作業者が締め出される。
 * 現在のパスワード入力を必須にしている。
 */
export async function updateAccount(_prev: MyPageState, fd: FormData): Promise<MyPageState> {
  const session = await requireUser();

  const parsed = accountSchema.safeParse({
    currentPassword: fd.get("currentPassword") ?? "",
    newPassword: fd.get("newPassword") ?? "",
    confirmPassword: fd.get("confirmPassword") ?? "",
    email: fd.get("email") ?? "",
    companyName: fd.get("companyName") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const account = await db.account.findUniqueOrThrow({ where: { id: session.accountId } });
  if (!(await bcrypt.compare(parsed.data.currentPassword, account.passwordHash))) {
    return { error: "現在のパスワードが正しくありません" };
  }

  await db.account.update({
    where: { id: account.id },
    data: {
      email: parsed.data.email || null,
      companyName: parsed.data.companyName,
      ...(parsed.data.newPassword ? { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) } : {}),
    },
  });

  revalidatePath("/mypage/account");
  return {
    ok: parsed.data.newPassword
      ? "登録しました。次回のログインから新しいパスワードをお使いください。"
      : "登録しました。",
  };
}

/* ---------- 5-2 作業者テーブル ---------- */

export async function saveWorker(_prev: MyPageState, fd: FormData): Promise<MyPageState> {
  const session = await requireUser();
  const id = fd.get("workerId") ? String(fd.get("workerId")) : null;
  const parsed = z.object({ name: z.string().trim().min(1, "作業者名を入力してください").max(60) })
    .safeParse({ name: fd.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (id) {
    const w = await db.worker.findFirst({ where: { id, accountId: session.accountId } });
    if (!w) return { error: "対象の作業者が見つかりません" };
    await db.worker.update({ where: { id }, data: { name: parsed.data.name } });
  } else {
    const max = await db.worker.aggregate({
      where: { accountId: session.accountId },
      _max: { sortOrder: true },
    });
    await db.worker.create({
      data: {
        accountId: session.accountId,
        name: parsed.data.name,
        sortOrder: (max._max.sortOrder ?? 0) + 1,
      },
    });
  }

  revalidatePath("/mypage/workers");
  return { ok: id ? "更新しました" : "追加しました" };
}

/** 過去の報告書に名前が残るため物理削除しない（B-18） */
export async function toggleWorker(_prev: MyPageState, fd: FormData): Promise<MyPageState> {
  const session = await requireUser();
  const id = String(fd.get("workerId"));
  const w = await db.worker.findFirst({ where: { id, accountId: session.accountId } });
  if (!w) return { error: "対象の作業者が見つかりません" };

  await db.worker.update({ where: { id }, data: { isActive: !w.isActive } });
  revalidatePath("/mypage/workers");
  return { ok: w.isActive ? "一覧から外しました" : "一覧に戻しました" };
}

/* ---------- 5-3 報告事項テーブル（自社分） ---------- */

export async function saveOwnNote(_prev: MyPageState, fd: FormData): Promise<MyPageState> {
  const session = await requireUser();
  const id = fd.get("noteId") ? Number(fd.get("noteId")) : null;
  const parsed = z.object({ body: z.string().trim().min(1, "報告事項を入力してください").max(1000) })
    .safeParse({ body: fd.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (id) {
    const n = await db.reportNoteTemplate.findFirst({ where: { id, accountId: session.accountId } });
    if (!n) return { error: "対象が見つかりません" };
    await db.reportNoteTemplate.update({ where: { id }, data: { body: parsed.data.body } });
  } else {
    await db.reportNoteTemplate.create({
      data: { accountId: session.accountId, body: parsed.data.body },
    });
  }

  revalidatePath("/mypage/notes");
  return { ok: id ? "更新しました" : "追加しました" };
}

export async function deleteOwnNote(_prev: MyPageState, fd: FormData): Promise<MyPageState> {
  const session = await requireUser();
  const id = Number(fd.get("noteId"));
  const n = await db.reportNoteTemplate.findFirst({ where: { id, accountId: session.accountId } });
  if (!n) return { error: "対象が見つかりません" };

  await db.reportNoteTemplate.delete({ where: { id } });
  revalidatePath("/mypage/notes");
  return { ok: "削除しました" };
}
