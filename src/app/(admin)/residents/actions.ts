"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, formToObject, runAction } from "@/lib/actions";
import { residentSchema } from "@/lib/validation";
import { parseCsv } from "@/lib/csv";
import { checkResidentHeader, residentHeaderColumns, unguardCell } from "@/lib/resident-csv";
import type { ActionResult } from "@/lib/types";

export async function saveResident(id: string | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const input = residentSchema.parse(formToObject(formData));
    const supabase = await createClient();
    const { error } = id
      ? await supabase.from("dorm_residents").update(input).eq("id", z.uuid().parse(id))
      : await supabase.from("dorm_residents").insert(input);
    if (error) return { ok: false, error: dbErrorMessage(error) };
    // Students choose their room before their name, so the room must exist on the form.
    const { data: known } = await supabase.from("rooms").select("id").ilike("name", input.room.replace(/[%_\\]/g, "\\$&")).limit(1);
    if (known && known.length === 0) await supabase.from("rooms").insert({ name: input.room });
    revalidatePath("/residents");
    revalidatePath("/rooms");
    return { ok: true, message: id ? "Resident updated." : "Resident added." };
  });
}

export async function setResidentActive(id: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("dorm_residents").update({ is_active: active }).eq("id", z.uuid().parse(id));
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath("/residents");
    return { ok: true, message: active ? "Resident moved back in." : "Resident marked as moved out." };
  });
}

/**
 * Import residents from a CSV. The header row must match the Export file exactly (older exports without the
 * degree column are accepted too; then degree is left unchanged on existing residents). A row whose room + name already
 * exists updates that resident; any other row is added. Nothing is deleted.
 */
export async function importResidents(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a CSV file." };
    if (file.size > 2 * 1024 * 1024) return { ok: false, error: "File is too large (max 2 MB)." };
    if (!/\.csv$/i.test(file.name)) {
      return {
        ok: false,
        error: /\.xlsx?$/i.test(file.name)
          ? "File not supported: Excel files can't be uploaded. In Excel choose File → Save As → “CSV UTF-8”, then upload that."
          : "File not supported: upload a .csv file in the same format as Export.",
      };
    }

    const table = parseCsv(await file.text());
    if (table.length === 0) return { ok: false, error: "File not supported: the file is empty." };
    const headerError = checkResidentHeader(table[0]);
    if (headerError) return { ok: false, error: headerError };
    if (table.length < 2) return { ok: false, error: "The file has no data rows." };
    if (table.length > 2001) return { ok: false, error: "Too many rows (max 2,000)." };
    const columns = residentHeaderColumns(table[0])!;

    const parsed: z.infer<typeof residentSchema>[] = [];
    const problems: string[] = [];
    const seen = new Set<string>();
    table.slice(1).forEach((cells, i) => {
      const obj: Record<string, string> = {};
      columns.forEach((c, j) => {
        obj[c] = unguardCell(cells[j] ?? "");
      });
      const res = residentSchema.safeParse(obj);
      if (!res.success) {
        problems.push(`row ${i + 2}: ${res.error.issues[0].message}`);
        return;
      }
      const key = `${res.data.room.toLowerCase()}|${res.data.full_name.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      parsed.push(res.data);
    });
    if (problems.length) {
      return { ok: false, error: `Nothing imported. Fix ${problems.length} row(s): ${problems.slice(0, 5).join("; ")}${problems.length > 5 ? "…" : ""}` };
    }

    const supabase = await createClient();
    const { data: existing, error: readError } = await supabase.from("dorm_residents").select("id, room, full_name").limit(5000);
    if (readError) return { ok: false, error: dbErrorMessage(readError) };
    const ids = new Map(existing.map((r) => [`${r.room.toLowerCase()}|${r.full_name.toLowerCase()}`, r.id as string]));

    const inserts = parsed.filter((r) => !ids.has(`${r.room.toLowerCase()}|${r.full_name.toLowerCase()}`));
    const updates = parsed
      .map((r) => ({ id: ids.get(`${r.room.toLowerCase()}|${r.full_name.toLowerCase()}`), ...r }))
      .filter((r): r is typeof r & { id: string } => !!r.id);

    if (inserts.length) {
      const { error } = await supabase.from("dorm_residents").insert(inserts);
      if (error) return { ok: false, error: dbErrorMessage(error) };
    }
    if (updates.length) {
      const { error } = await supabase.from("dorm_residents").upsert(updates, { onConflict: "id" });
      if (error) return { ok: false, error: dbErrorMessage(error) };
    }

    // Make sure every room used is also offered on the payment form.
    const rooms = [...new Set(parsed.map((r) => r.room))];
    const { data: known } = await supabase.from("rooms").select("name");
    const knownSet = new Set((known ?? []).map((r) => (r.name as string).toLowerCase()));
    const newRooms = rooms.filter((r) => !knownSet.has(r.toLowerCase()));
    if (newRooms.length) await supabase.from("rooms").insert(newRooms.map((name) => ({ name })));

    revalidatePath("/residents");
    revalidatePath("/rooms");
    return { ok: true, message: `Imported: ${inserts.length} added, ${updates.length} updated${newRooms.length ? `, ${newRooms.length} new room(s)` : ""}.` };
  });
}
