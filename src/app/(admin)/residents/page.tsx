import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { currentMonth, formatDateTime, DEGREES, keptMonths, monthRange } from "@/lib/format";
import { matchPayments, type SubmissionLite } from "@/lib/match";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ErrorNotice } from "@/components/ui/empty-state";
import { MonthSelect } from "../payments/month-select";
import { gradeNames } from "@/lib/grades";
import { ResidentFormButton } from "./resident-form";
import { ExportButton, UploadButton } from "./import-export";
import { ResidentsBoard, type ResidentRow } from "./residents-board";
import type { DormResident } from "@/lib/types";

function one(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function ResidentsPage({ searchParams }: PageProps<"/residents">) {
  const sp = await searchParams;
  // Payments older than the 3 kept months are deleted automatically, so only those months are offered.
  const months = keptMonths();
  const monthParam = months.some((m) => m.value === one(sp.month)) ? one(sp.month) : currentMonth();
  const range = monthRange(monthParam)!;

  const supabase = await createClient();
  const [residentsRes, subsRes, roomsRes, schoolsRes, grades] = await Promise.all([
    supabase.from("dorm_residents").select("*").order("room").order("full_name").limit(2000),
    supabase
      .from("payment_submissions")
      .select("id, room, student_name, status, created_at")
      .eq("for_month", `${monthParam}-01`)
      .limit(5000),
    supabase.from("rooms").select("name").order("name"),
    supabase.from("institutions").select("code").order("code"),
    gradeNames(supabase),
  ]);

  const all = (residentsRes.data ?? []) as DormResident[];
  const active = all.filter((r) => r.is_active);
  const { result, unmatched } = matchPayments(active, (subsRes.data ?? []) as SubmissionLite[]);

  const boardRows: ResidentRow[] = all.map((r) => {
    const m = r.is_active ? result.get(r.id) : undefined;
    return {
      ...r,
      state: m?.state ?? null,
      submittedAt: m?.submission ? formatDateTime(m.submission.created_at) : null,
      sentAsRoom: m?.otherRoom && m.submission ? m.submission.room : null,
    };
  });

  const roomNames = [...new Set([...(roomsRes.data ?? []).map((r) => r.name as string), ...all.map((r) => r.room)])].sort();
  const schools = (schoolsRes.data ?? []).map((s) => s.code as string);
  const degrees = DEGREES;
  const error = residentsRes.error ?? subsRes.error;

  return (
    <>
      <PageHeader
        title="Residents"
        description={`Who has paid for ${range.label}. A resident counts as paid when a screenshot with their name was approved.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportButton />
            <UploadButton />
            <ResidentFormButton rooms={roomNames} schools={schools} grades={grades} degrees={degrees} />
          </div>
        }
      />
      {error && <ErrorNotice message={error.message} />}

      <ResidentsBoard
        rows={boardRows}
        periodLabel={range.label}
        rooms={roomNames}
        schools={schools}
        grades={grades}
        degrees={degrees}
        monthSelect={<MonthSelect value={monthParam} options={months} withAll={false} />}
        notice={
          unmatched.length > 0 && (
            <Card className="mb-6 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {unmatched.length} payment{unmatched.length > 1 ? "s" : ""} this month did not match any resident
              </p>
              <p className="mt-1 text-xs text-slate-500">
                The name is spelled differently or the person is not on the list. Fix the spelling with Edit, or add them.
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {unmatched.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/payments?${s.status === "approved" ? "" : "status=notpaid&"}month=${monthParam}&q=${encodeURIComponent(s.student_name)}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-900">{s.student_name}</span>
                      <span className="text-slate-500">· {s.room} · {s.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )
        }
      />
    </>
  );
}
