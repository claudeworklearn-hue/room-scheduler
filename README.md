# Knowledge Academy — Room Scheduler

ระบบจัดตารางห้องเรียน/ติวเตอร์ ทดแทน Google Sheet เดิม

**Stack:** Next.js 14 (App Router, TypeScript) + Tailwind + Supabase (Postgres + Auth) + Vercel
**Timezone:** Asia/Bangkok
**สถานะปัจจุบัน:** Phase P0–P1 — scaffold + DB schema + seed (รอบหน้า: backend APIs + day grid UI)

---

## โครงสร้างโฟลเดอร์

```
room-scheduler/
├── app/
│   ├── layout.tsx                   # root layout (ภาษาไทย)
│   ├── page.tsx                     # หน้าแรก (เมนู)
│   ├── admin/room-schedule/page.tsx # smoke test อ่านจาก Supabase
│   └── globals.css                  # Tailwind base
├── lib/supabase/
│   ├── client.ts                    # browser client
│   ├── server.ts                    # server client (SSR)
│   └── types.ts                     # DB types (manual ก่อน, gen ทีหลังได้)
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql            # tables + indexes
│   │   └── 0002_constraints.sql     # exclusion constraints + check rules
│   └── seed.sql                     # ตัวอย่างข้อมูล 1 สาขา 3 ห้อง 4 events
├── public/
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.example
└── .gitignore
```

---

## ขั้นตอนการตั้งค่า (ครั้งแรก)

### 1. ติดตั้ง dependencies

```powershell
cd "c:\Users\ssira\Documents\knowledge-courses\room-scheduler"
npm install
```

### 2. สร้าง Supabase project

1. เข้า https://app.supabase.com → **New project** (region: Singapore)
2. ตั้งชื่อ project เช่น `room-scheduler`
3. ตั้ง password DB (จดไว้)
4. รอ project พร้อม (~2 นาที)

### 3. รัน migrations + seed

ใน Supabase dashboard → **SQL Editor** → **New query** → paste แต่ละไฟล์ตามลำดับ:

1. `supabase/migrations/0001_init.sql` → Run
2. `supabase/migrations/0002_constraints.sql` → Run
3. `supabase/seed.sql` → Run

หรือถ้าติดตั้ง Supabase CLI:

```powershell
npx supabase link --project-ref <your-project-ref>
npx supabase db push
psql $env:DATABASE_URL -f supabase/seed.sql
```

### 4. ตั้งค่า env

```powershell
copy .env.example .env.local
```

แก้ `.env.local` ใส่ค่าจาก Supabase dashboard → **Project Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

### 5. รัน dev

```powershell
npm run dev
```

เปิด http://localhost:3000 → คลิกเมนู "ตารางห้องเรียน" ดูข้อมูล seed

---

## Database design (สำคัญ)

### หลักคิด

- ใช้ **PostgreSQL exclusion constraint + `tstzrange`** กัน room/tutor overlap ระดับ DB
- `[)` bounds → back-to-back OK, overlap ไม่ OK
- `event_type`: `class` หรือ `room_block` ใช้ table เดียวกัน (single source of truth สำหรับ "ห้องไม่ว่าง")
- `delivery_mode`: `online` ห้ามมีห้อง, `onsite/hybrid` ต้องมีห้อง — บังคับด้วย CHECK constraint
- `status='cancelled'` ไม่ถูกนับใน overlap check

### Tables หลัก

| Table | หน้าที่ |
|---|---|
| `branches` | สาขา |
| `rooms` | ห้องเรียนต่อสาขา (capacity, type, sort_order) |
| `tutor_profiles` | ติวเตอร์ (มี short_code สำหรับ import) |
| `courses` | คอร์ส (subject, code, default color) |
| `schedule_events` | **ตัวจริง** — 1 row = 1 occurrence (class หรือ room_block) |
| `import_runs` / `import_rows` | pipeline import จาก Google Sheet |

### Constraints สำคัญ

- `schedule_events_room_no_overlap` — ห้องเดียวกัน เวลาทับกัน → reject
- `schedule_events_tutor_no_overlap` — ติวเตอร์เดียวกัน คลาสทับกัน → reject
- `schedule_events_valid_mode_room` — online ห้ามมีห้อง, onsite/hybrid ต้องมีห้อง
- `schedule_events_valid_duration` — `ends_at > starts_at`

---

## Roadmap

| Phase | งาน | สถานะ |
|---|---|---|
| P0 | Scaffold repo + config | ✅ |
| P1 | DB schema + constraints + seed | ✅ |
| P1 | Backend API routes (rooms/events/availability/my-schedule) | ⏳ |
| P1 | Admin day grid UI (30-min slots, filters, modal) | ⏳ |
| P2 | Room CRUD + tutor self-schedule page | ⏳ |
| P2 | Import preview/commit จาก Google Sheets | ⏳ |
| P2 | Unit/integration tests | ⏳ |
| P3 | Auth + roles (admin/tutor) | ⏳ |
| P3 | Deploy Vercel + feature flag | ⏳ |

---

## หมายเหตุสำหรับ migration ต่อไป

- ตอนนี้ยังไม่มี auth — ทุก query ผ่าน anon key ตรง ๆ
- เมื่อเปิด auth จริง: ต้องเปิด RLS บนทุก table + เขียน policy ตาม role
  (admin/tutor — ดู [deep-research-report (5).md](../deep-research-report%20(5).md) section permission model)
- เมื่อต่อ user จริงแล้ว: อัปเดต `tutor_profiles.user_id` ให้ตรงกับ `auth.users.id`
