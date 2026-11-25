import type { SubmissionStatus } from "./types";

/**
 * Normalise a typed name so small differences still match:
 * Unicode form, spaces / zero-width characters, case, and a leading "ឈ្មោះ" ("name").
 */
export function nameKey(name: string): string {
  return name
    .normalize("NFC")
    .replace(/^\s*(ឈ្មោះ|ឈ្នោះ)\s*[:：]?/, "")
    .replace(/[\s​-‍﻿.]/g, "")
    .toLowerCase();
}

export type PayState = "paid" | "pending" | "rejected" | "unpaid";

const RANK: Record<SubmissionStatus, number> = { approved: 3, pending: 2, rejected: 1 };
const STATE: Record<SubmissionStatus, PayState> = { approved: "paid", pending: "pending", rejected: "rejected" };

export interface SubmissionLite {
  id: string;
  room: string;
  student_name: string;
  status: SubmissionStatus;
  created_at: string;
}

/**
 * For each resident, the best submission of the period (approved > pending > rejected).
 * A submission from the same room is preferred; a name-only match is used when the
 * resident picked another room. Returns matches plus submissions that matched nobody.
 */
export function matchPayments<R extends { id: string; room: string; full_name: string }>(
  residents: R[],
  submissions: SubmissionLite[],
) {
  const byName = new Map<string, SubmissionLite[]>();
  for (const s of submissions) {
    const k = nameKey(s.student_name);
    (byName.get(k) ?? byName.set(k, []).get(k)!).push(s);
  }

  const used = new Set<string>();
  const result = new Map<string, { state: PayState; submission: SubmissionLite | null; otherRoom: boolean }>();
  for (const r of residents) {
    const candidates = byName.get(nameKey(r.full_name)) ?? [];
    const sameRoom = candidates.filter((s) => s.room.trim().toLowerCase() === r.room.trim().toLowerCase());
    const pool = sameRoom.length ? sameRoom : candidates;
    const best = pool.reduce<SubmissionLite | null>((a, s) => (!a || RANK[s.status] > RANK[a.status] ? s : a), null);
    for (const s of pool) used.add(s.id);
    result.set(r.id, {
      state: best ? STATE[best.status] : "unpaid",
      submission: best,
      otherRoom: !!best && !sameRoom.length,
    });
  }
  const unmatched = submissions.filter((s) => !used.has(s.id));
  return { result, unmatched };
}
