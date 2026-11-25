import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cleanupOldPayments } from "@/lib/cleanup";

/**
 * Daily job (Vercel Cron, cron-job.org, GitHub Actions…). It:
 *   1. keeps the Supabase free project active, so it is never paused, and
 *   2. deletes payments and screenshots older than last month.
 * Call with header  Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });

  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // The cleanup queries the database, which also counts as project activity.
    const deleted = await cleanupOldPayments({ force: true });
    return NextResponse.json({ ok: true, deleted });
  } catch {
    return NextResponse.json({ ok: false, error: "Cleanup failed; see server logs" }, { status: 500 });
  }
}
