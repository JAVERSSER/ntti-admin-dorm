export type AdminRole = "super_admin" | "admin";
export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface Admin {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
}

export interface AppSettings {
  id: number;
  dormitory_name: string;
  payment_qr_path: string | null;
  updated_at: string;
}

export interface Institution {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Grade {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface PaymentSubmission {
  id: string;
  reference: string;
  room: string;
  student_name: string;
  grade: string;
  institution: string;
  slip_path: string;
  /** First day of the month this payment is for (YYYY-MM-01). */
  for_month: string;
  status: SubmissionStatus;
  admin_note: string | null;
  /** Bank transaction ID from the payment screenshot, entered by the admin. */
  bank_reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export interface DormResident {
  id: string;
  room: string;
  full_name: string;
  degree: string | null;
  major: string | null;
  grade: string | null;
  institution: string | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
}
