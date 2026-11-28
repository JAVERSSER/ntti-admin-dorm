import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SortableTable } from "@/components/ui/sortable-table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorNotice } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { RoomFormButton } from "./room-form";
import { RoomPeopleButton, type RoomPerson } from "./room-people";
import { setRoomActive } from "./actions";
import type { DormResident, Room } from "@/lib/types";


export default async function RoomsPage() {
  const supabase = await createClient();
  const [roomsRes, residentsRes] = await Promise.all([
    supabase.from("rooms").select("id, name, is_active, created_at").order("name"),
    supabase.from("dorm_residents").select("*").eq("is_active", true).order("full_name").limit(2000),
  ]);
  const rows = (roomsRes.data ?? []) as Room[];
  const residents = (residentsRes.data ?? []) as DormResident[];

  // Group current residents by room name (case-insensitive, like the payment form).
  const roomKey = (name: string) => name.trim().toLowerCase();
  const peopleByRoom = new Map<string, RoomPerson[]>();
  for (const r of residents) {
    const k = roomKey(r.room);
    (peopleByRoom.get(k) ?? peopleByRoom.set(k, []).get(k)!).push({
      id: r.id,
      full_name: r.full_name,
      degree: r.degree,
      major: r.major,
      grade: r.grade,
      institution: r.institution,
      note: r.note,
    });
  }
  const error = roomsRes.error ?? residentsRes.error;

  return (
    <>
      <PageHeader
        title="Rooms"
        description="Active rooms appear in the “Room” list on the payment form."
        actions={<RoomFormButton />}
      />
      {error && <ErrorNotice message={error.message} />}
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No rooms yet" description="Add the dormitory rooms so residents can choose theirs." />
        ) : (
          <SortableTable
            columns={[
              { label: "Room", sortable: true, cellClassName: "font-semibold text-slate-900" },
              { label: "People", sortable: true },
              { label: "Status", sortable: true },
              { label: "Created", sortable: true },
              { label: "Actions", className: "text-right" },
            ]}
            rows={rows.map((room) => {
              const people = peopleByRoom.get(roomKey(room.name)) ?? [];
              return {
                key: room.id,
                values: [room.name, people.length, room.is_active, room.created_at],
                cells: [
                  room.name,
                  <RoomPeopleButton key="p" room={room.name} people={people} />,
                  <StatusBadge key="s" status={room.is_active ? "active" : "inactive"} />,
                  formatDate(room.created_at),
                  <div key="a" className="flex justify-end gap-1">
                    <RoomFormButton room={room} />
                    <ConfirmAction
                      action={setRoomActive.bind(null, room.id, !room.is_active)}
                      title={room.is_active ? `Hide room ${room.name}?` : `Show room ${room.name}?`}
                      description={
                        room.is_active
                          ? "Past payments keep this room, but it will no longer appear on the payment form."
                          : "The room will appear on the payment form again."
                      }
                      confirmLabel={room.is_active ? "Hide" : "Show"}
                      confirmVariant={room.is_active ? "danger" : "primary"}
                      variant="ghost"
                    >
                      {room.is_active ? "Hide" : "Show"}
                    </ConfirmAction>
                  </div>,
                ],
              };
            })}
          />
        )}
      </Card>
    </>
  );
}
