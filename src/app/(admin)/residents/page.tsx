import Link from "next/link";
import { CheckCircle2, Clock, UserX, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { currentMonth, formatDateTime, formatNumber, DEGREES, monthOptions, monthRange } from "@/lib/format";
import { matchPayments, nameKey, type PayState, type SubmissionLite } from "@/lib/match";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, Th, Td, Tr } from "@/components/ui/table";
import { EmptyState, ErrorNotice } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { MonthSelect } from "../payments/month-select";
import { gradeNames } from "@/lib/grades";
import { ResidentFormButton } from "./resident-form";
import { ExportButton, UploadButton } from "./import-export";
import { setResidentActive } from "./actions";
import type { DormResident } from "@/lib/types";


const STATES: { value: PayState; label: string; tone: "green" | "yellow" | "red" | "gray" }[] = [
  { value: "paid", label: "Paid", tone: "green" },
  { value: "pending", label: "Waiting review", tone: "yellow" },
  { value: "rejected", label: "Rejected", tone: "red" },
  { value: "unpaid", label: "Not paid", tone: "gray" },
];

/** Payment filter values: the four states plus "notpaid" (no payment or rejected), used by the "Not paid" card. */
const PAY_FILTERS = [
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Waiting review" },
  { value: "notpaid", label: "Not paid (all)" },
  { value: "unpaid", label: "No submission" },
  { value: "rejected", label: "Rejected" },
] as const;
type PayFilter = (typeof PAY_FILTERS)[number]["value"];

function payMatches(state: PayState | undefined, pay: PayFilter): boolean {
  return pay === "notpaid" ? state === "unpaid" || state === "rejected" : state === pay;
}

function one(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function ResidentsPage({ searchParams }: PageProps<"/residents">) {
  const sp = await searchParams;
  const monthParam = monthRange(one(sp.month)) ? one(sp.month) : currentMonth();
  const range = monthRange(monthParam)!;
  const pay = PAY_FILTERS.some((s) => s.value === one(sp.pay)) ? (one(sp.pay) as PayFilter) : "";
  const room = one(sp.room);
  const showMoved = one(sp.show) === "moved";
  const q = nameKey(one(sp.q));

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

  const counts: Record<PayState, number> = { paid: 0, pending: 0, rejected: 0, unpaid: 0 };
  for (const r of active) counts[result.get(r.id)!.state] += 1;

  const rows = (showMoved ? all.filter((r) => !r.is_active) : active).filter((r) => {
    if (room && r.room !== room) return false;
    if (q && !nameKey(r.full_name).includes(q)) return false;
    if (pay && !showMoved && !payMatches(result.get(r.id)?.state, pay)) return false;
    return true;
  });

  const roomNames = [...new Set([...(roomsRes.data ?? []).map((r) => r.name as string), ...all.map((r) => r.room)])].sort();
  const schools = (schoolsRes.data ?? []).map((s) => s.code as string);
  const degrees = DEGREES;
  const months = monthOptions(24);
  if (!months.some((m) => m.value === monthParam)) months.push({ value: monthParam, label: range.label });
  const error = residentsRes.error ?? subsRes.error;

  // Stat cards act as quick filters: keep month/room/search, set the payment filter, leave the moved-out list.
  const cardHref = (p: PayFilter | "") => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && !["pay", "show", "page"].includes(k)) next.set(k, v);
    if (p) next.set("pay", p);
    return next.size ? `/residents?${next}` : "/residents";
  };
  const cardSelected = (p: PayFilter | "") => !showMoved && pay === p;

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

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Residents" value={formatNumber(active.length)} icon={<Users className="h-5 w-5" />} accent="blue" hint={range.label} href={cardHref("")} selected={cardSelected("")} />
        <StatCard label="Paid" value={formatNumber(counts.paid)} icon={<CheckCircle2 className="h-5 w-5" />} accent="green" href={cardHref("paid")} selected={cardSelected("paid")} />
        <StatCard label="Waiting review" value={formatNumber(counts.pending)} icon={<Clock className="h-5 w-5" />} accent="amber" href={cardHref("pending")} selected={cardSelected("pending")} />
        <StatCard label="Not paid" value={formatNumber(counts.unpaid + counts.rejected)} icon={<UserX className="h-5 w-5" />} accent="red" hint={counts.rejected ? `${counts.rejected} rejected` : undefined} href={cardHref("notpaid")} selected={cardSelected("notpaid")} />
      </div>

      {unmatched.length > 0 && (
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
                  href={`/payments?status=all&month=${monthParam}&q=${encodeURIComponent(s.student_name)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">{s.student_name}</span>
                  <span className="text-slate-500">· {s.room} · {s.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <FilterBar
          searchPlaceholder="Search name…"
          filters={[
            { name: "pay", label: "Payment", options: PAY_FILTERS.map((s) => ({ value: s.value, label: s.label })) },
            { name: "room", label: "Room", options: roomNames.map((r) => ({ value: r, label: r })) },
            { name: "show", label: "List", options: [{ value: "moved", label: "Moved out" }] },
          ]}
        >
          <MonthSelect value={monthParam} options={months} withAll={false} />
        </FilterBar>

        {rows.length === 0 ? (
          <EmptyState title="No residents found" description="Try another filter, or add residents." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Room</Th>
                <Th>Name</Th>
                <Th>Degree / Major / Grade</Th>
                <Th>School</Th>
                <Th>{range.label}</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {rows.map((r) => {
                const m = result.get(r.id);
                const st = STATES.find((s) => s.value === m?.state);
                return (
                  <Tr key={r.id}>
                    <Td className="font-semibold text-slate-900">{r.room}</Td>
                    <Td>
                      <div className="font-medium text-slate-900">{r.full_name}</div>
                      {r.note && <div className="text-xs text-slate-500">{r.note}</div>}
                    </Td>
                    <Td>
                      <div>{r.major ?? "—"}</div>
                      <div className="text-xs text-slate-500">{[r.degree, r.grade].filter(Boolean).join(" · ")}</div>
                    </Td>
                    <Td>{r.institution ?? "—"}</Td>
                    <Td>
                      {r.is_active && st ? (
                        <div>
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {m?.submission && (
                            <div className="mt-0.5 text-xs text-slate-500">
                              {formatDateTime(m.submission.created_at)}
                              {m.otherRoom && ` · sent as room ${m.submission.room}`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Badge>Moved out</Badge>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <ResidentFormButton resident={r} rooms={roomNames} schools={schools} grades={grades} degrees={degrees} />
                        <ConfirmAction
                          action={setResidentActive.bind(null, r.id, !r.is_active)}
                          title={r.is_active ? `Mark ${r.full_name} as moved out?` : `Move ${r.full_name} back in?`}
                          description={
                            r.is_active
                              ? "They will no longer be counted as unpaid. Past payments are kept."
                              : "They will be counted in the monthly paid / not paid list again."
                          }
                          confirmLabel={r.is_active ? "Moved out" : "Move back in"}
                          confirmVariant={r.is_active ? "danger" : "primary"}
                          variant="ghost"
                        >
                          {r.is_active ? "Moved out" : "Move in"}
                        </ConfirmAction>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
