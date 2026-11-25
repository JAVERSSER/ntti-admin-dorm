import { NextResponse, type NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { currentMonth, formatDateTime, monthRange } from "@/lib/format";
import { matchPayments, nameKey, type SubmissionLite } from "@/lib/match";
import { toCsv } from "@/lib/csv";
import { RESIDENT_COLUMNS } from "@/lib/resident-csv";
import type { DormResident } from "@/lib/types";

const LABEL = { paid: "Paid", pending: "Waiting review", rejected: "Rejected", unpaid: "Not paid" } as const;

/** Download the resident list with each person's payment status for the month (CSV). */
export async function GET(req: NextRequest) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const month = monthRange(sp.get("month") ?? "") ? sp.get("month")! : currentMonth();
  const range = monthRange(month)!;
  const room = sp.get("room") ?? "";
  const pay = sp.get("pay") ?? "";
  const moved = sp.get("show") === "moved";
  const q = nameKey(sp.get("q") ?? "");

  const supabase = await createClient();
  const [residentsRes, subsRes] = await Promise.all([
    supabase.from("dorm_residents").select("*").order("room").order("full_name").limit(5000),
    supabase
      .from("payment_submissions")
      .select("id, room, student_name, status, created_at")
      .eq("for_month", `${month}-01`)
      .limit(5000),
  ]);
  const error = residentsRes.error ?? subsRes.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all = (residentsRes.data ?? []) as DormResident[];
  const active = all.filter((r) => r.is_active);
  const { result } = matchPayments(active, (subsRes.data ?? []) as SubmissionLite[]);
  const rows = (moved ? all.filter((r) => !r.is_active) : active).filter((r) => {
    if (room && r.room !== room) return false;
    if (q && !nameKey(r.full_name).includes(q)) return false;
    if (pay && !moved && !(pay === "notpaid" ? ["unpaid", "rejected"].includes(result.get(r.id)?.state ?? "") : result.get(r.id)?.state === pay)) return false;
    return true;
  });

  const csv = toCsv([
    [...RESIDENT_COLUMNS, `status (${range.label})`, "submitted_at"],
    ...rows.map((r) => {
      const m = result.get(r.id);
      return [
        r.room, r.full_name, r.degree, r.major, r.grade, r.institution, r.note,
        r.is_active ? LABEL[m?.state ?? "unpaid"] : "Moved out",
        m?.submission ? formatDateTime(m.submission.created_at) : "",
      ];
    }),
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="residents-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
