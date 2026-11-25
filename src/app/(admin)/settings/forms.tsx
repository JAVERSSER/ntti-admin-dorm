"use client";

import { useRef, useState } from "react";
import { ImageUp, Pencil, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useAction } from "@/components/ui/use-action";
import { createAdmin, updateAdmin, uploadPaymentQr } from "./actions";
import type { Admin } from "@/lib/types";

export function QrUploadForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { run, pending, fieldErrors, setFieldErrors } = useAction(uploadPaymentQr, {
    onSuccess: () => {
      ref.current?.reset();
      setFileName(null);
    },
  });
  return (
    <form
      ref={ref}
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const file = fd.get("qr");
        if (file instanceof File && file.size > 5 * 1024 * 1024) {
          setFieldErrors({ qr: ["Max 5 MB. Please choose a smaller image."] });
          return;
        }
        run(fd);
      }}
    >
      <Field label="New QR image" htmlFor="qr-file" error={fieldErrors.qr} hint="JPG, PNG or WEBP, up to 5 MB">
        <label
          htmlFor="qr-file"
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          <ImageUp className="h-4 w-4 text-blue-600" />
          <span className="truncate">{fileName ?? "Choose image…"}</span>
        </label>
        <input
          id="qr-file"
          name="qr"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            setFileName(e.target.files?.[0]?.name ?? null);
            setFieldErrors({});
          }}
        />
      </Field>
      <Button type="submit" loading={pending} disabled={!fileName}>Upload QR</Button>
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
