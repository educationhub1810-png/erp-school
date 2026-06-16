# EduERP — School Management System

A full-stack, multi-tenant School ERP built with Next.js 16, supporting 12 roles and complete school operations management.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (base-ui) |
| Database | Neon PostgreSQL (serverless) |
| ORM | Prisma v7 with `@prisma/adapter-pg` |
| Auth | NextAuth v5 (JWT, Credentials) |
| Forms | React Hook Form + Zod |
| Font | Inter |

## Roles

| Role | Dashboard |
|---|---|
| Super Admin | `/super-admin/dashboard` |
| School Admin | `/school-admin/dashboard` |
| Principal | `/principal/dashboard` |
| Teacher | `/teacher/dashboard` |
| Student | `/student/dashboard` |
| Parent | `/parent/dashboard` |
| Accountant | `/accountant/dashboard` |
| Librarian | `/librarian/dashboard` |
| Transport Manager | `/transport/dashboard` |
| HR Manager | `/hr/dashboard` |
| Warden Manager | `/warden/dashboard` |
| Mess Manager | `/mess/dashboard` |

## Getting Started

### Prerequisites

- Node.js 20+ (via nvm)
- PostgreSQL database (Neon recommended)
- ngrok (for local tunnel)

### Setup

```bash
# Install dependencies
npm install

# Copy env and fill in values
cp .env.example .env

# Run database migrations
npx prisma migrate deploy

# Seed demo data
npm run db:seed

# Start dev server
make run
```

### Environment Variables

```env
DATABASE_URL=postgresql://...
AUTH_SECRET=your-secret
AUTH_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret
```

## Available Scripts

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # prisma generate + next build
npm run db:seed      # Seed demo data
npm run db:migrate   # Run migrations (dev)
npm run db:generate  # Regenerate Prisma client
npm run db:studio    # Open Prisma Studio
make run             # Kill old processes, start dev + ngrok
make stop            # Kill dev server and ngrok
make logs            # Tail dev server logs
```

## Demo Credentials

After seeding (`npm run db:seed`):

| Role | Login | Password | School Code |
|---|---|---|---|
| Super Admin | `superadmin` | `admin123` | *(leave blank)* |
| School Admin | `admin@sch001.com` | `Admin@123` | `SCH001` |
| Principal | `principal@sch001.com` | `Admin@123` | `SCH001` |
| Teacher | `teacher@sch001.com` | `Admin@123` | `SCH001` |
| Student | `student@sch001.com` | `Admin@123` | `SCH001` |

### Login Flow

The login page has three fields:

1. **School** — dropdown listing all active schools. Leave as "Super Admin" to log in as platform owner.
2. **Username**
   - Students: admission number (e.g. `ADM2024001`)
   - Staff / Teacher / School Admin: email or mobile number
   - Super Admin: email or mobile number
3. **Password**
   - Students: date of birth in `DDMMYYYY` format (e.g. `15082005` for 15 Aug 2005)
   - All other roles: their account password (bcrypt-hashed)

## Project Structure

```
app/
├── (auth)/              # Auth API routes
├── api/v1/              # REST API endpoints
├── super-admin/         # Super Admin pages
├── school-admin/        # School Admin pages
├── principal/           # Principal pages
├── teacher/             # Teacher pages
├── student/             # Student pages
└── [role]/              # Other role pages

components/
├── shared/              # Dashboard layout, sidebar, header
└── ui/                  # shadcn/ui components

lib/
├── prisma.ts            # Prisma singleton
├── roles.ts             # Role constants (Edge-safe)
├── nav-config.ts        # Per-role navigation
└── generated/prisma/    # Generated Prisma client

prisma/
├── schema.prisma        # Database schema (30+ models)
├── migrations/          # Migration history
└── seed.ts              # Demo data seeder
```

## Architecture Notes

- **Multi-tenancy** — every record carries a `schoolId`; Super Admin operates without one
- **Edge-safe auth** — `auth.config.ts` has no Prisma imports, safe for the Next.js proxy layer
- **Proxy over middleware** — Next.js 16 uses `proxy.ts` instead of `middleware.ts`
- **Prisma v7** — requires `prisma.config.ts` and the `PrismaPg` driver adapter; no plain `new PrismaClient()`
- **base-ui components** — shadcn v4 uses `@base-ui/react` (not Radix); `render` prop instead of `asChild`
