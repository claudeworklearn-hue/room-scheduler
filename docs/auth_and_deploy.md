# Auth + Deploy guide

## Part 1 — สร้าง admin account ใน Supabase

### Step 1: เปิด Email Auth

1. เข้า Supabase dashboard → **Authentication** (sidebar ซ้าย)
2. **Sign In / Up** → ดูแถบ **Auth Providers** → **Email** → เปิด toggle ถ้ายังไม่ได้เปิด
3. **Sign In / Up** → **Email Provider settings** → **Confirm email** → **ปิด** (เพื่อ login ได้เลยไม่ต้องยืนยันอีเมล)

> ⚠️ ในการใช้งานจริงควรเปิด Confirm email — แต่สำหรับ MVP ปิดไว้ก่อนเพื่อความเร็ว

### Step 2: สร้าง admin user

1. **Authentication** → **Users** → **Add user** → **Create new user**
2. กรอก:
   - **Email:** `admin@knowledgeth.com` (หรืออีเมลจริงของพี่)
   - **Password:** ตั้งให้แข็ง (จดไว้!)
   - **Auto Confirm User:** ✅ (สำคัญ ถ้าไม่เปิด confirm email)
3. กด **Create user**

### Step 3: ทดสอบ login ใน localhost

1. กลับมาที่ terminal → ถ้า dev server ไม่ได้รันให้รัน `npm run dev`
2. เปิด http://localhost:3000 → จะถูก redirect ไป `/login`
3. กรอกอีเมล + password ที่สร้างไว้ → กด "เข้าสู่ระบบ"
4. ควรกลับมาหน้าแรกพร้อม header แสดงอีเมล + ปุ่ม "ออกจากระบบ"

### Step 4: สร้าง user เพิ่ม (staff/ครู)

ทำเหมือน Step 2 — สร้างทีละคน เก็บ password ให้แต่ละคน

> สำหรับ MVP — ทุก user ที่ login ได้สามารถใช้ทุก feature (รวมแก้/ลบ) — ไม่มี role differentiation
>
> ถ้าต้องการให้ครูเห็นแค่ตารางตัวเอง → รอบหน้าจะเพิ่ม role + RLS policies

---

## Part 2 — Deploy ขึ้น Vercel (ผ่าน CLI)

### Step 1: ติดตั้ง Vercel CLI

ในช่อง terminal (ที่ folder room-scheduler):

```powershell
npm install -g vercel
```

รอ ~1 นาที

### Step 2: Login Vercel

```powershell
vercel login
```

เลือก **Continue with Email** → ใส่อีเมล (gmail ก็ได้) → Vercel จะส่ง link ยืนยันมาที่อีเมล → คลิก → กลับมา terminal จะเห็น "Authentication successful"

### Step 3: Deploy ครั้งแรก

```powershell
vercel deploy
```

จะถามหลายข้อ — ตอบดังนี้:

| คำถาม | ตอบ |
|---|---|
| Set up and deploy? | **Y** |
| Which scope? | เลือก account ตัวเอง |
| Link to existing project? | **N** (สร้างใหม่) |
| What's your project's name? | `room-scheduler` (หรือชื่ออื่น) |
| In which directory is your code located? | กด Enter (ใช้ `./`) |

Vercel จะ build + deploy — ใช้เวลา ~2–3 นาที

จะได้ URL preview เช่น `https://room-scheduler-xxx.vercel.app`

### Step 4: ตั้ง Environment Variables

```powershell
vercel env add NEXT_PUBLIC_SUPABASE_URL
```
- ใส่ URL จาก `.env.local`
- ถามว่าใช้ environment ไหน → กด a + Enter (เลือกทั้ง Production / Preview / Development)

```powershell
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```
- ใส่ key จาก `.env.local`
- เลือกทั้ง 3 environments

> ไม่ต้องใส่ `SUPABASE_SERVICE_ROLE_KEY` ในรอบนี้ (ยังไม่ได้ใช้)

### Step 5: Deploy production

```powershell
vercel deploy --prod
```

จะได้ URL production เช่น `https://room-scheduler.vercel.app`

### Step 6: ตั้งค่าใน Supabase ให้รับ URL production

สำคัญมาก — ถ้าไม่ตั้งจะ login ไม่ได้บน production!

1. กลับไป Supabase dashboard → **Authentication** → **URL Configuration**
2. **Site URL:** ใส่ URL production เช่น `https://room-scheduler.vercel.app`
3. **Redirect URLs:** เพิ่ม:
   - `https://room-scheduler.vercel.app/**`
   - `http://localhost:3000/**` (สำหรับ dev)
4. กด **Save**

### Step 7: ทดสอบ production

เปิด URL production ใน browser → ควรถูก redirect ไป login → กรอก credentials → ใช้งานได้

---

## Part 3 — Custom domain (optional)

ถ้าพี่อยากใช้ `scheduler.knowledgeth.com` แทน `xxx.vercel.app`:

1. Vercel dashboard → project → **Settings** → **Domains**
2. ใส่ `scheduler.knowledgeth.com` → Vercel จะแสดง DNS records ที่ต้องเพิ่ม
3. ไปที่ registrar (Cloudflare/GoDaddy/etc.) → เพิ่ม CNAME record
   - Name: `scheduler`
   - Value: `cname.vercel-dns.com` (Vercel จะให้ค่าเอง)
4. รอ DNS propagate (5–30 นาที) → Vercel จะ auto-issue SSL cert
5. ใน Supabase **Authentication → URL Configuration** เพิ่ม URL ใหม่:
   - Site URL: `https://scheduler.knowledgeth.com`
   - Redirect URLs: เพิ่ม `https://scheduler.knowledgeth.com/**`

---

## Troubleshooting

| อาการ | สาเหตุ | แก้ |
|---|---|---|
| Login แล้ว redirect loop | Site URL ใน Supabase ผิด | ตรวจ Authentication → URL Configuration |
| Login ขึ้น "Invalid login credentials" | password ผิด หรือ Confirm email ยังเปิดอยู่แต่ user ยังไม่ confirm | สร้าง user ใหม่พร้อม "Auto Confirm User" ✅ |
| Deploy fail "missing env var" | ลืม `vercel env add` | กลับไป Step 4 |
| หน้า /login ไม่ขึ้น style | Build ขาด tailwind | `vercel deploy --prod --force` |
| ครู A เห็นข้อมูลของครู B | ยังไม่มี RLS (รอ Phase 2) | ใช้ middleware protect ทั้งระบบไปก่อน |

---

## รอบถัดไป (Phase 2 ของ Auth)

- เพิ่ม `profiles` table → link auth.user_id → role + tutor_profile_id
- เปิด RLS + เขียน policies (admin / tutor / anon)
- หน้า my-schedule auto-select tutor จาก logged-in user
- หน้า "User management" สำหรับ admin
- Forgot password flow
