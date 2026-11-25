"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, runAction } from "@/lib/actions";
import { institutionSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

export async function saveInstitution(id: string | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const input = institutionSchema.parse({
      code: formData.get("code"),
      name: formData.get("name"),
      is_active: formData.get("is_active") === "on",
    });
    const supabase = await createClient();
    const { error } = id
      ? await supabase.from("institutions").update(input).eq("id", z.uuid().parse(id))
      : await supabase.from("institutions").insert(input);
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath("/institutions");
    return { ok: true, message: id ? "Institution updated." : "Institution added." };
  });
}

export async function setInstitutionActive(id: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("institutions").update({ is_active: active }).eq("id", z.uuid().parse(id));
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath("/institutions");
    return { ok: true, message: active ? "Institution activated." : "Institution deactivated." };
  });
}
