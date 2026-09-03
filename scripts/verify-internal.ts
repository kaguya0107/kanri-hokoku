/**
 * 社内用報告書の確認。
 * B-12（日付つき時間明細・日跨ぎ）と B-19（ステータス4区分）が要点。
 */
import { PrismaClient } from "@prisma/client";
import { formatMinutes, minutesBetween } from "../src/lib/format";

const db = new PrismaClient();
const out: string[] = [];

async function main() {
  // --- 日跨ぎ・複数日の計算 ---
  out.push("時間計算:");
  out.push(`  08:10〜09:40 = ${formatMinutes(minutesBetween("08:10", "09:40"))}`);
  out.push(`  22:00〜01:30 = ${formatMinutes(minutesBetween("22:00", "01:30"))}  ← 日跨ぎ`);
  out.push(`  09:00〜09:00 = ${formatMinutes(minutesBetween("09:00", "09:00"))}`);
  out.push(`  未入力       = ${formatMinutes(minutesBetween("", "17:00"))}`);

  const account = await db.account.findUniqueOrThrow({ where: { accountId: "ABC000" } });
  const hospital = await db.hospital.findFirstOrThrow();

  const report = await db.report.create({
    data: {
      uuid: crypto.randomUUID(), accountId: account.id, hospitalId: hospital.id,
      hospitalName: hospital.name, createdDate: new Date("2026-09-03"),
      workDateFrom: new Date("2026-09-01"), workDateTo: new Date("2026-09-02"),
      workPlace: "4階 中央無菌室", workTitle: "検証用", workerNames: ["鈴木太郎"],
      status: "SUBMITTED", submittedAt: new Date(), reportNo: 9999,
    },
  });

  const internal = await db.internalReport.create({
    data: {
      reportId: report.id,
      remainingWork: "3階west側の風速調整は部材入荷待ちのため未着手。",
      salesApproach: "来期の更新工事について施設課より打診あり。",
      remarks: "入館証は警備室で受取。",
      workTimes: {
        create: [
          { workDate: new Date("2026-09-01"), goStart: "08:10", goEnd: "09:40", workStart: "09:50", workEnd: "17:30", backStart: "17:45", backEnd: "19:10", sortOrder: 0 },
          { workDate: new Date("2026-09-02"), goStart: "08:00", goEnd: "09:20", workStart: "09:30", workEnd: "22:00", backStart: "22:15", backEnd: "01:30", sortOrder: 1 },
        ],
      },
    },
    include: { workTimes: true },
  });

  const travel = internal.workTimes.reduce((s, t) => s + minutesBetween(t.goStart, t.goEnd) + minutesBetween(t.backStart, t.backEnd), 0);
  const work = internal.workTimes.reduce((s, t) => s + minutesBetween(t.workStart, t.workEnd), 0);
  out.push(`複数日の集計: ${internal.workTimes.length}日分 → 移動 ${formatMinutes(travel)} / 作業 ${formatMinutes(work)}`);
  out.push(`  2日目の復路 22:15〜01:30 が ${formatMinutes(minutesBetween("22:15", "01:30"))} として加算されている`);

  // --- 再手配部材のスナップショット ---
  const parts = await db.part.findMany({ take: 2, orderBy: { code: "asc" } });
  await db.internalReorderItem.createMany({
    data: parts.map((p, i) => ({
      internalReportId: internal.id, partId: p.id, partCode: p.code,
      partName: p.name, unit: p.unit, quantity: i + 1, sortOrder: i,
    })),
  });
  out.push(`再手配部材: ${await db.internalReorderItem.count({ where: { internalReportId: internal.id } })}件（1万件マスタから選択）`);

  // --- ステータス遷移（B-19） ---
  const steps: string[] = [report.status];
  await db.report.update({ where: { id: report.id }, data: { status: "INTERNAL" } });
  steps.push("INTERNAL");
  await db.report.update({ where: { id: report.id }, data: { status: "COMPLETED", completedAt: new Date() } });
  steps.push("COMPLETED");
  out.push(`ステータス遷移: ${steps.join(" → ")}（概要書の完／－の2値では表現できない中間状態を保持）`);

  // 後片付け
  await db.report.delete({ where: { id: report.id } });
  out.push("後片付け完了");
  console.log(out.join("\n"));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
