"use client";

import { useState } from "react";
import { Pencil, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useAction } from "@/components/ui/use-action";
import { createAdmin, updateAdmin, updateMonthlyFee } from "./actions";
import type { Admin } from "@/lib/types";

export function MonthlyFeeForm({ fee }: { fee: number | null }) {
  const { run, pending, fieldErrors } = useAction(updateMonthlyFee);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(new FormData(e.currentTarget));
      }}
    >
      <Field label="Monthly fee (USD)" htmlFor="fee" error={fieldErrors.fee} hint="Each resident's QR asks for exactly this amount.">
        <Input id="fee" name="fee" type="number" inputMode="decimal" min="0.01" step="0.01" defaultValue={fee ?? ""} placeholder="e.g. 45.00" required />
      </Field>
      <Button type="submit" loading={pending}>Save fee</Button>
    </form>
  );
}

export function NewAdminButton() {
  const [open, setOpen] = useState(false);
  const { run, pending, fieldErrors } = useAction(createAdmin, { onSuccess: () => setOpen(false) });
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="h-3.5 w-3.5" /> Add administrator
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add administrator"
        description="They sign in with the username (or email) and this password."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-admin-form" loading={pending}>Create</Button>
          </>
        }
      >
        <form
          id="new-admin-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(new FormData(e.currentTarget));
          }}
        >
          <Field label="Username" htmlFor="na-username" required error={fieldErrors.username} hint="Used to sign in. 3–32 characters: letters, numbers, . _ -">
            <Input id="na-username" name="username" autoComplete="off" autoCapitalize="none" required />
          </Field>
          <Field label="Email" htmlFor="na-email" required error={fieldErrors.email}>
            <Input id="na-email" name="email" type="email" required />
          </Field>
          <Field label="Role" htmlFor="na-role" error={fieldErrors.role}>
            <Select id="na-role" name="role" defaultValue="admin">
              <option value="admin">Administrator</option>
              <option value="super_admin">Super administrator (can manage admins)</option>
            </Select>
          </Field>
          <Field label="Password" htmlFor="na-pw" required error={fieldErrors.password}>
            <Input id="na-pw" name="password" type="text" autoComplete="off" required />
          </Field>
        </form>
      </Modal>
    </>
  );
}

export function EditAdminButton({ admin, isSelf }: { admin: Admin; isSelf: boolean }) {
  const [open, setOpen] = useState(false);
  const formId = `edit-admin-${admin.id}`;
  const { run, pending, fieldErrors } = useAction(updateAdmin.bind(null, admin.id), { onSuccess: () => setOpen(false) });
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Button>
      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={`Edit ${admin.username}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" form={formId} loading={pending}>Save</Button>
          </>
        }
      >
        <form
          id={formId}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(new FormData(e.currentTarget));
          }}
        >
          <Field label="Username" htmlFor={`${formId}-username`} required error={fieldErrors.username} hint="Used to sign in. 3–32 characters: letters, numbers, . _ -">
            <Input id={`${formId}-username`} name="username" defaultValue={admin.username} autoComplete="off" autoCapitalize="none" required />
          </Field>
          <Field label="Email" htmlFor={`${formId}-email`} required error={fieldErrors.email} hint="Also changes the email they sign in with.">
            <Input id={`${formId}-email`} name="email" type="email" defaultValue={admin.email} required />
          </Field>
          <Field
            label="Role"
            htmlFor={`${formId}-role`}
            error={fieldErrors.role}
            hint={isSelf ? "You cannot change your own role." : undefined}
          >
            <Select id={`${formId}-role`} name="role" defaultValue={admin.role} disabled={isSelf}>
              <option value="admin">Administrator</option>
              <option value="super_admin">Super administrator (can manage admins)</option>
            </Select>
          </Field>
          <Field label="New password" htmlFor={`${formId}-pw`} error={fieldErrors.password} hint="Leave blank to keep the current password.">
            <Input id={`${formId}-pw`} name="password" type="text" autoComplete="off" />
          </Field>
        </form>
      </Modal>
    </>
  );
}
