"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useAction } from "@/components/ui/use-action";
import { saveInstitution } from "./actions";
import type { Institution } from "@/lib/types";

export function InstitutionFormButton({ institution }: { institution?: Institution }) {
  const [open, setOpen] = useState(false);
  const { run, pending, fieldErrors, setFieldErrors } = useAction(saveInstitution, { onSuccess: () => setOpen(false) });
  const formId = `inst-form-${institution?.id ?? "new"}`;

  return (
    <>
      {institution ? (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label={`Edit ${institution.code}`}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add institution
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setFieldErrors({});
        }}
        title={institution ? "Edit institution" : "Add institution"}
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
            run(institution?.id ?? null, new FormData(e.currentTarget));
          }}
        >
          <Field label="Code" htmlFor={`${formId}-code`} required error={fieldErrors.code} hint="Short unique code, e.g. NTTI">
            <Input id={`${formId}-code`} name="code" defaultValue={institution?.code} maxLength={20} className="uppercase" required />
          </Field>
          <Field label="Full name" htmlFor={`${formId}-name`} required error={fieldErrors.name}>
            <Input id={`${formId}-name`} name="name" defaultValue={institution?.name} maxLength={160} required />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="is_active" defaultChecked={institution?.is_active ?? true} className="h-4 w-4 rounded border-slate-300" />
            Active (shown on the payment form)
          </label>
        </form>
      </Modal>
    </>
  );
}
