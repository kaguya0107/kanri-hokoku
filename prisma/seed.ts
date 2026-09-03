import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** 濁点・半濁点・小書きを清音に寄せて50音行を求める（B-09） */
const DAKU: Record<string, string> = {
  が:"か", ぎ:"き", ぐ:"く", げ:"け", ご:"こ", ざ:"さ", じ:"し", ず:"す", ぜ:"せ", ぞ:"そ",
  だ:"た", ぢ:"ち", づ:"つ", で:"て", ど:"と", ば:"は", び:"ひ", ぶ:"ふ", べ:"へ", ぼ:"ほ",
  ぱ:"は", ぴ:"ひ", ぷ:"ふ", ぺ:"へ", ぽ:"ほ",
  ぁ:"あ", ぃ:"い", ぅ:"う", ぇ:"え", ぉ:"お", っ:"つ", ゃ:"や", ゅ:"ゆ", ょ:"よ",
};
const ROWS: Record<string, string> = {
  あ:"あいうえお", か:"かきくけこ", さ:"さしすせそ", た:"たちつてと", な:"なにぬねの",
  は:"はひふへほ", ま:"まみむめも", や:"やゆよ", ら:"らりるれろ", わ:"わをん",
};
export function kanaRow(kana: string): string {
  let c = kana.charAt(0);
  if (DAKU[c]) c = DAKU[c];
  for (const [row, chars] of Object.entries(ROWS)) if (chars.includes(c)) return row;
  return "";
}

const BASES: [string, string, string][] = [
  ["プレフィルター","ぷれふぃるたー","枚"], ["中性能フィルター","ちゅうせいのうふぃるたー","枚"],
  ["HEPAフィルター","へぱふぃるたー","枚"], ["ULPAフィルター","うるぱふぃるたー","枚"],
  ["水フィルター","みずふぃるたー","本"], ["活性炭フィルター","かっせいたんふぃるたー","枚"],
  ["配管キット","はいかんきっと","式"], ["送風機","そうふうき","台"],
  ["スイッチ","すいっち","個"], ["ランプ","らんぷ","個"],
  ["リレー","りれー","個"], ["風速切替基板","ふうそくきりかえきばん","枚"],
  ["制御基板","せいぎょきばん","枚"], ["ファン","ふぁん","個"],
  ["パッキン","ぱっきん","個"], ["Vベルト","ぶいべると","本"],
  ["モーター","もーたー","台"], ["ダンパー","だんぱー","個"],
  ["ドアクローザー","どあくろーざー","個"], ["ガスケット","がすけっと","個"],
  ["電磁弁","でんじべん","個"], ["圧力計","あつりょくけい","個"],
  ["温度センサー","おんどせんさー","個"], ["差圧計","さあつけい","個"],
  ["インバータ","いんばーた","台"], ["タイマー","たいまー","個"],
  ["ヒューズ","ひゅーず","個"], ["端子台","たんしだい","個"],
  ["制御ケーブル","せいぎょけーぶる","本"], ["ドレンホース","どれんほーす","本"],
  ["カプラ","かぷら","個"], ["ノズル","のずる","個"],
  ["循環ポンプ","じゅんかんぽんぷ","台"], ["コンプレッサー","こんぷれっさー","台"],
  ["ドレンパン","どれんぱん","個"], ["加湿器","かしつき","台"],
  ["消音器","しょうおんき","個"], ["吹出グリル","ふきだしぐりる","個"],
  ["ルーバー","るーばー","個"], ["ハンドル","はんどる","個"],
  ["ヒンジ","ひんじ","個"], ["ゴムシート","ごむしーと","枚"],
  ["締付ボルト","しめつけぼると","本"], ["六角ナット","ろっかくなっと","個"],
  ["安全カバー","あんぜんかばー","枚"], ["表示灯","ひょうじとう","個"],
  ["操作パネル","そうさぱねる","枚"], ["電源ユニット","でんげんゆにっと","台"],
  ["冷却コイル","れいきゃくこいる","個"], ["加熱コイル","かねつこいる","個"],
];
const SPECS = ["610×610×290","610×305×290","500×500×150","φ25","φ32","φ50","100V","200V","24V","1/2B","3/4B","M8","M10","L=750","L=1200","20A","30A","4P","6P","標準品"];
const FORS  = ["MIU-201用","MIU-401用","MDF用","RX用","LI-11用","LI-30用","保冷庫用","保温庫用","共通","汎用"];

const MODELS = ["無菌病室 MIU-201","無菌病室 MIU-401","MDF","RX","LI-11","LI-12","LI-13","LI-32","LI-30","保冷庫","保温庫","アイソレーション盤"];
const HOSPITALS = ["〇〇市立総合病院","△△病院 東病棟","市立中央病院","□□記念病院","××総合病院","南北総合病院","〇〇大学附属病院"];
const NOTES = [
  "水フィルター等、消耗部品は交換いたしました。",
  "BCR3シャワーパンのゆるみ、BCR5、入口扉の動きは修正し動作良好です。その他、特に問題ありません。",
  "室内清浄度はFDS209Dにてクラス100、および150にてクラス5をクリアーし良好です。",
  "各部の運転音・振動に異常はありませんでした。",
  "次回点検時に風速切替基板の交換を推奨いたします。",
];
const CONFIRMS = [
  "予定の作業はすべて終了しました",
  "作業前の状態に復旧したことを確認しました",
  "作業により発生した廃材はすべて持ち帰りました",
  "設備の運転状態が正常であることを確認しました",
  "次回点検の予定について申し送りをしました",
];
const WORKERS = ["鈴木太郎","加藤次郎","山本直人","神保進之介","小田雄一","浅香光男","米窪花子"];

async function main() {
  console.log("seeding…");

  // 冪等にするため既存を削除（依存順）
  await prisma.mailLog.deleteMany();
  await prisma.internalWorkTime.deleteMany();
  await prisma.internalReorderItem.deleteMany();
  await prisma.internalReport.deleteMany();
  await prisma.reportMeasurement.deleteMany();
  await prisma.reportPartItem.deleteMany();
  await prisma.reportWorkItem.deleteMany();
  await prisma.report.deleteMany();
  await prisma.reportNoteTemplate.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.account.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.part.deleteMany();
  await prisma.equipmentModel.deleteMany();
  await prisma.noteTemplate.deleteMany();
  await prisma.confirmItem.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.reportCounter.deleteMany();

  const hash = await bcrypt.hash("demopass", 10);

  const account = await prisma.account.create({
    data: {
      accountId: "ABC000",
      passwordHash: hash,
      companyName: "株式会社アルファ設備",
      email: "info@alpha-setsubi.example.jp",
      workers: { create: WORKERS.map((name, i) => ({ name, sortOrder: i })) },
      reportNotes: { create: [{ body: "当社標準の清掃手順にて実施しました。" }] },
    },
  });

  await prisma.admin.create({
    data: { accountId: "admin", passwordHash: hash, reportEmail: "kanri@example.co.jp" },
  });

  await prisma.hospital.createMany({
    data: HOSPITALS.map((name) => ({ name })),
  });
  await prisma.equipmentModel.createMany({
    data: MODELS.map((name, i) => ({ name, sortOrder: i })),
  });
  await prisma.noteTemplate.createMany({
    data: NOTES.map((body, i) => ({ body, sortOrder: i })),
  });
  await prisma.confirmItem.createMany({
    data: CONFIRMS.map((body, i) => ({ body, sortOrder: i })),
  });
  await prisma.reportCounter.create({ data: { id: 1, lastNo: 1000 } });

  // 交換部品 10,000件（50基材 × 200バリエーション）
  const parts: { code: string; name: string; kana: string; kanaRow: string; unit: string; priority: number }[] = [];
  BASES.forEach(([name, kana, unit], b) => {
    for (let v = 0; v < 200; v++) {
      const code = String.fromCharCode(65 + (b % 26)) + String(b + 1).padStart(2, "0") + "-" + String(v + 1).padStart(3, "0");
      parts.push({
        code,
        name: `${name} ${SPECS[v % SPECS.length]} ${FORS[(v + b) % FORS.length]}`,
        kana,
        kanaRow: kanaRow(kana),
        unit,
        priority: v === 0 ? 9999 - b : 0,
      });
    }
  });
  for (let i = 0; i < parts.length; i += 1000) {
    await prisma.part.createMany({ data: parts.slice(i, i + 1000) });
  }

  console.log(`  accounts:1 admins:1 parts:${parts.length} models:${MODELS.length} hospitals:${HOSPITALS.length}`);
  console.log(`  login → user: ABC000 / demopass    admin: admin / demopass`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
