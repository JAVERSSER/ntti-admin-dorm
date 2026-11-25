"use client";

import { useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "./button";
import { Modal } from "./modal";
import { Field, Textarea } from "./field";
import { useAction } from "./use-action";
import type { ActionResult } from "@/lib/types";

/**
 * Button that opens a confirmation modal before running a server action.
 * With `requireReason`, the admin must type a justification (stored in the audit log).
 */
export function ConfirmAction({
  action,
  title,
  description,
  confirmLabel = "Confirm",
  children,
  variant = "secondary",
  confirmVariant = "primary",
  size = "sm",
  requireReason,
  reasonLabel = "Reason",
}: {
  action: (reason?: string) => Promise<ActionResult<unknown>>;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  children: ReactNode;
  variant?: ButtonProps["variant"];
  confirmVariant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  requireReason?: boolean;
  reasonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { run, pending, fieldErrors } = useAction(action, {
    onSuccess: () => {
      setOpen(false);
      setReason("");
    },
  });
  const reasonOk = !requireReason || reason.trim().length >= 5;

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={title}
        description={description}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant={confirmVariant}
              loading={pending}
              disabled={!reasonOk}
              onClick={() => run(requireReason ? reason : undefined)}
            >
              {confirmLabel}
            </Button>
          </>
        }
      >
        {requireReason && (
          <Field label={reasonLabel} htmlFor="confirm-reason" required error={fieldErrors.reason} hint="At least 5 characters. Saved to the audit log.">
            <Textarea id="confirm-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} autoFocus />
          </Field>
        )}
      </Modal>
    </>
  );
}
