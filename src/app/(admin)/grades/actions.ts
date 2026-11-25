"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, formToObject, runAction } from "@/lib/actions";
import { gradeSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

export async function saveGrade(id: string | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const input = gradeSchema.parse(formToObject(formData));
    const supabase = await createClient();
    const { error } = id
      ? await supabase.from("grades").update(input).eq("id", z.uuid().parse(id))
      : await supabase.from("grades").insert(input);
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath("/grades");
    return { ok: true, message: id ? "Grade updated." : "Grade added." };
  });
}

export async function setGradeActive(id: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("grades").update({ is_active: active }).eq("id", z.uuid().parse(id));
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath("/grades");
    return { ok: true, message: active ? "Grade shown on the payment form." : "Grade hidden from the payment form." };
  });
}
