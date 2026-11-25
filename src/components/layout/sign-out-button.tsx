"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { signOut } from "@/app/login/actions";

/** Log-out icon that asks "Are you sure?" first. */
export function SignOutButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        aria-label="Log out"
        title="Log out"
      >
        <LogOut className="h-4 w-4" />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Log out?"
        description="You will need to sign in again to use the admin."
        footer={
          <form action={signOut} className="flex w-full justify-end gap-2">
            <CancelButton onClick={() => setOpen(false)} />
            <ConfirmButton />
          </form>
        }
      />
    </>
  );
}

function CancelButton({ onClick }: { onClick: () => void }) {
  const { pending } = useFormStatus();
  return (
    <Button type="button" variant="secondary" onClick={onClick} disabled={pending}>
      Cancel
    </Button>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" loading={pending}>
      {!pending && <LogOut className="h-4 w-4" />}
      {pending ? "Logging out…" : "Log out"}
    </Button>
  );
}
