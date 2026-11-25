import { Building2, DoorOpen, GraduationCap, Users, Receipt, Settings, type LucideIcon } from "lucide-react";

export const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/payments", label: "Payments", icon: Receipt },
  { href: "/residents", label: "Residents", icon: Users },
  { href: "/rooms", label: "Rooms", icon: DoorOpen },
  { href: "/grades", label: "Grades", icon: GraduationCap },
  { href: "/institutions", label: "Schools", icon: Building2 },
  { href: "/settings", label: "Settings", icon: Settings },
];
