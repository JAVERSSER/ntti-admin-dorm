# DormPay — Admin

Admins review the payment screenshots residents upload from the user form (`../user`).

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, RLS)

## Pages

| Route | Purpose |
|---|---|
| `/login` | Email + password (Supabase Auth). Only active rows in `admins` can enter. |
| `/payments` | Every submission as an image card. Filter by **month** (default: this month), status, room, school, grade; search name or reference. Click a card to see the screenshot full size and **Approve / Reject** with a note. Month totals at the top. |
| `/rooms` | Rooms shown in the form's "Room" list (add, rename, hide). |
| `/institutions` | Schools shown in the form's "Student at" list. |
| `/settings` | Upload the **payment QR** shown on the form, dormitory name, profile, password, admin users. |

## Data (Supabase)

The whole database is one file: `supabase/migrations/20261125100000_schema.sql`. Starting rows are in `supabase/seed.sql`.

| Table | Why it is needed |
|---|---|
| `admins` | Who may sign in here, and whether they are a super admin |
| `app_settings` | One row: dormitory name and the payment QR image path |
| `institutions` | The form's "Student at" list (Schools page) |
| `rooms` | The form's "Room" list (Rooms page) |
| `grades` | The form's "Grade" list (Grades page) |
| `payment_submissions` | Every screenshot a resident uploads, with status (`pending` / `approved` / `rejected`), the month paid for, and who reviewed it |
| `dorm_residents` | Roster of who lives in which room, so Residents shows who has paid this month |
| `audit_logs` | Automatic history of admin changes (who changed what, when). Written by triggers; no page shows it |

Storage buckets: `payment-slips` (**private**; admins read through 1-hour signed URLs) and `payment-qr` (public).

RLS: only active admins can read or change data. The user app writes with the service-role key from its server, so anonymous visitors cannot read anything.

## Setup

1. In the Supabase SQL Editor, run `supabase/migrations/20261125100000_schema.sql`, then `supabase/seed.sql`.
   (A database set up before 2026-11-25 instead needs `supabase/cleanup-old-tables.sql`, once.)
2. In Supabase **Authentication → Providers**, keep Email on and **turn off sign-ups**.
3. `cp .env.example .env.local` and fill it in.
4. Create the first admin, then start the app:
   ```bash
   npm install
   npm run create-admin -- admin@yourdorm.com "Your Name" 'a-strong-password'
   npm run dev
   ```
5. In the dashboard, add your **Rooms**, check the **Schools**, and upload the **Payment QR** in Settings.
# ntti-admin-dorm
