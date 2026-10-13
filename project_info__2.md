I'm in **Explore Mode** — a codebase investigation mode. I can't edit files or make changes here. **To actually change the image and fix the registration flow, switch to Act Mode using the mode selector at the bottom of the chat.** Your findings below carry over as context.

In the meantime, I explored the codebase and **diagnosed both of your issues precisely**. Full report saved to **`project_info__1.md`** in the project root.

---

# CargoSpace — Codebase Overview

## Summary

CargoSpace is a two-part prototype web app for a **shared cargo-container marketplace**. Traders search for leftover/unused capacity (CBM) inside partially filled containers across Road/Rail/Sea/Air lanes, compare providers, book a slot, pay (mock), and chat with an admin. A separate admin console tracks bookings, processes cancellations and refunds, and answers traders over live chat.

It is a **prototype-grade** codebase: most dashboard UI renders hardcoded mock data from `Frontend/data/mockData.js`, while a real Express + SQLite backend at `backend/server.js` powers only authentication, bookings/payments, refunds, and chat. **This mock-vs-real split is the single most important thing to understand about this repo — and it is the direct cause of your bug.**

## Architecture

**Pattern:** React SPA (Vite) + a monolithic single-file Express API, joined by Vite's dev proxy. No state library, no ORM, no migration framework, no tests, no TypeScript.

- **Frontend** — React 19 + React Router 7 + Tailwind CSS v4 (via `@tailwindcss/vite`, configured through the CSS `@theme` block rather than a `tailwind.config.js`). There is **no `src/` root** — the app lives in a top-level `Frontend/` folder.
- **Backend** — a single ~500-line `backend/server.js` that owns everything: schema creation, seed data, ~20 REST routes, and a Socket.IO server. Persistence is **`better-sqlite3`** (synchronous, no `await`) writing to `backend/cargospace.db`.
- **Transport** — REST for CRUD, Socket.IO for push (`booking_created`, `booking_cancelled`, `booking_refunded`, `new_message`).
- **Entry points** — `index.html` (root) loads `/Frontend/main.jsx` → `App.jsx`. Backend starts with `node backend/server.js`.

**How execution starts**

1. `npm run dev` → Vite on port **5173** (`server.open: true`), proxying every `/api` request to `http://localhost:5000`.
2. `npm start` → `node backend/server.js`. On boot it runs `createTables()`, `ensureSampleAdmin()`, `ensureSampleUser()`, `ensureSampleBookings()`, then `httpServer.listen(5000)`.
3. `index.html` → `Frontend/main.jsx` → `createRoot` → `App.jsx` → layout + page.

**Authentication model (non-standard — read carefully)**

There is **no session, no JWT, no cookie, no middleware chain.** Identity is asserted by the client:

- The browser stores the whole user row in `localStorage.cargospace_user` (or `cargospace_admin`) after `/api/login` or `/api/register`.
- Every protected request manually attaches `x-user-id: <user_id>` or `x-admin-id: <admin_id>`.
- `getIdentity(req)` reads that header and looks the row up in SQLite; `requireIdentity(req, res, role)` 401s if missing or mismatched.
- Socket.IO does the same via `socket.handshake.auth.userId` / `.adminId`.

Consequence: **anyone can impersonate any user by editing localStorage.** Fine for a prototype; must never ship.

**Domain model (SQLite, created in `createTables()`)**

| Table | Purpose | Notes |
|---|---|---|
| `users` | Traders | `user_id` TEXT unique public ID; has `alternate_name`; **no `company`, `phone`, or `location` columns** |
| `admins` | Admin accounts | Separate table, separate ID space (`ADM-…`) |
| `legacy_users` | Imported historical accounts | Populated only by `POST /api/legacy-user`; never merged into login |
| `bookings` | Reservations + payments | `payment_status`, `cancellation_reason`, `cancelled_at`, `refund_status`, `refund_amount`, `refunded_at`, `slot_start_time`, `slot_end_time` |
| `chat_messages` | Per-booking chat | `sender_role`, `read_status`; receiver defaults to the **first active admin** — no per-booking assignment |

Two seeded accounts, created idempotently if absent:

- Admin: `admin@cargospace.com` / `admin123` (`ADM-SAMPLE-001`)
- Trader: `trader@cargospace.com` / `password` (`USR-SAMPLE-001`, name "Ananya Mehta")

⚠️ The root `README.md` advertises **different** demo credentials (`trader@cargospace.in`, `admin@cargospace.in`) and a "Provider" role that **does not exist in the code**. The README is stale — trust `server.js` and the hint text in `Login.jsx`.

## Directory Structure

```
CargoSpace/
├── index.html                    — Vite HTML shell; loads /Frontend/main.jsx
├── package.json                  — "dev" = vite, "start" = node backend/server.js
├── vite.config.js                — React + Tailwind v4; /api proxy → :5000; 100ms polling watch
├── README.md                     — STALE (wrong demo emails, nonexistent Provider role)
│
├── Frontend/                     — ⭐ THE LIVE APPLICATION
│   ├── main.jsx                  — createRoot + StrictMode
│   ├── App.jsx                   — All routes (public, auth, admin, dashboard)
│   ├── index.css                 — ⭐ Tailwind @theme tokens + ALL custom CSS
│   ├── assets/                   — Images AND two stray dead components
│   ├── components/               — AuthShell, Navbar, Sidebar, Map, Chat*, Container*, Stats*
│   ├── data/mockData.js          — ⭐ ALL mock data incl. traderProfile
│   ├── hooks/, services/, utils/, context/   — present but effectively empty
│   ├── layouts/                  — PublicLayout, DashboardLayout
│   └── pages/                    — Home, Login, Register, Dashboard, Settings, Bookings, …
│
├── backend/
│   ├── server.js                 — ⭐ Entire API: schema, seeds, 20 routes, Socket.IO
│   └── cargospace.db             — Committed SQLite file
│
├── cargospace/                   — ❌ Abandoned Vite scaffold
├── cargospcae/                   — ❌ Abandoned Vite scaffold (name typo)
├── public/                       — favicon.svg, icons.svg
└── dist/                         — Build output
```

**Three near-identical frontend folders exist.** Only `Frontend/` is wired up. `cargospace/` and `cargospcae/` are leftover Vite scaffolds with their own `package.json` and `node_modules` — dead weight that will confuse any repo-wide grep. `cargospcae` is a misspelling of `cargospace`.

## Key Abstractions

### `App` / Router (`Frontend/App.jsx`)
- **Responsibility:** Declares every route and its layout wrapper.
- **Structure:** `/` is public (Navbar/Footer). `/login`, `/register`, `/admin/login` render bare via `AuthShell`. `/admin` renders `AdminDashboard` bare. Everything else (`/dashboard`, `/containers`, `/booking`, `/payment`, `/bookings`, `/shipments`, `/chat`, `/notifications`, `/settings`) sits inside `DashboardLayout`.
- **Notable:** **No route guard component.** Protection is ad-hoc inside pages.

### `AuthShell` (`Frontend/components/AuthShell.jsx`)
- **Responsibility:** Shared two-panel frame for Login, Register, AdminLogin.
- **Structure:** 640px card on `lg`; left 40% is a full-bleed `transportImage` under `bg-gradient-to-t from-navy-950 via-navy-900/35 to-navy-950/20`. Right side scrolls independently.
- **Gotcha:** Uses the **same hero JPEG** as `Home.jsx` — the filename contains a **literal space and `(1)`**, so it must be `import`ed, never written as a string URL.

### `Sidebar` (`Frontend/components/Sidebar.jsx`) — ✅ correct user-data pattern
- **Responsibility:** Dashboard nav + logged-in user mini-card.
- **Key line:** `const user = JSON.parse(localStorage.getItem('cargospace_user') || 'null')` then `const name = user?.name || traderProfile.name`.
- **This is the reference implementation** `Dashboard.jsx` and `Settings.jsx` should copy.

### `Navbar` (`Frontend/components/Navbar.jsx`) — ✅ correct user-data pattern
- Public top bar; swaps Login/Register for avatar + name + hover profile flyout when `cargospace_user` exists. Derives `initials` from `user.name`.
- Also runs its **own** `watchPosition` geolocation loop and renders `DeviceLocationStatus`.
- **Duplicate:** near-identical `Navbar.jsx` and `Home.jsx` also sit under `Frontend/assets/` — **not imported anywhere**.

### `Home` (`Frontend/pages/Home.jsx`)
- Landing page: hero, 6-field search form, live map section, "How CargoSpace Works", location-filtered "Available Space Near You", About block. ~300 lines, the largest page.
- **Data:** mixes a local `nearbySpaces` array literal, `mockData.js` exports, and real geolocation.
- **Non-obvious:** runs **two** geolocation subscriptions and a 6-argument `applyLocationFallback()` helper that takes five setter functions and pushes sets directly.

### `ChatProvider` / `ChatDrawer` / `AdminChatPanel`
- Socket.IO lifecycle, per-booking rooms, unread counts.
- **Contract:** `join_booking(bookingId)`; server authorizes via `getPaidBooking()`, which only returns a booking when `payment_status === 'PAID'` **and** `status` is `Confirmed` or `In Transit`.
- **Gotcha:** cancelling a booking immediately and permanently closes its chat room.

### There is no API client module
`Frontend/services/` is effectively empty. Every page calls bare `fetch('/api/...')` inline and hand-writes its own `x-user-id` header. If you add an endpoint, you must remember the header by hand.

## Data Flow

**Flow A — Registration (where your bug lives)**

1. `Register.jsx` collects `fullName`, `alternateName`, `company`, `email`, `password`.
2. POSTs `{ name: form.fullName, alternateName, company, email, password, role: 'user' }`.
3. **`server.js` destructures only `{ name, alternateName, email, password, role }`. `company` is never bound and never inserted**, and there is no `company` column.
4. Server inserts into `users` (with `alternate_name`), re-selects the row, returns `{ success, message, user: row }` (HTTP 201).
5. `Register.jsx` writes `data.user` to `localStorage.cargospace_user`, then `nav('/dashboard')`.
6. `DashboardLayout` mounts → `Sidebar` + `Navbar` read localStorage → **they show the new name correctly.**
7. `Dashboard.jsx` renders → **ignores localStorage, prints hardcoded "Welcome back, Ananya" / "Mehta Export House".**
8. `Settings.jsx` renders → **`useState(traderProfile)` from `mockData.js` — shows "Ananya Mehta" / "ananya@mehtaexports.in" / "+91 98765 43210".**

**Flow B — Login:** `Login.jsx` POSTs to `/api/login`; server checks `admins` first, then `users` (plaintext). Traders → `cargospace_user` + `/dashboard`. Admins → `cargospace_admin` + `window.open('/admin', '_blank')` (new tab, with client-side nav fallback).

**Flow C — Booking → Payment → Chat:** `FindSpace.jsx` (mock containers) → `/booking?container=<id>` → `Booking.jsx` (date + `HH:MM` arrival window) → `Payment.jsx` POSTs `/api/payments/confirm` → server validates slot times with `isClockTime` and `slotEndTime > slotStartTime`, 403s if the booking belongs to another user, then **upserts** (UPDATE if `booking_id` exists, else INSERT) to `Confirmed`/`PAID` → emits `booking_created` → chat unlocks.

**Flow D — Cancellation & refund:** trader cancels with a reason → `Cancelled` + `refund_status = PENDING` → admin "Refund queue" filters `status === 'Cancelled' && payment_status === 'PAID'` → `POST /api/admin/bookings/:bookingId/refund` sets `REFUNDED`, `refund_amount`, `refunded_at`, emits `booking_refunded`.

**Flow E — Account deletion:** `DELETE /api/account` (password-confirmed) runs a transaction: delete the user's chat messages, **null out `bookings.user_id` rather than deleting bookings** (financial records survive), then delete the user row.

## Non-Obvious Behaviors & Design Decisions

### The mock/real split is the dominant architectural fact
`mockData.js` is imported by nearly every dashboard page. Only **users/admins, bookings, and chat** are genuinely SQLite-backed. Containers, shipments, stats, and the trader profile are fiction. So when you "add a user," the user is real but the containers they browse are not — and the *pages that display the user* were written against the fictional `traderProfile`, not the real one.

### `traderProfile` is a decoy
```js
export const traderProfile = {
  name: 'Ananya Mehta',
  businessName: 'Mehta Export House',
  role: 'Textile Exporter',
  email: 'ananya@mehtaexports.in',
  phone: '+91 98765 43210',
  location: 'Mumbai, Maharashtra',
  memberSince: '2024-06-18',
  ...
}
```
Its email **does not match** the seeded DB user (`trader@cargospace.com`). The mock profile and the seeded user are two different fictional people with the same name. A developer adding a field to registration will see it "work" in the sidebar and "not work" in settings, then blame the backend — when the truth is settings never reads the backend.

### `company` is accepted by the UI and thrown away by the API
The sharpest edge in the repo. `Register.jsx` renders a "Company" input, includes it in the POST body, and `Settings.jsx` renders `businessName`. But `users` has no company column, `/api/register` never binds the value, and no endpoint can read or write it. **Pure UI decoration today.**

### Identity payloads are intentionally narrow — and inconsistent
- `getIdentity()` returns only `{ id, name, email, role }` — so `alternate_name` is **not** available to any authenticated endpoint.
- `/api/register` and `/api/login` return the **entire row** (`SELECT *`) including the plaintext `password`, which is then written into `localStorage`. Never ship this.

### Three separate "profile" surfaces, two data sources
| Surface | Source | Correct? |
|---|---|---|
| `Navbar.jsx` avatar/flyout | `localStorage.cargospace_user` | ✅ |
| `Sidebar.jsx` user card | `localStorage.cargospace_user` | ✅ |
| `Dashboard.jsx` greeting | **Hardcoded string literal** | ❌ |
| `Settings.jsx` profile panel | **`mockData.traderProfile`** | ❌ |
| `AdminDashboard.jsx` header | `localStorage.cargospace_admin` | ✅ |

### `Settings.jsx`'s "Edit Profile" is a dead end
"Edit Profile" toggles `editing`, swapping `<span>`s for `<input>`s wired to `setProfile`. **The edits evaporate on re-render or "Done editing"** — `traderProfile` is a module constant and nothing persists. There is no `PUT /api/users/:id` anywhere.

### Admin chat has no assignment model
The receiver is always `SELECT admin_id FROM admins WHERE status='active' ORDER BY id LIMIT 1` — **the lowest-ID active admin gets everything.** Add a second admin and messages still route only to the first, while both can see the thread. No active admin → 503 "Admin support is currently unavailable."

### Hardcoded content-safety filter
Both the REST and socket message paths run the identical regex `/\b(card number|cvv|cvc|otp|password)\b/i` and reject with "Payment credentials cannot be sent in chat." Messages are capped at **2000 characters**. Duplicated verbatim in two places — change both.

### Schema migrations are hand-rolled `PRAGMA` checks
`createTables()` runs `CREATE TABLE IF NOT EXISTS`, then reads `PRAGMA table_info(bookings)`/`(users)` and issues individual `ALTER TABLE ... ADD COLUMN` for any missing column. Any new column **must** be added to both the `CREATE TABLE` block *and* a matching `if (!columns.includes(...))` guard, or existing DBs break while fresh ones work. `cargospace.db` **is committed to the repo**, so everyone inherits someone's local data.

### Module-level seeding before `listen()`
`ensureSampleAdmin()`, `ensureSampleUser()`, `ensureSampleBookings()` run at import time. `ensureSampleUser()` returns the sample ID, used to backfill `BK-4412` to `PAID`/`Confirmed` on every boot (idempotent). The other two seeded bookings keep `user_id = NULL` and belong to nobody — a trader sees only `BK-4412` from `/api/my-bookings`, even though the mock `Bookings.jsx` fallback shows all three.

### `Bookings.jsx` has a deliberate dual mode
```js
const [bookings, setBookings] = useState(() => {
  const user = JSON.parse(localStorage.getItem('cargospace_user') || 'null')
  return user?.user_id ? [] : initialBookings.map(normalizeBooking)
})
```
Not logged in → mock bookings. Logged in → empty, then fetch `/api/my-bookings`. `normalizeBooking()` is a snake_case→camelCase shim (`booking_id`, `container_id`, `booking_date`, `cancelled_at`, `slot_start_time`). **Every DB-backed page needs this shim** — the server returns raw snake_case rows.

### Error propagation is per-page and defensive
- Every `submit` wraps `fetch` in try/catch and sets a local `error` string rendered as a red box.
- Deliberate pattern: check `response.headers.get('content-type')` before `.json()`, and when the server isn't running show *"The backend server is not running. Start it with: cd backend && npm start"* — converting a Vite proxy 500 into a helpful message.
- Server-side, `SQLITE_CONSTRAINT_UNIQUE` → 409 "A user with this email already exists." Everything else → 500 with `error.message` leaked.
- **`GET /api/users` and `GET /api/admin/:adminId` have no auth check at all** — they dump every user/admin/legacy row including plaintext passwords.

### Performance / intentional choices
- `useMemo` guards the O(n·m) geolocation work in `Home.jsx`.
- `better-sqlite3` is synchronous — queries block the event loop (fine at this scale).
- `vite.config.js` sets `watch: { usePolling: true, interval: 100 }` — likely a WSL/VM workaround; CPU-hungry on native Windows.
- `db.transaction(...)` is used for seeding and account deletion, but **not** for the payment upsert.

---

## ⚠️ Diagnosed Issues: Your Two Reported Bugs

### Issue 1 — "make image more light blue, it is not visible by the naked eye"

All hero image styling lives in **`Frontend/index.css`** — **not** in `Home.jsx`:

```css
.hero-grid { background-color: #0b1f3a; /* + blue 1px grid + two radial glows */ }

.hero-background-image {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: center;
  opacity: 0.52;                                        /* ← 48% of the photo is hidden */
  filter: saturate(1.08) brightness(1.18) contrast(1.02);
  transform: scale(1.04);
  animation: hero-landscape-reveal 1.1s ease-out both;
}

.hero-background-fade {
  position: absolute; inset: 0;
  background: linear-gradient(90deg,
    rgba(15, 58, 112, 0.75) 0%,
    rgba(30, 100, 178, 0.50) 48%,
    rgba(69, 153, 220, 0.34) 100%);   /* ← heavy navy veil ON TOP of the photo */
}

@keyframes hero-landscape-reveal {
  from { opacity: 0;    transform: scale(1.1); }
  to   { opacity: 0.52; transform: scale(1.04); }   /* ← `both` fill also pins 0.52 */
}
```

**Why it looks invisible:** two independent washes stack. The photo is at `opacity: 0.52`, and then `.hero-background-fade` — a **navy** gradient at 75%/50%/34% alpha — covers it. Multiply those out and the **left third of the hero shows almost no photograph at all**; only the far right retains detail. Also, `@media (prefers-reduced-motion: reduce)` sets `.hero-background-image { animation: none }`, but since the base rule also declares `opacity: 0.52` the result is identical. **There is no state in which this image renders at full opacity.**

The four levers to make it "more light blue," in order of impact:
1. **Raise `.hero-background-image { opacity }`** — `0.52` → `~0.75`. Biggest single change.
2. **Lighten `.hero-background-fade`** — lower the alphas, e.g. `0.45 / 0.28 / 0.14`.
3. **Lighten `.hero-grid { background-color }`** away from `#0b1f3a` (the `--color-navy-900` token).
4. **Add a blue tint in `filter`** — e.g. `saturate(1.1) brightness(1.2) hue-rotate(-8deg)` — or lower `.hero-grid`'s radial alpha of `0.35`.

> ⚠️ **Critical gotcha:** if you change `opacity` in the base rule, you **must also change the `to { opacity: … }` value inside `@keyframes hero-landscape-reveal`**. With `animation-fill-mode: both`, the keyframe's `to` value wins forever after the animation ends — editing only the base rule will appear to do nothing.

Separately, **`AuthShell.jsx`** (login/register panel) uses the *same* JPEG at **full opacity** under `bg-gradient-to-t from-navy-950 via-navy-900/35 to-navy-950/20`. If the "invisible" image you mean is on the **login/register** screen, that Tailwind gradient — not any opacity — is what to lighten.

Also note the asset filename contains **spaces and parentheses**: `assets/logistics-means-transport-together-with-technological-futuristic-holograms (1).jpg` — it must be `import`ed, never used as a bare string URL.

### Issue 2 — "when I create the new user the name and other details are not updated"

**The backend is not the problem.** `/api/register` correctly inserts `name`, `alternate_name`, `email`, `password`, `role` and returns the whole row; `Login.jsx`/`Register.jsx` correctly persist it to `localStorage.cargospace_user`; `Navbar.jsx` and `Sidebar.jsx` correctly read it back. There are **four** concrete defects:

**1. `Frontend/pages/Dashboard.jsx` — hardcoded identity**
```jsx
<h1 className="text-2xl font-extrabold text-navy-900">Welcome back, Ananya</h1>
<p className="text-sm text-slate-500">Mehta Export House · leftover CBM near Mumbai</p>
```
Pure string literals. No prop, no localStorage read. **Every user of every account sees "Ananya."**
*Fix:* read `JSON.parse(localStorage.getItem('cargospace_user'))` and interpolate `user.name`, exactly as `Sidebar.jsx` does.

**2. `Frontend/pages/Settings.jsx` — profile panel bound to the mock object**
```jsx
const [profile, setProfile] = useState(traderProfile)   // from ../data/mockData
```
Everything rendered from `profile` — avatar initials, name, `businessName`, `email`, `phone`, `location`, `memberSince` — is Ananya's fiction, regardless of who signed in.
*Fix:* seed state from `localStorage.cargospace_user` with `traderProfile` as fallback, and map the DB's `alternate_name` into the display.

**3. `backend/server.js` — `company` is silently discarded on registration**
```js
app.post('/api/register', (req, res) => {
  const { name, alternateName, email, password, role = 'user' } = req.body || {}
  ...
  ? db.prepare('INSERT INTO users (user_id, name, alternate_name, email, password, role) VALUES (?,?,?,?,?,?)')
```
`Register.jsx` sends `company`, but it's never destructured, never inserted, and **there is no `company` column in `users`** (`createTables()` declares only `name`, `alternate_name`, `email`, `password`, `role`, `created_at`, `status`). So even a fixed `Dashboard.jsx` cannot display a company.
*Fix requires three coordinated edits:* add a `company` column to the `CREATE TABLE users` block, add the matching `if (!userColumns.includes('company')) db.exec('ALTER TABLE users ADD COLUMN company TEXT')` guard for existing DBs, and add `company` to both the destructure and the `INSERT`.

**4. There is no profile-update endpoint at all**
`UPDATE users` appears exactly once in `server.js` — the password change in `/api/account/change-password`. There is no `PUT /api/users/:id` and no `PATCH /api/account`; nothing writes `name`, `alternate_name`, `company`, `phone`, or `location`. `Settings.jsx`'s "Edit Profile" toggles inputs but saves nowhere. So "details are not updated" is **literally true by construction**, not just visually.

**Bonus defect — `alternate_name` is unreachable after login.** `getIdentity()` does `SELECT user_id AS id, name, email, role FROM users …`, omitting `alternate_name` and `company`. Any future "show my preferred name" feature must widen this SELECT.

**Bonus defect — `Navbar`/`Sidebar` never re-render on profile change.** Both read localStorage **inline in the component body**, not via `useState` + a `storage` event listener. Concurrent tabs or an in-app profile write won't propagate. Register works only because `nav('/dashboard')` forces a fresh mount.

**Quick verification recipe:** register with a distinctive name (e.g. "ZZZ Test"), then check:
- (a) sidebar bottom card → shows "ZZZ Test" ✅
- (b) `/dashboard` heading → still "Welcome back, Ananya" ❌
- (c) `/settings` → still "Ananya Mehta / ananya@mehtaexports.in" ❌
- (d) the Company value → gone forever ❌

## Module Reference

| File | Purpose |
|---|---|
| `index.html` | Vite HTML shell; the only place `/Frontend/main.jsx` is referenced |
| `vite.config.js` | React + Tailwind v4 plugins; **`/api` → `localhost:5000` proxy**; 100ms polling watcher |
| `package.json` (root) | `dev` = vite (5173), `start` = `node backend/server.js` |
| `README.md` | **Stale** — wrong demo emails, nonexistent "Provider" role, claims "no backend yet" |
| `backend/server.js` | **Entire backend**: schema + `PRAGMA` migrations, 3 seed routines, auth, bookings, payments, refunds, chat, Socket.IO, `getIdentity`/`requireIdentity`/`getPaidBooking` |
| `backend/cargospace.db` | Committed SQLite database — inherits the last committer's data |
| `Frontend/main.jsx` | `createRoot` + `StrictMode` (double-invokes effects in dev) |
| `Frontend/App.jsx` | All routes; no guards |
| `Frontend/index.css` | **Tailwind `@theme` tokens + ALL custom CSS**: hero image/fade/keyframes, map SVG classes, `.auth-input`, `.capacity-fill`, reduced-motion block |
| `Frontend/data/mockData.js` | **All mock domain data** + `formatInr`/`formatDate`/`usedPercent`/`getCityCoordinates`. ⚠️ `traderProfile` lives here |
| `Frontend/components/AuthShell.jsx` | Login/register split-panel frame; full-opacity hero JPEG under a navy gradient |
| `Frontend/components/Navbar.jsx` | Public nav; ✅ reads `cargospace_user`; hover profile flyout; own geolocation watcher |
| `Frontend/components/Sidebar.jsx` | Dashboard nav; ✅ **reference pattern** for reading `cargospace_user` |
| `Frontend/components/ChatProvider.jsx` | Socket.IO client + chat context; `useChat()`/`openChat()` |
| `Frontend/components/ChatDrawer.jsx` | Slide-in trader↔admin chat panel (`chat-drawer-enter` animation) |
| `Frontend/components/AdminChatPanel.jsx` | Admin-side chat across all paid bookings |
| `Frontend/components/Map.jsx` | Hand-rolled SVG map (landmass paths, dashed grid, animated pins, `.cargo-*` classes) + `livePosition` pulse |
| `Frontend/components/ContainerCard.jsx` | Container listing card (`usedPercent`, `formatInr`) |
| `Frontend/components/ContainerVisual.jsx` | `ContainerYard` decorative SVG/CSS illustration |
| `Frontend/components/StatsCard.jsx` | Icon + label + value metric tile |
| `Frontend/components/TransportIcon.jsx` | Maps Road/Rail/Sea/Air → Lucide icons |
| `Frontend/layouts/PublicLayout.jsx` | Navbar + Outlet + Footer |
| `Frontend/layouts/DashboardLayout.jsx` | ChatProvider + Sidebar + mobile header + ChatDrawer + `page-enter` transition |
| `Frontend/pages/Home.jsx` | Landing page; hero, search, geolocation, map, "How it works", About |
| `Frontend/pages/Login.jsx` | Trader/admin sign-in; writes `cargospace_user` / `cargospace_admin` |
| `Frontend/pages/Register.jsx` | ⚠️ **Sends `company`, which the backend discards**; stores returned row in localStorage |
| `Frontend/pages/AdminLogin.jsx` | Admin sign-in (`admin@cargospace.com` / `admin123`) |
| `Frontend/pages/Dashboard.jsx` | ⚠️ **Hardcoded "Ananya"**; mock bookings/shipments/stats |
| `Frontend/pages/Settings.jsx` | ⚠️ **Bound to `traderProfile` mock**; working password-change/delete dialogs via `x-user-id` |
| `Frontend/pages/Bookings.jsx` | Dual-mode (mock vs `/api/my-bookings`) + `normalizeBooking()` snake→camel shim; cancel dialog |
| `Frontend/pages/FindSpace.jsx` | Container search/browse (mock data) |
| `Frontend/pages/Booking.jsx` | Slot date + arrival-window picker; validates `HH:MM` |
| `Frontend/pages/Payment.jsx` | Mock payment → `POST /api/payments/confirm` |
| `Frontend/pages/Chat.jsx` | Chat route surface |
| `Frontend/pages/Notifications.jsx` | Notifications list (mock) |
| `Frontend/pages/AdminDashboard.jsx` | Bookings table, refund queue, live Socket.IO updates |
| `Frontend/pages/Placeholder.jsx` | Stub for `/shipments` |
| `Frontend/assets/Home.jsx`, `Frontend/assets/Navbar.jsx` | **Dead duplicates** — not imported by anything |
| `cargospace/`, `cargospcae/` | **Dead Vite scaffolds** — not referenced by root `index.html` |

## Suggested Reading Order

1. **`README.md`** — 30 seconds, then **disregard it**. Note which claims are false (demo emails, "Provider" role, "no backend yet"). Knowing what *not* to trust saves hours.
2. **`index.html` → `Frontend/main.jsx` → `Frontend/App.jsx`** — establishes the app is `/Frontend/*` (not `src/`) and gives you the complete route map, including which routes are bare vs. wrapped in `DashboardLayout`.
3. **`backend/server.js`** — read once top to bottom. It's the whole backend in one file: `createTables()`, the three `ensure*` seeders, `getIdentity`/`requireIdentity`/`getPaidBooking`, then all routes. `createTables()` alone gives you the entire data model.
4. **`Frontend/components/Sidebar.jsx`** — ~100 lines. Read it specifically to see the **correct** `localStorage.cargospace_user` pattern (`user?.name || traderProfile.name`, initials, logout). You'll recognise it in `Navbar.jsx` — and its **absence** in `Dashboard.jsx`.
5. **`Frontend/data/mockData.js`** — the shared vocabulary. Skim `containers`/`bookings`, then study `traderProfile` closely; it's the object causing your bug.
6. **`Frontend/pages/Dashboard.jsx` + `Frontend/pages/Settings.jsx`** — read back-to-back. The bug is a two-line contrast: `Dashboard.jsx` interpolates a string literal where a name belongs; `Settings.jsx` calls `useState(traderProfile)` where `useState(localStorage… || traderProfile)` belongs.
7. **`Frontend/index.css`** — last, since it's the only place hero styling lives. Search `.hero-grid`, `.hero-background-image`, `.hero-background-fade`, and `@keyframes hero-landscape-reveal` to see the opacity + gradient stack.
8. *(Optional)* **`Frontend/pages/Bookings.jsx`** — the best example of the snake_case→camelCase `normalizeBooking()` shim you'll need whenever a page starts consuming a real API instead of mock data.

---

### What to do next

Switch to **Act Mode** (mode selector at the bottom of the chat) and the plan is short:

**For the hero image** — one file: `Frontend/index.css`. Raise `.hero-background-image { opacity: 0.52 }`, **and** update `@keyframes hero-landscape-reveal`'s `to { opacity: 0.52 }` to match, then optionally lighten `.hero-background-fade`'s three gradient alphas.

**For the user details** — three files: `Frontend/pages/Dashboard.jsx` (replace the hardcoded name with a localStorage read), `Frontend/pages/Settings.jsx` (seed `profile` from localStorage), and `backend/server.js` (add the `company` column + migration guard + bind it in `/api/register`) — plus a new `PUT /api/account` route if you want "Edit Profile" to actually save.

Ask me to go deeper on any of these before you switch, and I'll map out the exact edits.