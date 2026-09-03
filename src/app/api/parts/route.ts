import { db } from "@/lib/db";
import { getUserSession } from "@/lib/session";

/**
 * 交換部品の検索（2-3）。
 * 1万件を端末に配らず、検索条件に合う分だけ返す。
 */
export async function GET(req: Request) {
  if (!(await getUserSession())) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const row = (url.searchParams.get("row") ?? "").trim();
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take")) || 60));
  const skip = Math.max(0, Number(url.searchParams.get("skip")) || 0);

  const where = {
    isActive: true,
    ...(row ? { kanaRow: row } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { kana: { contains: q } },
            { code: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    db.part.count({ where }),
    db.part.findMany({
      where,
      orderBy: [{ priority: "desc" }, { kana: "asc" }, { code: "asc" }],
      skip,
      take,
      select: { id: true, code: true, name: true, kana: true, unit: true },
    }),
  ]);

  return Response.json({ total, items, skip, take });
}
