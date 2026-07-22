# REIZ Pulse

> **Internal Employee Attendance & Task Tracking System for REIZ Media**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://mongodb.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org)

---

## 1. Product Overview

**REIZ Pulse** is a bespoke internal web application built exclusively for **REIZ Media** employees and management. It consolidates daily attendance check-in/check-out, task management, leave applications, and monthly reporting into a single, role-aware portal.

The system eliminates paper-based attendance sheets and Excel-based task trackers by providing real-time visibility for admins/managers, a streamlined daily workflow for employees, and one-click XLSX exports for payroll and compliance teams.

---

## 2. Key Features

- 🔐 **Authentication** — Secure JWT-based login with httpOnly cookies; role-based access (Super Admin, Admin, Manager, Employee)
- 🕐 **Attendance Tracking** — One-tap check-in / check-out in IST (Asia/Kolkata); auto-detects missing checkouts
- ✅ **Task Management** — Admins create and assign tasks; employees update status; full audit trail
- 📅 **Calendar View** — Month-level calendar showing attendance, tasks, and template columns per day
- 📋 **Monthly Sheet** — Spreadsheet-style grid; template columns rendered per employee; exportable to XLSX
- 🧩 **Template System** — Admins define reusable column templates; assigned per employee; columns appear in monthly sheet and calendar log modals
- 📊 **Reports & Hours** — Summary of hours worked, late arrivals, absences; downloadable reports
- 📱 **PWA Support** — Installable on mobile and desktop; service worker caches assets for offline use
- 🏖️ **Leave Management** — Full Day, Half Day, Hourly, and WFH requests; admin approval workflow
- 🔎 **Audit Logs** — Full action trail (logins, CRUD, approvals) with IP address recording

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Language | TypeScript 5 |
| Database | MongoDB Atlas |
| ODM | Mongoose 9 |
| Auth | JWT via `jose` + `bcrypt` |
| Spreadsheet Export | SheetJS (`xlsx`) |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Animations | Framer Motion |

---

## 4. Architecture

```
┌──────────────────────────────────────────────────┐
│  UI Layer (React 19 / Next.js App Router)         │
│  • /app/dashboard/*  — Employee views             │
│  • /app/admin/*      — Admin/Manager views        │
└────────────────────┬─────────────────────────────┘
                     │ fetch() / Server Actions
┌────────────────────▼─────────────────────────────┐
│  API Route Layer (/app/api/**)                    │
│  • Next.js Route Handlers (Edge-compatible)       │
│  • Cookie-based JWT auth on every protected route │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│  Validation Layer                                 │
│  • Inline request body validation                 │
│  • Role guard (SUPER_ADMIN | ADMIN | MANAGER)     │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│  Service / Business Logic Layer                   │
│  • Attendance rules (IST timezone, working hrs)   │
│  • Leave eligibility checks                       │
│  • Template column merging for monthly grid       │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│  Mongoose ODM Layer                               │
│  • Schemas with validation & virtuals             │
│  • Automatic index creation                       │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│  MongoDB Atlas (Cloud Database)                   │
│  • Replica set for durability                     │
│  • Atlas Search ready                             │
└──────────────────────────────────────────────────┘
```

---

## 5. Project Structure

```
reiz-pulse/
├── public/                         # Static assets, PWA manifest, icons
├── src/
│   ├── app/
│   │   ├── admin/                  # Admin/Manager pages
│   │   │   ├── page.tsx            # Overview & live attendance
│   │   │   ├── layout.tsx          # Admin layout with sidebar
│   │   │   ├── employees/          # Employee CRUD
│   │   │   ├── templates/          # Template builder
│   │   │   ├── tasks/              # Tasks board
│   │   │   ├── requests/           # Corrections & leave approvals
│   │   │   ├── reports/            # Reports & hours
│   │   │   ├── holidays/           # Holiday management
│   │   │   └── audit-logs/         # Audit log viewer
│   │   ├── dashboard/              # Employee-facing pages
│   │   │   ├── page.tsx            # Dashboard home
│   │   │   ├── layout.tsx          # Employee layout
│   │   │   ├── attendance/         # Check-in/out
│   │   │   ├── tasks/              # My tasks
│   │   │   ├── leave/              # Leave requests
│   │   │   └── calendar/           # Monthly calendar
│   │   ├── api/
│   │   │   ├── auth/               # Login, logout, seed
│   │   │   ├── attendance/         # Check-in/out endpoints
│   │   │   ├── leaves/             # Leave CRUD
│   │   │   ├── tasks/              # Task CRUD
│   │   │   ├── notifications/      # In-app notifications
│   │   │   ├── health/             # Health check
│   │   │   └── admin/              # Admin-only APIs
│   │   │       ├── employees/
│   │   │       ├── templates/
│   │   │       ├── tasks/
│   │   │       ├── reports/
│   │   │       ├── holidays/
│   │   │       ├── audit-logs/
│   │   │       ├── attendance/
│   │   │       ├── monthly-grid/
│   │   │       └── overview/
│   │   ├── login/                  # Login page
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Root redirect
│   │   └── globals.css             # Global styles
│   ├── components/
│   │   ├── AdminSidebar.tsx        # Admin navigation sidebar
│   │   ├── DashboardSidebar.tsx    # Employee navigation sidebar
│   │   └── ui/                     # Shared UI primitives (Card, Button, etc.)
│   ├── lib/
│   │   ├── auth.ts                 # JWT sign/verify utilities
│   │   ├── bcrypt.ts               # Password hashing helpers
│   │   ├── db.ts                   # Mongoose connection singleton
│   │   └── date.ts                 # IST date/time utilities
│   ├── models/
│   │   ├── User.ts                 # Employee/admin user schema
│   │   ├── Attendance.ts           # Check-in/out records
│   │   ├── LeaveRequest.ts         # Leave applications
│   │   ├── SheetTemplate.ts        # Column template definitions
│   │   ├── SheetData.ts            # Per-employee monthly sheet data
│   │   ├── Holiday.ts              # Public & company holidays
│   │   ├── Notification.ts         # In-app notifications
│   │   └── AuditLog.ts             # Audit trail records
│   └── proxy.ts                    # API proxy helpers
├── .env.example                    # Environment variable template
├── .env.local                      # Your local secrets (gitignored)
├── next.config.ts                  # Next.js configuration
├── tailwind.config.ts              # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json                    # Dependencies & scripts
```

---

## 6. Installation & Setup

### Prerequisites

- **Node.js** ≥ 18.17 (LTS recommended)
- **npm** ≥ 9
- A **MongoDB Atlas** account (free tier works)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/reizmedia/reiz-pulse.git
cd reiz-pulse

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Then edit .env.local with your actual values

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | Yes | Display name of the app |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical URL (used for PWA manifest) |
| `NODE_ENV` | Yes | `development` or `production` |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | HS256 secret key (min 32 chars) |
| `JWT_EXPIRES_IN` | No | Token TTL (default `7d`) |
| `APP_TIMEZONE` | No | IANA timezone for attendance (default `Asia/Kolkata`) |
| `BCRYPT_ROUNDS` | No | bcrypt cost factor (default `12`) |
| `SENTRY_DSN` | No | Sentry DSN for error monitoring |

> [!IMPORTANT]
> Never commit `.env.local` to version control. It is gitignored by default.

---

## 8. Database Setup

REIZ Pulse uses **MongoDB Atlas**. All Mongoose schemas automatically create indexes on first connection.

1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Whitelist your IP (or use `0.0.0.0/0` for development)
3. Create a database user and copy the connection string
4. Paste the connection string into `MONGODB_URI` in your `.env.local`

Collections created automatically: `users`, `attendances`, `leaverequests`, `sheettemplates`, `sheetdatas`, `holidays`, `notifications`, `auditlogs`

---

## 9. Seeding the Database

The seed endpoint creates demo accounts and sample data.

```bash
# Basic seed (skips if data already exists)
# Open in browser:
http://localhost:3000/api/auth/seed

# Force re-seed (wipes existing demo data)
http://localhost:3000/api/auth/seed?force=true
```

You can also run the npm script which prints the URL:

```bash
npm run seed
```

---

## 10. Development Server

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000) with hot-reload enabled.

---

## 11. Production Build

```bash
# Build the optimised production bundle
npm run build

# Start the production server
npm start
```

---

## 12. Type Checking

Run TypeScript in no-emit mode to catch type errors without compiling:

```bash
npm run typecheck
# equivalent to: tsc --noEmit
```

---

## 13. Demo Accounts

All demo accounts use the password: **`reizpulse2026`**

| Role | Email |
|---|---|
| Super Admin | `superadmin@reizmedia.com` |
| Admin | `admin@reizmedia.com` |
| Manager | `manager@reizmedia.com` |
| Employee 1 | `employee1@reizmedia.com` |
| Employee 2 | `employee2@reizmedia.com` |

---

## 14. Role-Based Routing

| Role | Landing Page |
|---|---|
| `SUPER_ADMIN` | `/admin` |
| `ADMIN` | `/admin` |
| `MANAGER` | `/admin` |
| `EMPLOYEE` | `/dashboard` |

The root `/` route reads the JWT cookie and redirects accordingly. Attempting to access `/admin` as an employee returns 401.

---

## 15. Template System

The template system allows admins to define **custom column sets** that appear in each employee's **monthly sheet** and **calendar log modal**.

**How it works:**

1. **Admin creates a template** at `/admin/templates` — defines a list of column names (e.g., "Projects Completed", "Client Calls", "Code Reviews")
2. **Admin assigns the template** to one or more employees in the employee CRUD
3. **Employee sees the columns** in their `/dashboard` monthly sheet view — each day's row includes the template columns for data entry
4. **Calendar log modal** — clicking a day on the calendar shows the template columns with that day's saved values
5. **Monthly Grid API** merges attendance records with template `SheetData` rows for the XLSX export

Templates are reusable: one template can be assigned to an entire department.

---

## 16. Attendance Rules

- **Check-in**: Employees tap "Check In" from the attendance page; the server records the UTC timestamp and converts to IST for display
- **Check-out**: Only available after check-in; records the out timestamp
- **Timezone**: All timestamps stored in UTC; displayed in `Asia/Kolkata` (IST, UTC+5:30)
- **Missing checkout**: If an employee checks in but doesn't check out by the next calendar day (IST), the record is flagged as "missing checkout" in admin reports
- **Corrections**: Employees can submit a correction request with a justification; admins approve or reject from `/admin/requests`
- **Single session per day**: One attendance record per employee per calendar day (IST)

---

## 17. Security Notes

| Concern | Implementation |
|---|---|
| Password storage | `bcrypt` with configurable cost factor (default 12 rounds) |
| Session tokens | HS256 JWT in `httpOnly`, `Secure`, `SameSite=Strict` cookie |
| Timestamps | All timestamps set server-side; client cannot forge check-in times |
| Role guards | Every protected API route validates the JWT and checks role |
| XLSX injection | Cell values prefixed to prevent formula injection (`=`, `+`, `-`, `@`) |
| Input validation | Request bodies validated before DB operations |

---

## 18. PWA Installation

REIZ Pulse ships as a **Progressive Web App**:

- **Install on desktop**: Click the install icon in the Chrome/Edge address bar
- **Install on mobile**: Use "Add to Home Screen" from the browser menu (Safari on iOS, Chrome on Android)
- **Offline support**: Service worker caches the app shell; draft form data is preserved offline
- **Service worker caching**: Static assets and fonts are pre-cached; API calls fall back gracefully when offline

---

## 19. API Endpoints Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Log in, set JWT cookie |
| `POST` | `/api/auth/logout` | Any | Clear JWT cookie |
| `GET` | `/api/auth/seed` | Public | Seed demo data |
| `GET` | `/api/health` | Public | Health check + DB status |
| `GET/POST` | `/api/attendance` | Employee | Get/create attendance record |
| `GET/POST` | `/api/leaves` | Employee | Get/submit leave requests |
| `GET/POST` | `/api/tasks` | Employee | Get/update assigned tasks |
| `GET` | `/api/notifications` | Employee | Fetch in-app notifications |
| `GET/POST` | `/api/admin/employees` | Admin | List/create employees |
| `PUT/DELETE` | `/api/admin/employees/[id]` | Admin | Update/delete employee |
| `GET/POST` | `/api/admin/templates` | Admin | List/create templates |
| `PUT/DELETE` | `/api/admin/templates/[id]` | Admin | Update/delete template |
| `GET/POST` | `/api/admin/tasks` | Admin | List/create tasks |
| `PATCH/DELETE` | `/api/admin/tasks/[id]` | Admin | Update/delete task |
| `GET` | `/api/admin/attendance` | Admin | All attendance records |
| `GET/POST` | `/api/admin/holidays` | Admin | List/create holidays |
| `DELETE` | `/api/admin/holidays/[id]` | Admin | Delete holiday |
| `GET` | `/api/admin/reports` | Admin | Aggregated reports |
| `GET` | `/api/admin/overview` | Admin | Live dashboard data |
| `GET` | `/api/admin/audit-logs` | Admin | Audit trail |
| `GET` | `/api/admin/monthly-grid` | Admin | Monthly grid data |

---

## 20. Known Limitations

- ❌ **No email notifications** — approvals/rejections are visible only in-app; no email sent
- ❌ **No biometric integration** — check-in is web-based; not linked to any fingerprint/face device
- ❌ **No payroll calculation** — hours tracked but salary computation is out of scope for MVP
- ❌ **No WhatsApp integration** — WhatsApp alerts/notifications not implemented in v1
- ❌ **Single organisation** — multi-tenancy not supported; single MongoDB database per deployment

---

## 21. Roadmap

| Feature | Priority | Notes |
|---|---|---|
| 📧 Email notifications | High | Nodemailer / SendGrid for approval emails |
| 💬 WhatsApp integration | High | Twilio / WATI API for check-in/out alerts |
| 🔁 Recurring tasks | Medium | Cron-based auto-creation of daily/weekly tasks |
| 💰 Payroll module | Medium | Hours → salary computation with configurable rates |
| 📊 Advanced analytics | Low | Charts dashboard with Chart.js / Recharts |
| 🌐 Multi-tenancy | Low | Separate namespaced DBs per organisation |
| 🔔 Push notifications | Low | Web Push API for browser notifications |

---

*Built with ❤️ for REIZ Media — © 2026 REIZ Media. Internal use only.*
# reiz_panel
