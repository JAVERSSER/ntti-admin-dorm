import { createClient } from "@/lib/supabase/server";
import { currentMonth, formatDate, monthRange } from "@/lib/format";
import { matchPayments, type SubmissionLite } from "@/lib/match";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, Th, Td, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorNotice } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { RoomFormButton } from "./room-form";
import { RoomPeopleButton, type RoomPerson } from "./room-people";
import { setRoomActive } from "./actions";
import type { DormResident, Room } from "@/lib/types";


export default async function RoomsPage() {
  const supabase = await createClient();
  const month = currentMonth();
  const monthLabel = monthRange(month)!.label;
  const [roomsRes, residentsRes, subsRes] = await Promise.all([
    supabase.from("rooms").select("id, name, is_active, created_at").order("name"),
    supabase.from("dorm_residents").select("*").eq("is_active", true).order("full_name").limit(2000),
    supabase
      .from("payment_submissions")
      .select("id, room, student_name, status, created_at")
      .eq("for_month", `${month}-01`)
      .limit(5000),
  ]);
  const rows = (roomsRes.data ?? []) as Room[];
  const residents = (residentsRes.data ?? []) as DormResident[];
  const { result } = matchPayments(residents, (subsRes.data ?? []) as SubmissionLite[]);

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
      state: result.get(r.id)?.state ?? "unpaid",
    });
  }
  const error = roomsRes.error ?? residentsRes.error ?? subsRes.error;

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
          <Table>
            <THead>
              <tr>
                <Th>Room</Th>
                <Th>People</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {rows.map((room) => (
                <Tr key={room.id}>
                  <Td className="font-semibold text-slate-900">{room.name}</Td>
                  <Td>
                    <RoomPeopleButton room={room.name} people={peopleByRoom.get(roomKey(room.name)) ?? []} monthLabel={monthLabel} />
                  </Td>
                  <Td><StatusBadge status={room.is_active ? "active" : "inactive"} /></Td>
                  <Td>{formatDate(room.created_at)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
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
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
