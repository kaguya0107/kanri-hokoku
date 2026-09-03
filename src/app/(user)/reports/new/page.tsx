import { randomUUID } from "node:crypto";
import { AppHeader } from "@/components/app-header";
import { BasicInfoForm } from "@/components/basic-info-form";
import { REPORT_STEPS, StepBar } from "@/components/ui";
import { toISODate } from "@/lib/format";
import { loadMasters } from "@/lib/report-queries";
import { getUserSession } from "@/lib/session";
import { createReport } from "@/server/reports";

export default async function NewReportPage() {
  const session = (await getUserSession())!;
  const { workerNames, hospitalNames } = await loadMasters(session.accountId);
  const today = toISODate(new Date());

  // A-4: uuid をサーバで先に発行し、フォームに埋め込む。
  // 送信が重複して届いてもサーバ側で1件にまとまる。
  const uuid = randomUUID();

  return (
    <>
      <AppHeader />
      <StepBar steps={REPORT_STEPS} current={0} />
      <main className="flex-1 overflow-y-auto">
        <BasicInfoForm
          action={createReport}
          storageKey={`wcr:new:${uuid}`}
          defaults={{
            uuid,
            createdDate: today,
            hospitalName: "",
            workDateFrom: today,
            workDateTo: "",
            workPlace: "",
            workerNames: [],
            workTitle: "",
          }}
          workers={workerNames}
          hospitals={hospitalNames}
          backHref="/dashboard"
        />
      </main>
    </>
  );
}
