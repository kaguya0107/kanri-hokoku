/**
 * ログイン失敗時のロック方針（仕様精査メモ A-3）
 *
 * 概要書は「3回エラーでパスワードロック。解除は事務局で行う」としているが、
 * アカウントが会社単位のため、1名の打ち間違いで会社全員が現場で締め出される。
 * ここでは 3回失敗 → 15分の自動解除ロック とし、管理画面からの即時解除も併せて提供する。
 */
export const MAX_ATTEMPTS = 3;
export const LOCK_MINUTES = 15;

export function isLocked(lockedUntil: Date | null): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > Date.now();
}

export function lockRemainingMinutes(lockedUntil: Date | null): number {
  if (!lockedUntil) return 0;
  return Math.max(0, Math.ceil((lockedUntil.getTime() - Date.now()) / 60000));
}

export function nextLockState(currentFailed: number): { failedCount: number; lockedUntil: Date | null } {
  const failedCount = currentFailed + 1;
  if (failedCount >= MAX_ATTEMPTS) {
    return { failedCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) };
  }
  return { failedCount, lockedUntil: null };
}
