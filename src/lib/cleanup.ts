import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { keptMonths } from "@/lib/format";

/** Run the cleanup at most once an hour per server instance. */
const INTERVAL_MS = 60 * 60 * 1000;
const BATCH = 500;
let lastRun = 0;

/**
 * Auto clean: permanently delete payment submissions (and their screenshots in
 * the "payment-slips" bucket) paid for any month older than the kept months (see KEPT_MONTHS).
 * Only this month and the 2 months before it are kept.
 */
export async function cleanupOldPayments({ force = false } = {}): Promise<number> {
  if (!force && Date.now() - lastRun < INTERVAL_MS) return 0;
  lastRun = Date.now();
  let total = 0;

  const oldest = keptMonths().at(-1)!.value; // oldest kept month, YYYY-MM
  const cutoff = `${oldest}-01`;
  const supabase = createServiceClient();

  try {
    for (;;) {
      const { data, error } = await supabase
        .from("payment_submissions")
        .select("id, slip_path")
        .lt("for_month", cutoff)
        .limit(BATCH);
      if (error) throw error;
      if (!data.length) break;

      // Screenshots first: if this fails, the rows stay and the next run retries.
      const paths = data.map((r) => r.slip_path as string).filter(Boolean);
      if (paths.length) {
        const removed = await supabase.storage.from("payment-slips").remove(paths);
        if (removed.error) throw removed.error;
      }
      const deleted = await supabase.from("payment_submissions").delete().in("id", data.map((r) => r.id as string));
      if (deleted.error) throw deleted.error;

      total += data.length;
      console.info(`[cleanup] deleted ${data.length} payments before ${oldest}`);
      if (data.length < BATCH) break;
    }
  } catch (err) {
    lastRun = 0; // try again on the next page view
    console.error("[cleanup] old payments", err);
    throw err;
  }
  return total;
}
