"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, runAction } from "@/lib/actions";
import { reviewSchema } from "@/lib/validation";
import type { ActionResult, SubmissionStatus } from "@/lib/types";

const MESSAGES: Record<SubmissionStatus, string> = {
  approved: "Payment approved.",
  rejected: "Payment rejected.",
  pending: "Payment moved back to pending.",
};

export async function reviewSubmission(id: string, status: SubmissionStatus, note: string): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await assertAdmin();
    const input = reviewSchema.parse({ id, status, admin_note: note });
    const supabase = await createClient();
    const pending = input.status === "pending";
    const { error } = await supabase
      .from("payment_submissions")
      .update({
        status: input.status,
        admin_note: input.admin_note,
        reviewed_by: pending ? null : admin.id,
        reviewed_at: pending ? null : new Date().toISOString(),
      })
      .eq("id", input.id);
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath("/payments");
    return { ok: true, message: MESSAGES[input.status] };
  });
}
