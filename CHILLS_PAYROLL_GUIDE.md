# 🧾 Chills Payroll — Complete Guide
**Version:** 1.0 · **Prepared:** May 2026

---

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [User Accounts & Roles](#user-accounts--roles)
3. [Features — CEO Dashboard](#features--ceo-dashboard)
4. [Features — Kiosk (Attendance Taker)](#features--kiosk-attendance-taker)
5. [Database — Location & Structure](#database--location--structure)
6. [Automatic Backups](#automatic-backups)
7. [API Reference](#api-reference)
8. [Tech Stack](#tech-stack)
9. [Running the App](#running-the-app)
10. [Handover Notes](#handover-notes)

---

## System Overview

Chills Payroll is a **mobile-first attendance and payroll management system** built for Chills Ice Cream's daily factory operations. It runs as:
- A **React web app** (also packaged as an Android APK via Capacitor)
- A **Node.js + Express REST API** backend
- A **SQLite database** stored locally on the server machine

The system has **two types of users**:
| Who | What they use |
|---|---|
| **CEO / Admin** | Full CEO Dashboard — attendance, payroll, history, manual corrections |
| **Attendance Kiosk** | Simplified tablet kiosk — marks daily attendance only |

---

## User Accounts & Roles

### System Accounts (Always Present)

| Role | Username | Password | Purpose |
|---|---|---|---|
| CEO / Administrator | `priteshbegani` | `1984` | Full access dashboard |
| Attendance Kiosk | `chillsicecream` | `1978` | Daily attendance marking only |

> **Note:** These accounts are automatically re-created every time the server starts. They cannot be accidentally deleted through the app.

### Employee Accounts
All factory workers are stored in the database with role `employee`. They do **not** have dashboard login access — they are only tracked via attendance.

- Employees without a phone number get an auto-generated internal username
- Default password for all employees: `0000` (not used for login, just a DB placeholder)

---

## Features — CEO Dashboard

Login at the app with username `priteshbegani` / password `1984`.

### Home Tab — "Team"
- **Today's Pulse card**: Shows a live count of Present / Half Day / Absent / On Leave employees for today
- **Team Directory**: Lists all employees; supports search by name
- **Add Employee**: Creates a new worker with a name and monthly salary
- **Edit Employee**: Update name, salary, or role; change username/password for non-worker accounts
- **Delete Employee**: Permanently removes a worker and all their records (with confirmation)
- **Employee Stats Modal** (eye icon): Opens a full attendance history for any employee showing:
  - Total payout calculated to date
  - Present / Half Day / Absent / Leave day counts
  - Expandable list of absent and half-day dates
  - "Mark Present" button to correct any specific absent date

### Attendance Tab — "Quick Attendance"
- Lists **all staff alphabetically** (CEO excluded)
- **Two-step submit flow** to prevent misclicks:
  1. Tap one of the three icon buttons to *select* a status: Present / Half Day / Absent
  2. A **Submit button** appears — tap it to **lock/freeze** the row
- Once submitted, the row turns coloured and the status is **frozen** (cannot be mis-tapped)
- Status badges: Green = Present, Amber = Half Day, Red = Absent, Blue = Leave
- Uses today's date automatically

### Payroll Tab — "Payroll Summary"
- Select a **custom date range** (From → To)
- **Select individual employees** (or use Select All / Deselect All)
- **Generate Summary** button computes, for each employee:
  - Days Present, Half Days, Absent, Leave
  - Daily rate (monthly salary ÷ 30)
  - **Total Payout** = (Present days × daily rate) + (Half days × daily rate ÷ 2)
  - Grand Total across all selected employees

### History Tab — "Recent History"
- Shows the last **7 days** of attendance logs grouped by date
- Each date row is **expandable** — tap to see each employee and their status
- **Export button** → opens a modal to export attendance as a **CSV file**:
  - Last 7 days / Last 15 days / Last 30 days
  - On Android (APK): saves to the device's Documents folder
  - On browser: triggers a standard file download

### Manual Tab — "Manual Correction"
- Three-step form to correct or backfill any record:
  1. **Search and select** an employee by name
  2. **Pick a date** (any past or future date)
  3. **Mark as** Present / Half Day / Absent / Leave
- Uses upsert — safely overwrites if a record for that date already exists
- Requires confirmation before saving

### Notification Bell (Home Tab)
- Shows a green dot when there are absences, half-days, or leaves logged today
- Tap to open a dropdown listing all today's absentees, half-day workers, and employees on leave

---

## Features — Kiosk (Attendance Taker)

Login with username `chillsicecream` / password `1978`. Designed for a tablet mounted in the factory.

### Daily Attendance Tab
- Same **two-step select + Submit** flow as the CEO Quick Attendance tab
- Only shows **employees** (role = `employee`)
- Sorted alphabetically

### Manual Correction Tab (Kiosk)
- Same three-step correction form as the CEO dashboard
- Limited to employee-role users (cannot modify CEO/kiosk accounts)

> The kiosk account has **no access** to payroll summaries, team management, or history exports.

---

## Database — Location & Structure

### File Location
The live database is stored **outside the project folder** so it survives app updates:

```
~/.chills-payroll/database.sqlite
```

On macOS/Linux this expands to: `/Users/dakshbegani/.chills-payroll/database.sqlite`  
On Windows it would be: `C:\Users\<username>\.chills-payroll\database.sqlite`

> There is also a `database.sqlite` inside the `backend/` project folder — this is NOT the live database; it is an unused development artifact.

### Tables

#### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `name` | TEXT | Display name |
| `username` | TEXT UNIQUE | Login username |
| `password` | TEXT | Plain text (internal use only) |
| `role` | TEXT | `ceo` / `attendance_taker` / `employee` |
| `salary` | REAL | Monthly salary in Rs |
| `created_at` | DATETIME | Auto-set on insert |

#### `attendance`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `user_id` | INTEGER FK | References `users.id` |
| `date` | TEXT | Format: `YYYY-MM-DD` |
| `status` | TEXT | `present` / `absent` / `half-day` / `leave` |
| `logged_by` | INTEGER FK | ID of the user who marked it |
| `created_at` | DATETIME | Auto-set on insert |

There is a `UNIQUE(user_id, date)` constraint — only one record per employee per day. Re-submitting overwrites the existing status (upsert).

---

## Automatic Backups

The server automatically **backs up the database every night at 11:59 PM**.

Backup files are saved to:
```
~/.chills-payroll/backups/database_backup_YYYY-MM-DD.sqlite
```

- Backups older than **30 days** are automatically deleted
- To restore a backup: stop the server, copy the chosen backup file to `~/.chills-payroll/database.sqlite`, then restart the server

---

## API Reference

The backend runs on **port 5001** by default.

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/api/login` | No | — | Returns a JWT token |
| GET | `/api/users` | JWT | CEO / Kiosk | List all users |
| POST | `/api/users` | JWT | CEO | Create new employee |
| PUT | `/api/users/:id` | JWT | CEO | Update employee details |
| DELETE | `/api/users/:id` | JWT | CEO | Delete employee |
| POST | `/api/attendance` | JWT | CEO / Kiosk | Mark or overwrite attendance |
| GET | `/api/attendance` | JWT | Any | Fetch logs (filterable by date range & user) |
| GET | `/api/attendance/stats/:userId` | JWT | CEO / Kiosk | Per-status counts for a user |

### Authentication
All protected routes require:
```
Authorization: Bearer <JWT token>
```

### Rate Limiting
200 requests per IP per 15 minutes (brute-force protection via `express-rate-limit`).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Framer Motion, Lucide Icons |
| Mobile Wrapper | Capacitor (Android APK) |
| Backend | Node.js, Express 4 |
| Database | SQLite via `better-sqlite3` |
| Auth | JWT (`jsonwebtoken`) |
| Scheduling | `node-cron` (nightly backup) |
| Security | `helmet`, `express-rate-limit`, CORS |

---

## Running the App

### Backend
```bash
cd backend
node index.js
# API server starts on http://localhost:5001
```

### Frontend (browser dev mode)
```bash
cd frontend
npm run dev
# Opens on http://localhost:5173
```

### Android APK
The APK communicates with the backend server via its local network IP. The API URL can be configured inside the app (Settings) or via `localStorage`. Example: `http://192.168.1.10:5001`

---

## Handover Notes

### Credentials (Keep Private)
| Account | Username | Password |
|---|---|---|
| CEO Dashboard | `priteshbegani` | `1984` |
| Kiosk / Attendance Taker | `chillsicecream` | `1978` |

### Maintenance Tips
- **Add an employee:** CEO Dashboard → Home → Add Employee
- **Fix a wrong attendance:** CEO Dashboard → Manual tab
- **Generate payroll:** CEO Dashboard → Payroll tab → select employees & date range → Generate
- **Download attendance history:** CEO Dashboard → History tab → Export
- **Restore from backup:** Copy a file from `~/.chills-payroll/backups/` to `~/.chills-payroll/database.sqlite` while the server is stopped

### Pre-Handover Checklist
- [x] All attendance records wiped (clean slate for client)
- [x] Employee list re-seeded with correct names and daily wages
- [x] CEO and Kiosk accounts preserved with their credentials
- [ ] Confirm server machine's local IP and set it as the API URL in the APK

---

*Document prepared for Chills Payroll v1.0 handover · May 2026*
