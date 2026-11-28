"use client";

import { useMemo, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CheckCircle2, UserX, Users } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { nameKey, type PayState } from "@/lib/match";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { SortableTable } from "@/components/ui/sortable-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ResidentFormButton } from "./resident-form";
import { setResidentActive } from "./actions";
import type { DormResident } from "@/lib/types";

const STATES: Record<PayState, { label: string; tone: "green" | "yellow" | "red" | "gray" }> = {
  paid: { label: "Paid", tone: "green" },
  pending: { label: "Waiting review", tone: "yellow" },
  rejected: { label: "Rejected", tone: "red" },
  unpaid: { label: "Not paid", tone: "gray" },
};

/** Sort order for the payment column: paid first, then waiting, rejected, not paid. */
const STATE_ORDER: Record<PayState, number> = { paid: 0, pending: 1, rejected: 2, unpaid: 3 };

/** Payment filter values, also used by the stat cards: "notpaid" = no payment or rejected. */
const PAY_FILTERS = [
  { value: "paid", label: "Paid" },
  { value: "notpaid", label: "Not paid" },
] as const;
type PayFilter = (typeof PAY_FILTERS)[number]["value"] | "";

function payMatches(state: PayState | null, pay: PayFilter): boolean {
  return pay === "notpaid" ? state === "unpaid" || state === "rejected" : state === pay;
}

export type ResidentRow = DormResident & {
  /** Payment state for the month; null for moved-out residents. */
  state: PayState | null;
  /** When the matching screenshot was sent, already formatted. */
  submittedAt: string | null;
  /** Room the screenshot was sent as, when it differs from the resident's room. */
  sentAsRoom: string | null;
};

/**
 * Cards and filters run in the browser: the server sends every resident with their
 * payment state for the month once, so clicking a card or changing a filter needs no page load.
 */
export function ResidentsBoard({
  rows,
  periodLabel,
  rooms,
  schools,
  grades,
  degrees,
  monthSelect,
  notice,
}: {
  rows: ResidentRow[];
  periodLabel: string;
  rooms: string[];
  schools: string[];
  grades: string[];
  degrees: string[];
  monthSelect: ReactNode;
  /** Shown between the cards and the table. */
  notice?: ReactNode;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const payParam = params.get("pay") ?? "";
  const pay: PayFilter = PAY_FILTERS.some((f) => f.value === payParam) ? (payParam as PayFilter) : "";
  const room = params.get("room") ?? "";
  const school = params.get("school") ?? "";
  const grade = params.get("grade") ?? "";
  const showMoved = params.get("show") === "moved";
  const q = nameKey(params.get("q") ?? "");

  const active = useMemo(() => rows.filter((r) => r.is_active), [rows]);
  const moved = useMemo(() => rows.filter((r) => !r.is_active), [rows]);
  const counts = useMemo(() => {
    const c: Record<PayState, number> = { paid: 0, pending: 0, rejected: 0, unpaid: 0 };
    for (const r of active) if (r.state) c[r.state] += 1;
    return c;
  }, [active]);

  const visible = useMemo(
    () =>
      (showMoved ? moved : active).filter((r) => {
        if (room && r.room !== room) return false;
        if (school && r.institution !== school) return false;
        if (grade && r.grade !== grade) return false;
        if (q && !nameKey(r.full_name).includes(q)) return false;
        if (pay && !showMoved && !payMatches(r.state, pay)) return false;
        return true;
      }),
    [active, moved, showMoved, room, school, grade, q, pay],
  );

  // Update the address bar without asking the server for a new page.
  function choosePay(next: PayFilter) {
    const sp = new URLSearchParams(params.toString());
    if (next) sp.set("pay", next);
    else sp.delete("pay");
    sp.delete("show");
    window.history.pushState(null, "", sp.size ? `${pathname}?${sp}` : pathname);
  }

  const onList = !showMoved;
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Residents" value={formatNumber(active.length)} icon={<Users className="h-5 w-5" />} accent="blue" hint={periodLabel} onClick={() => choosePay("")} selected={onList && !pay} />
        <StatCard label="Paid" value={formatNumber(counts.paid)} icon={<CheckCircle2 className="h-5 w-5" />} accent="green" onClick={() => choosePay("paid")} selected={onList && pay === "paid"} />
        <StatCard
          label="Not paid"
          value={formatNumber(counts.unpaid + counts.rejected)}
          icon={<UserX className="h-5 w-5" />}
          accent="red"
          hint={counts.rejected ? `${counts.rejected} rejected` : undefined}
          onClick={() => choosePay("notpaid")}
          selected={onList && pay === "notpaid"}
        />
      </div>

      {notice}

      <Card>
        <FilterBar
          local
          searchPlaceholder="Search name…"
          filters={[
            { name: "pay", label: "Payment", options: PAY_FILTERS.map((s) => ({ value: s.value, label: s.label })) },
            { name: "room", label: "Room", options: rooms.map((r) => ({ value: r, label: r })) },
            { name: "school", label: "School", options: schools.map((s) => ({ value: s, label: s })) },
            { name: "grade", label: "Grade", options: grades.map((g) => ({ value: g, label: g })) },
            { name: "show", label: "List", options: [{ value: "moved", label: "Moved out" }] },
          ]}
        >
          {monthSelect}
        </FilterBar>

        {visible.length === 0 ? (
          <EmptyState title="No residents found" description="Try another filter, or add residents." />
        ) : (
          <SortableTable
            columns={[
              { label: "Room", sortable: true, cellClassName: "font-semibold text-slate-900" },
              { label: "Name", sortable: true },
              { label: "Degree / Major / Grade", sortable: true },
              { label: "School", sortable: true },
              { label: periodLabel, sortable: true },
              { label: "Actions", className: "text-right" },
            ]}
            rows={visible.map((r) => {
              const st = r.state ? STATES[r.state] : null;
              return {
                key: r.id,
                values: [r.room, r.full_name, r.major ?? [r.degree, r.grade].filter(Boolean).join(" "), r.institution, r.is_active && r.state ? STATE_ORDER[r.state] : 9],
                cells: [
                  r.room,
                  <>
                    <div className="font-medium text-slate-900">{r.full_name}</div>
                    {r.note && <div className="text-xs text-slate-500">{r.note}</div>}
                  </>,
                  <>
                    <div>{r.major ?? "—"}</div>
                    <div className="text-xs text-slate-500">{[r.degree, r.grade].filter(Boolean).join(" · ")}</div>
                  </>,
                  r.institution ?? "—",
                  r.is_active && st ? (
                    <div>
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {r.submittedAt && (
                        <div className="mt-0.5 text-xs text-slate-500">
                          {r.submittedAt}
                          {r.sentAsRoom && ` · sent as room ${r.sentAsRoom}`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Badge>Moved out</Badge>
                  ),
                  <div key="a" className="flex justify-end gap-1">
                    <ResidentFormButton resident={r} rooms={rooms} schools={schools} grades={grades} degrees={degrees} />
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
                  </div>,
                ],
              };
            })}
          />
        )}
      </Card>
    </>
  );
}
