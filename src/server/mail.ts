"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { toISODate } from "@/lib/format";
import { pdfFilename, renderPdf } from "@/lib/pdf";
import { customerReportHtml } from "@/lib/report-html";
import { loadForPdf } from "@/lib/report-pdf-data";
import { getUserSession } from "@/lib/session";

export type MailState = { error?: string; ok?: string };

/**
 * メールヘッダインジェクション対策。
 * 宛先・件名は自由入力のため、改行が混ざるとヘッダを追加されうる。
 */
const noCRLF = (s: string) => !/[\r\n]/.test(s);

const addressList = z
  .string()
  .trim()
  .refine(noCRLF, "改行を含めることはできません")
  .transform((s) => s.split(/[,;]/).map((a) => a.trim()).filter(Boolean))
  .refine((list) => list.every((a) => z.string().email().safeParse(a).success), {
    message: "メールアドレスの形式が正しくありません（例: xxx@xxx.xx）",
  });

const schema = z.object({
  to: addressList.refine((l) => l.length >= 1, "送信先を入力してください")
                 .refine((l) => l.length <= 10, "送信先は10件までです"),
  cc: z.union([addressList, z.literal("").transform(() => [] as string[])]),
  subject: z.string().trim().min(1, "件名を入力してください").max(120).refine(noCRLF, "件名に改行を含めることはできません"),
  body: z.string().trim().max(4000),
});

/** 直近1時間の送信数の上限。IDが漏れた際の踏み台利用を抑える。 */
const HOURLY_LIMIT = 20;

export async function sendReportMail(_prev: MailState, fd: FormData): Promise<MailState> {
  const session = await getUserSession();
  if (!session) return { error: "ログインしてください" };

  const id = String(fd.get("id"));
  const parsed = schema.safeParse({
    to: fd.get("to") ?? "",
    cc: fd.get("cc") ?? "",
    subject: fd.get("subject") ?? "",
    body: fd.get("body") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const report = await loadForPdf(id, session.accountId);
  if (!report) return { error: "報告書が見つかりません" };

  const sentLastHour = await db.mailLog.count({
    where: {
      report: { accountId: session.accountId },
      sentAt: { gte: new Date(Date.now() - 3_600_000) },
    },
  });
  if (sentLastHour >= HOURLY_LIMIT) {
    return { error: `送信数の上限に達しました（1時間あたり${HOURLY_LIMIT}件）。しばらく経ってからお試しください。` };
  }

  const { to, cc, subject, body } = parsed.data;

  try {
    const pdf = await renderPdf(customerReportHtml(report));
    const filename = pdfFilename(report.hospitalName, toISODate(report.workDateFrom), "報告書");

    // 管理者を自動BCCに入れ、送信内容が必ず社内にも残るようにする
    const admin = await db.admin.findFirst({ select: { reportEmail: true } });
    const bcc = admin?.reportEmail ? [admin.reportEmail] : [];

    await deliver({ to, cc, bcc, subject, body, filename, pdf });

    await db.mailLog.create({
      data: {
        reportId: report.id,
        toAddress: to.join(", "),
        ccAddress: cc.join(", "),
        subject,
        body,
        succeeded: true,
      },
    });

    revalidatePath("/reports");
    return { ok: "送信しました" };
  } catch (e) {
    console.error("メール送信に失敗しました", e);
    await db.mailLog.create({
      data: {
        reportId: report.id,
        toAddress: to.join(", "),
        ccAddress: cc.join(", "),
        subject,
        body,
        succeeded: false,
        errorText: e instanceof Error ? e.message : String(e),
      },
    });
    return { error: "送信に失敗しました。通信状況をご確認のうえ、もう一度お試しください。" };
  }
}

/**
 * 実際の配信。SMTPの接続情報が未設定の開発環境では送信せず内容を記録する。
 * 本番では SMTP_URL を設定し、nodemailer 等に差し替える。
 */
async function deliver(msg: {
  to: string[]; cc: string[]; bcc: string[];
  subject: string; body: string; filename: string; pdf: Buffer;
}) {
  if (!process.env.SMTP_URL) {
    console.info(
      `[mail:dev] to=${msg.to.join(",")} cc=${msg.cc.join(",")} bcc=${msg.bcc.join(",")} ` +
      `subject=${JSON.stringify(msg.subject)} attachment=${msg.filename} (${Math.round(msg.pdf.length / 1024)}KB)`,
    );
    return;
  }
  throw new Error("SMTP_URL が設定されていますが、配信処理が未実装です");
}
