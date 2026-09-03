/** メール入力の検証。ヘッダインジェクション（CRLF混入）を弾けるかが要点。 */
import { z } from "zod";

const noCRLF = (s: string) => !/[\r\n]/.test(s);

const addressList = z
  .string().trim()
  .refine(noCRLF, "改行を含めることはできません")
  .transform((s) => s.split(/[,;]/).map((a) => a.trim()).filter(Boolean))
  .refine((list) => list.every((a) => z.string().email().safeParse(a).success), {
    message: "メールアドレスの形式が正しくありません（例: xxx@xxx.xx）",
  });

const schema = z.object({
  to: addressList.refine((l) => l.length >= 1, "送信先を入力してください")
                 .refine((l) => l.length <= 10, "送信先は10件までです"),
  cc: z.union([addressList, z.literal("").transform(() => [] as string[])]),
  subject: z.string().trim().min(1).max(120).refine(noCRLF, "件名に改行を含めることはできません"),
  body: z.string().trim().max(4000),
});

const cases: [string, Record<string, string>][] = [
  ["正常（単一宛先）", { to: "shisetsu@example.ac.jp", cc: "", subject: "作業完了報告書", body: "本文" }],
  ["正常（複数宛先）", { to: "a@example.jp, b@example.jp", cc: "c@example.jp", subject: "作業完了報告書", body: "本文" }],
  ["ヘッダ注入・宛先", { to: "a@example.jp\nBcc: attacker@evil.example", cc: "", subject: "件名", body: "本文" }],
  ["ヘッダ注入・CR", { to: "a@example.jp\r\nBcc: attacker@evil.example", cc: "", subject: "件名", body: "本文" }],
  ["ヘッダ注入・件名", { to: "a@example.jp", cc: "", subject: "件名\nBcc: attacker@evil.example", body: "本文" }],
  ["ヘッダ注入・CC", { to: "a@example.jp", cc: "b@example.jp\nBcc: x@evil.example", subject: "件名", body: "本文" }],
  ["不正な形式", { to: "not-an-email", cc: "", subject: "件名", body: "本文" }],
  ["宛先が空", { to: "", cc: "", subject: "件名", body: "本文" }],
  ["宛先が多すぎる", { to: Array.from({ length: 11 }, (_, i) => `u${i}@example.jp`).join(","), cc: "", subject: "件名", body: "本文" }],
];

for (const [label, input] of cases) {
  const r = schema.safeParse(input);
  const mark = r.success ? "通過" : "拒否";
  const detail = r.success
    ? `to=${r.data.to.length}件 cc=${r.data.cc.length}件`
    : r.error.issues[0].message;
  console.log(`${mark}  ${label.padEnd(18, "　")} ${detail}`);
}
