import { z } from "zod";

/** 積算時間は0〜100,000h（概要書2-4） */
export const measurementSchema = z.object({
  roomName: z.string().trim().max(60).default(""),
  modelName: z.string().trim().max(80).default(""),
  runningHours: z
    .union([z.coerce.number().int().min(0, "0以上で入力してください").max(100000, "100,000以下で入力してください"), z.literal("")])
    .optional(),
  // 製造No.は6桁（概要書2-4）。英数字とハイフンを許容する。
  serialNo: z
    .string()
    .trim()
    .max(6, "製造No.は6文字以内で入力してください")
    .regex(/^[0-9A-Za-z-]*$/, "製造No.は半角英数字とハイフンで入力してください")
    .default(""),
  manufacturedYm: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2})?$/, "製造年月の形式が正しくありません")
    .default(""),
});

export const basicInfoSchema = z
  .object({
    createdDate: z.string().min(1, "作成日を選択してください"),
    hospitalName: z.string().trim().min(1, "病院名を入力してください").max(120),
    workDateFrom: z.string().min(1, "作業日を選択してください"),
    // B-01: 帳票実物が期間表記のため終了日を持たせる。単日なら空でよい。
    workDateTo: z.string().optional().default(""),
    workPlace: z.string().trim().min(1, "作業場所を入力してください").max(120),
    workerNames: z.array(z.string().trim().min(1)).min(1, "作業者を1名以上選択してください"),
    workTitle: z.string().trim().min(1, "作業件名を入力してください").max(200),
  })
  .refine((v) => !v.workDateTo || v.workDateTo >= v.workDateFrom, {
    message: "終了日は作業日以降の日付を選択してください",
    path: ["workDateTo"],
  });

export const workItemsSchema = z.object({
  items: z.array(z.object({ modelName: z.string().trim().min(1), quantity: z.coerce.number().int().min(0).max(999) })),
  freeWorkNote: z.string().trim().max(500).default(""),
});

export const partItemsSchema = z.object({
  items: z.array(
    z.object({
      partId: z.coerce.number().int().positive(),
      quantity: z.coerce.number().int().min(1).max(9999),
    }),
  ),
  partsFreeNote: z.string().trim().max(500).default(""),
});

export const measurementsSchema = z.object({
  rows: z.array(measurementSchema).max(50, "測定値は50行までです"),
  reportBody: z.string().trim().max(4000).default(""),
});

export const signOffSchema = z.object({
  checkedItems: z.array(z.coerce.number().int()),
  signerName: z.string().trim().min(1, "作業者を選択または入力してください").max(60),
  signatureData: z.string().optional().default(""),
});

export type BasicInfo = z.infer<typeof basicInfoSchema>;
export type MeasurementRow = z.infer<typeof measurementSchema>;
