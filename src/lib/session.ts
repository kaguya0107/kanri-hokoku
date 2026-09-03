import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-only-secret-change-in-production-0123456789abcdef",
);

const USER_COOKIE = "wcr_session";
const ADMIN_COOKIE = "wcr_admin";
const MAX_AGE = 60 * 60 * 12; // 12時間

export type UserSession = { accountId: string; loginId: string; companyName: string };
export type AdminSession = { adminId: string; loginId: string };

async function sign(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET);
}

async function read<T>(name: string): Promise<T | null> {
  const jar = await cookies();
  const token = jar.get(name)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as T;
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  };
}

export async function createUserSession(s: UserSession) {
  (await cookies()).set(USER_COOKIE, await sign({ ...s }), cookieOptions());
}
export async function createAdminSession(s: AdminSession) {
  (await cookies()).set(ADMIN_COOKIE, await sign({ ...s }), cookieOptions());
}
export const getUserSession = () => read<UserSession>(USER_COOKIE);
export const getAdminSession = () => read<AdminSession>(ADMIN_COOKIE);

export async function destroyUserSession() {
  (await cookies()).delete(USER_COOKIE);
}
export async function destroyAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
