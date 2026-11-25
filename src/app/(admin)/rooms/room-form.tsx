"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useAction } from "@/components/ui/use-action";
import { saveRoom } from "./actions";
import type { Room } from "@/lib/types";

export function RoomFormButton({ room }: { room?: Room }) {
  const [open, setOpen] = useState(false);
  const { run, pending, fieldErrors, setFieldErrors } = useAction(saveRoom, { onSuccess: () => setOpen(false) });
  const formId = room ? `room-${room.id}` : "room-new";

  return (
    <>
      {room ? (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add room
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setFieldErrors({});
        }}
        title={room ? `Edit room ${room.name}` : "Add room"}
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
          onSubmit={(e) => {
            e.preventDefault();
            run(room?.id ?? null, new FormData(e.currentTarget));
          }}
        >
          <Field label="Room name" htmlFor={`${formId}-name`} required error={fieldErrors.name} hint="e.g. A101">
            <Input id={`${formId}-name`} name="name" defaultValue={room?.name} maxLength={40} required autoFocus />
          </Field>
        </form>
      </Modal>
    </>
  );
}
