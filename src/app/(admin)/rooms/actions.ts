"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, formToObject, runAction } from "@/lib/actions";
import { roomSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

export async function saveRoom(id: string | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const input = roomSchema.parse(formToObject(formData));
    const supabase = await createClient();
    const { error } = id
      ? await supabase.from("rooms").update(input).eq("id", z.uuid().parse(id))
      : await supabase.from("rooms").insert(input);
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath("/rooms");
    return { ok: true, message: id ? "Room updated." : "Room added." };
  });
}

export async function setRoomActive(id: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("rooms").update({ is_active: active }).eq("id", z.uuid().parse(id));
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath("/rooms");
    return { ok: true, message: active ? "Room activated." : "Room hidden from the payment form." };
  });
}
