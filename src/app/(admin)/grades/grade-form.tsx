"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useAction } from "@/components/ui/use-action";
import { saveGrade } from "./actions";
import type { Grade } from "@/lib/types";

export function GradeFormButton({ grade }: { grade?: Grade }) {
  const [open, setOpen] = useState(false);
  const { run, pending, fieldErrors, setFieldErrors } = useAction(saveGrade, { onSuccess: () => setOpen(false) });
  const formId = grade ? `grade-${grade.id}` : "grade-new";

  return (
    <>
      {grade ? (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add grade
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setFieldErrors({});
        }}
        title={grade ? `Edit grade ${grade.name}` : "Add grade"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form={formId} loading={pending}>Save</Button>
          </>
        }
      >
        <form
          id={formId}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(grade?.id ?? null, new FormData(e.currentTarget));
          }}
        >
          <Field label="Grade name" htmlFor={`${formId}-name`} required error={fieldErrors.name} hint="e.g. C3">
            <Input id={`${formId}-name`} name="name" defaultValue={grade?.name} maxLength={40} required autoFocus />
          </Field>
          <Field label="Order" htmlFor={`${formId}-order`} error={fieldErrors.sort_order} hint="Smaller numbers show first">
            <Input id={`${formId}-order`} name="sort_order" type="number" min={0} max={10000} defaultValue={grade?.sort_order ?? 100} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
