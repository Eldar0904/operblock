# OperBlock — Change Log

History of meaningful product and infrastructure changes, newest first.  
Derived from git commits on `main` (Jul 2026).

---

## 2026-07-24

### Daily: drag-and-drop completion
- Removed checkbox “mark done” on the Daily board.
- Complete / reopen by dragging between **Open** and **Done** (person tabs).
- General hub: drag Inbox / Collaborations into **Done** (and back).
- Unchanged: only your own tab (and General rules for inbox / collabs you’re on) can mutate; others stay view-only for edit/delete/complete.

### Task attachments (Cloudflare R2)
- Files stored in R2 bucket `operblock-files`; metadata in Neon `task_attachments`.
- Attach / list / download / delete in the task modal (Daily + projects).
- Attach while **creating** a task (files queued, uploaded after save).
- Max 10 MB; PDF, images, common Office types; private bucket; downloads via authenticated API.
- Env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`.
- Migration: `0009_task_attachments`.

---

## 2026-07-23

### Private projects
- Projects can be marked **private** (`is_private`).
- Title still visible in lists; non-creators cannot open contents or load tasks.
- Creator-only toggle on the project page.
- Migration: `0008_project_is_private`.

### Daily General hub & richer task model
- **General** tab: Inbox (unassigned) | Collaborations (2+ participants).
- Person tabs with real names; **Paused** / **Canceled** tabs.
- Multi-participant assignees via `task_assignees`.
- Due dates as datetimes (`timestamptz` + datetime picker).
- Own-tab mutate locks for Daily.
- Migration: `0007_status_participants_due`.

### Daily layout
- Open and Done columns side by side on desktop.

---

## 2026-07-22

### Branding & landing
- PINE / OperBlock header branding; brand-free hero title.
- Welcome / My Tasks copy clarified.
- Footer: © PINE + “Built for high-performance teams.”

### Daily navigation UX
- Switched from person **columns** to person **tabs**.

---

## 2026-07-21

### Dashboard “Momentum”
- Overview rebuilt around Daily vs Projects split.
- Goals removed from the main Dashboard strip (Goals remain a separate page).

### Inbox removed
- Inbox feature removed; CP daily tasks moved onto the Daily board.
- Migration: `0006_move_cp_tasks_to_daily`.

### Projects hub & portfolios
- Projects nav opens a multi-project hub by default.
- Editable **portfolios** for sidebar grouping.
- Migration: `0005_add_portfolios`.

### Goals & permissions
- Real Goals CRUD linked to projects (progress from task completion).
- Creator-only project delete (and related creator fields).
- Migration: `0004_add_goals`, `0003_add_project_created_by`.

### Daily board v1 → person columns
- Shared Daily board with team-visible assignees.
- Person columns + task **comments**.
- Reports: velocity split into Daily vs long-term projects.

### Projects UX
- Sidebar project list, create, switcher.
- Create project when none exists; delete project from UI.

### Deploy
- Railway config (`railway.toml`, checklist); migration failure hardening.
- Earlier: Render deploy prep (`render.yaml`, checklist).

---

## 2026-07-20

### Production readiness
- One-service deploy model: Express serves API + Vite `dist`.
- Neon Postgres + Clerk auth for production.

---

## Commit reference (short)

| Date | Commit | Summary |
|------|--------|---------|
| 2026-07-24 | `9cdbef5` | Daily DnD completion |
| 2026-07-24 | `e256d7a` | Attach files while creating tasks |
| 2026-07-24 | `6d429d0` | R2 task attachments |
| 2026-07-23 | `19f0079` | Private projects |
| 2026-07-23 | `142089a` | General hub, pause/cancel, datetime |
| 2026-07-23 | `d471eb0` | Open \| Done side by side |
| 2026-07-22 | `bdc44bb` / `dd5b658` / `142b1ec` | Landing & PINE branding |
| 2026-07-22 | `3d5f19e` | Daily person tabs |
| 2026-07-21 | `0c78908` … `4c7f909` | Momentum, hub, portfolios, goals, Daily, Railway |
| 2026-07-20 | `9166652` | Render deploy prep |

For full diffs: `git log` / `git show <hash>`.

---

## Database migrations (order)

| # | File | Purpose |
|---|------|---------|
| 0000 | `0000_initial.sql` | Core org / project / task schema |
| 0001 | `0001_add_is_personal.sql` | Personal (Daily) projects |
| 0003 | `0003_add_project_created_by.sql` | Project creator |
| 0004 | `0004_add_goals.sql` | Goals + links |
| 0005 | `0005_add_portfolios.sql` | Portfolios |
| 0006 | `0006_move_cp_tasks_to_daily.sql` | Move CP tasks to Daily |
| 0007 | `0007_status_participants_due.sql` | Statuses, participants, due timestamptz |
| 0008 | `0008_project_is_private.sql` | Private projects |
| 0009 | `0009_task_attachments.sql` | Attachment metadata (R2 keys) |
