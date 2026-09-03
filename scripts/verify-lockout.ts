/**
 * A-3（ログインロック）の動作確認。
 * src/server/auth.ts のパスワード照合とロック遷移を同じ手順で再現して検証する。
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { isLocked, lockRemainingMinutes, nextLockState } from "../src/lib/lockout";

const db = new PrismaClient();

async function attempt(loginId: string, password: string): Promise<string> {
  const a = await db.account.findUnique({ where: { accountId: loginId } });
  if (!a) return "NO_USER（IDの有無は画面上区別しない）";
  if (isLocked(a.lockedUntil)) return `LOCKED（残り約${lockRemainingMinutes(a.lockedUntil)}分）`;
  const ok = await bcrypt.compare(password, a.passwordHash);
  if (!ok) {
    const next = nextLockState(a.failedCount);
    await db.account.update({ where: { id: a.id }, data: next });
    return next.lockedUntil ? "FAIL → 15分ロック" : `FAIL（${next.failedCount}/3）`;
  }
  await db.account.update({ where: { id: a.id }, data: { failedCount: 0, lockedUntil: null } });
  return "OK";
}

const reset = () => db.account.updateMany({ data: { failedCount: 0, lockedUntil: null } });

async function main() {
  const out: string[] = [];
  await reset();

  out.push(`1回目 誤り        : ${await attempt("ABC000", "nope")}`);
  out.push(`2回目 誤り        : ${await attempt("ABC000", "nope")}`);
  out.push(`3回目 誤り        : ${await attempt("ABC000", "nope")}`);
  out.push(`4回目 正しいPW    : ${await attempt("ABC000", "demopass")}  ← ロック中は正解でも拒否`);

  await db.account.updateMany({ data: { lockedUntil: new Date(Date.now() - 1000) } });
  out.push(`ロック期限切れ後  : ${await attempt("ABC000", "demopass")}`);

  await reset();
  await attempt("ABC000", "nope");
  await attempt("ABC000", "demopass");
  const a = await db.account.findUnique({ where: { accountId: "ABC000" } });
  out.push(`成功後の失敗回数  : failedCount=${a!.failedCount}（リセットされる）`);

  out.push(`存在しないID      : ${await attempt("NOPE999", "x")}`);

  console.log(out.join("\n"));
  await reset();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
