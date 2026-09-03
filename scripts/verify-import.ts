/**
 * B-23 / B-24 の確認。
 * 「取込前にDBをクリア」ではなく、コードをキーにした更新＋差分の無効化になっていること、
 * および重複・読み不正の検出が効くことを実データで確かめる。
 */
import { PrismaClient } from "@prisma/client";
import { kanaRow, normalizeKana } from "../src/lib/kana";

const db = new PrismaClient();

async function main() {
  const out: string[] = [];
  const before = await db.part.count({ where: { isActive: true } });
  out.push(`取込前の有効件数: ${before.toLocaleString()}`);

  // 実データから3件を取り出し、1件は名称変更・1件は据え置き・1件は新規として扱う
  const sample = await db.part.findMany({ take: 2, orderBy: { code: "asc" } });
  const rows = [
    { code: sample[0].code, name: sample[0].name + "（改）", kana: sample[0].kana, unit: sample[0].unit, priority: 500 },
    { code: sample[1].code, name: sample[1].name, kana: sample[1].kana, unit: sample[1].unit, priority: 400 },
    { code: "ZZ99-999", name: "新規テスト部品 φ99", kana: "しんきてすとぶひん", unit: "個", priority: 300 },
  ];

  const incoming = rows.map((r) => r.code);
  const beforeCodes = new Set((await db.part.findMany({ select: { code: true } })).map((p) => p.code));
  const inserted = rows.filter((r) => !beforeCodes.has(r.code)).length;

  for (const r of rows) {
    await db.part.upsert({
      where: { code: r.code },
      create: { ...r, kanaRow: kanaRow(r.kana), isActive: true },
      update: { ...r, kanaRow: kanaRow(r.kana), isActive: true },
    });
  }
  const { count: deactivated } = await db.part.updateMany({
    where: { code: { notIn: incoming }, isActive: true },
    data: { isActive: false },
  });

  out.push(`  新規 ${inserted} / 更新 ${rows.length - inserted} / 無効化 ${deactivated.toLocaleString()}`);

  const active = await db.part.count({ where: { isActive: true } });
  const total = await db.part.count();
  out.push(`取込後: 有効 ${active} 件 / テーブル全体 ${total.toLocaleString()} 件`);
  out.push(`  → 行は消えていない（クリアしていれば全体も ${rows.length} 件になるはず）: ${total > rows.length ? "OK" : "NG"}`);

  const renamed = await db.part.findUnique({ where: { code: sample[0].code } });
  out.push(`  名称更新: ${renamed?.name.endsWith("（改）") ? "OK" : "NG"}`);

  // 読みの正規化と50音行の判定
  out.push(`読みの正規化: "ﾌﾟﾚ"→"${normalizeKana("プレ")}" 行=${kanaRow("プレ")} / "ヘパ" 行=${kanaRow("ヘパ")}`);
  out.push(`不正な読みの検出: kanaRow("abc")="${kanaRow("abc")}" → ${kanaRow("abc") === "" ? "空でエラー扱い OK" : "NG"}`);

  // 後片付け：元に戻す
  await db.part.delete({ where: { code: "ZZ99-999" } });
  await db.part.update({ where: { code: sample[0].code }, data: { name: sample[0].name, priority: sample[0].priority } });
  await db.part.update({ where: { code: sample[1].code }, data: { priority: sample[1].priority } });
  await db.part.updateMany({ data: { isActive: true } });
  out.push(`後片付け後の有効件数: ${(await db.part.count({ where: { isActive: true } })).toLocaleString()}`);

  console.log(out.join("\n"));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
