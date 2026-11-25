import { after } from "next/server";
import { cleanupOldPayments } from "@/lib/cleanup";
import { createClient } from "@/lib/supabase/server";
import { currentMonth, formatDateTime, formatMonth, keptMonths, monthRange, sanitizeSearch } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { RefreshButton } from "@/components/ui/refresh-button";
import { ErrorNotice } from "@/components/ui/empty-state";
import { MonthSelect } from "./month-select";
import { PaymentsBoard, type BoardRow } from "./payments-board";
import type { PaymentSubmission } from "@/lib/types";

/** Safety cap: 3 kept months × ~500 residents fits well under this. */
const MAX_ROWS = 3000;

function one(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  const sp = await searchParams;
  // Only the last 3 months (this month included) are kept; older payments are deleted automatically.
  after(() => cleanupOldPayments().catch(() => {}));
  const months = keptMonths();
  const monthParam = one(sp.month) || currentMonth();
  const month = monthParam === "all" || months.some((m) => m.value === monthParam) ? monthParam : currentMonth();
  const range = month === "all" ? null : monthRange(month);
  const room = one(sp.room);
  const q = sanitizeSearch(one(sp.q));

  const supabase = await createClient();

  // Every status is loaded at once; the status tabs and paging then work in the browser.
  let list = supabase.from("payment_submissions").select("*");
  if (room) list = list.eq("room", room);
  // "All months" = the kept months only, even before the cleanup has run.
  list = range ? list.eq("for_month", `${month}-01`) : list.gte("for_month", `${months.at(-1)!.value}-01`);
  if (q) list = list.or(`student_name.ilike.%${q}%,reference.ilike.%${q}%`);

  const [listRes, roomsRes] = await Promise.all([
    list.order("created_at", { ascending: false }).limit(MAX_ROWS),
    supabase.from("rooms").select("name").order("name"),
  ]);
  const data = (listRes.data ?? []) as PaymentSubmission[];

  // Short-lived links so private screenshots can be shown in the browser.
  const urls = new Map<string, string>();
  if (data.length) {
    const { data: signed } = await supabase.storage.from("payment-slips").createSignedUrls(data.map((r) => r.slip_path), 60 * 60);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }

  const rows: BoardRow[] = data.map((r) => ({
    ...r,
    imageUrl: urls.get(r.slip_path) ?? null,
    forMonthLabel: formatMonth(r.for_month),
    submittedAt: formatDateTime(r.created_at),
    reviewedAtLabel: r.reviewed_at ? formatDateTime(r.reviewed_at) : null,
  }));

  const periodLabel = range ? range.label : `${months[1].label} – ${months[0].label}`;

  return (
    <>
      <PageHeader title="Payments" description={`Payment screenshots submitted by residents · paying for ${periodLabel}`} actions={<RefreshButton />} />
      {listRes.error && <ErrorNotice message={listRes.error.message} />}

      <PaymentsBoard
        rows={rows}
        periodLabel={periodLabel}
        filtered={Boolean(q || room)}
        toolbar={
          <FilterBar
            searchPlaceholder="Search name or reference…"
            filters={[{ name: "room", label: "Room", options: (roomsRes.data ?? []).map((r) => ({ value: r.name, label: r.name })) }]}
          >
            <MonthSelect value={month} options={months} />
          </FilterBar>
        }
      />
    </>
  );
}
