"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useAction } from "@/components/ui/use-action";
import { saveResident } from "./actions";
import type { DormResident } from "@/lib/types";

export function ResidentFormButton({
  resident,
  rooms,
  schools,
  grades,
  degrees,
}: {
  resident?: DormResident;
  rooms: string[];
  schools: string[];
  grades: string[];
  degrees: string[];
}) {
  const [open, setOpen] = useState(false);
  const { run, pending, fieldErrors, setFieldErrors } = useAction(saveResident, { onSuccess: () => setOpen(false) });
  const formId = resident ? `resident-${resident.id}` : "resident-new";

  return (
    <>
      {resident ? (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add resident
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setFieldErrors({});
        }}
        title={resident ? `Edit ${resident.full_name}` : "Add resident"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form={formId} loading={pending}>Save</Button>
          </>
        }
      >
        <form
          id={formId}
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(resident?.id ?? null, new FormData(e.currentTarget));
          }}
        >
          <datalist id={`${formId}-rooms`}>{rooms.map((r) => <option key={r} value={r} />)}</datalist>
          <datalist id={`${formId}-schools`}>{schools.map((r) => <option key={r} value={r} />)}</datalist>
          <datalist id={`${formId}-grades`}>{grades.map((r) => <option key={r} value={r} />)}</datalist>
          <datalist id={`${formId}-degrees`}>{degrees.map((r) => <option key={r} value={r} />)}</datalist>
          <Field label="Full name" htmlFor={`${formId}-name`} required error={fieldErrors.full_name} hint="Same spelling the student types on the payment form">
            <Input id={`${formId}-name`} name="full_name" defaultValue={resident?.full_name} maxLength={120} required autoFocus />
          </Field>
          <Field label="Room" htmlFor={`${formId}-room`} required error={fieldErrors.room}>
            <Input id={`${formId}-room`} name="room" list={`${formId}-rooms`} defaultValue={resident?.room} maxLength={40} required />
          </Field>
          <Field label="Degree" htmlFor={`${formId}-degree`} error={fieldErrors.degree} hint="Bachelor's, Associate, C1, C2, C3…">
            <Input id={`${formId}-degree`} name="degree" list={`${formId}-degrees`} defaultValue={resident?.degree ?? ""} maxLength={80} />
          </Field>
          <Field label="Major" htmlFor={`${formId}-major`} error={fieldErrors.major}>
            <Input id={`${formId}-major`} name="major" placeholder="e.g. Information Technology" defaultValue={resident?.major ?? ""} maxLength={160} />
          </Field>
          <Field label="Grade" htmlFor={`${formId}-grade`} error={fieldErrors.grade} hint="Year 1–5, C1, C2…">
            <Input id={`${formId}-grade`} name="grade" list={`${formId}-grades`} defaultValue={resident?.grade ?? ""} maxLength={40} />
          </Field>
          <Field label="School" htmlFor={`${formId}-school`} error={fieldErrors.institution}>
            <Input id={`${formId}-school`} name="institution" list={`${formId}-schools`} defaultValue={resident?.institution ?? ""} maxLength={160} />
          </Field>
          <Field label="Note" htmlFor={`${formId}-note`} error={fieldErrors.note}>
            <Textarea id={`${formId}-note`} name="note" defaultValue={resident?.note ?? ""} maxLength={500} rows={2} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
