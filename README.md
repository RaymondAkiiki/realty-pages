# Realty Pages

Internal contact directory for real estate teams. Fast lookup by area, type, and name. Built for teams — everyone can read, write, and delete.

## Stack

| Layer | Service | Tier |
|-------|---------|------|
| Frontend + API | Next.js 14 on Vercel | Free |
| Database | Neon (Postgres) | Free |
| Auth | JWT (jose) + bcrypt | Self-contained |

No paid services required.

---

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd realty-pages
npm install
```

### 2. Set up Neon database

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project — name it `realty-pages`
3. Copy the **connection string** from the dashboard (looks like `postgresql://user:pass@host/dbname?sslmode=require`)

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL=postgresql://your-neon-connection-string
JWT_SECRET=your-random-secret-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate a JWT secret:
```bash
openssl rand -base64 32
```

### 4. Run database migrations

```bash
npm run db:migrate
```

This creates all tables, indexes, and triggers.

### 5. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## First Use

1. Go to `/register` — create your organisation and owner account
2. You'll be redirected to the contacts directory
3. Go to `/team` to generate invite links for team members
4. Share the invite link — members click it and set up their own password

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create realty-pages --private --push
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
2. Add environment variables:
   - `DATABASE_URL` — your Neon connection string
   - `JWT_SECRET` — your generated secret
   - `NEXT_PUBLIC_APP_URL` — your Vercel URL (e.g. `https://realty-pages.vercel.app`)
3. Deploy

### 3. Run migrations against production

Update `DATABASE_URL` in your local `.env.local` to point to production Neon, then:

```bash
npm run db:migrate
```

---

## Features

### Contacts
- Add, edit, delete contacts
- Fields: name, phone, email, type, status, area, city, source, tags, notes, last contacted
- Contact types: Broker, Agent, Landlord, Tenant, Contractor, Developer, Buyer, Other
- Status: Lead, Active, Inactive

### Search & Filter
- Full-text search across name, email, phone, area, notes
- Filter by area (dropdown populated from your data)
- Filter by type and status
- Results sorted: area → name

### Bulk Import
- Upload CSV or Excel (.xlsx)
- Column mapping preview
- Download template with correct headers
- Skips rows without a name
- Up to 2,000 rows per import

### Export
- Exports currently filtered view as CSV
- Includes all fields

### Team Management
- Owner generates invite links (48h expiry, single use)
- Members join via invite link and set their own password
- Owner can remove members
- All members can add/edit/delete contacts

---

## Import CSV Format

```csv
name,phone,email,type,status,area,city,source,tags,notes
John Mukasa,+256700000001,john@example.com,broker,active,Kololo,Kampala,Referral,,High value
Grace Nakazzi,+256700000002,grace@example.com,agent,lead,Bugolobi,Kampala,Portal,"VIP,Hot lead",
```

Valid types: `broker` `agent` `landlord` `tenant` `contractor` `developer` `buyer` `other`
Valid statuses: `lead` `active` `inactive`

---

## Project Structure

```
realty-pages/
├── app/
│   ├── (auth)/              # Login, register, invite pages
│   │   ├── login/
│   │   ├── register/
│   │   └── invite/[token]/
│   ├── (app)/               # Protected app pages
│   │   ├── contacts/        # Main contacts list
│   │   └── team/            # Team management (owner only)
│   └── api/
│       ├── auth/            # login, logout, register, invite, me
│       ├── contacts/        # CRUD, bulk import, export
│       └── team/            # Member management
├── components/
│   ├── AppShell.tsx         # Sidebar layout
│   ├── ContactModal.tsx     # Add/edit contact form
│   ├── ImportModal.tsx      # Bulk import flow
│   └── Toast.tsx            # Notifications
├── lib/
│   ├── auth.ts              # JWT sign/verify/middleware
│   └── db.ts                # Neon client
├── types/
│   └── index.ts             # TypeScript types + constants
├── middleware.ts             # Route protection
└── scripts/
    └── migrate.js           # Database setup
```

---

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens stored in httpOnly cookies (not accessible to JS)
- All API routes validate the JWT before processing
- All database queries are scoped to `org_id` — data is fully isolated between organisations
- Invite tokens are signed JWTs with 48h expiry, single use, stored in DB

---

## Database Schema

```sql
organisations  (id, name, owner_id, created_at)
users          (id, org_id, name, email, password_hash, role, created_at)
invite_tokens  (id, org_id, token, expires_at, used, created_by, created_at)
contacts       (id, org_id, created_by, name, phone, email, type, status,
                source, city, area, tags[], notes, last_contacted_at,
                created_at, updated_at)
```

Indexes on `contacts(org_id, area)`, `(org_id, type)`, `(org_id, name)`, and a full-text GIN index for search.
