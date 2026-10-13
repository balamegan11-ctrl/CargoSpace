# CargoSpace — Codebase Overview

> **Read this first:** The two problems you asked about are both diagnosed in detail in the section **"Diagnosed Issues: Your Two Reported Bugs"** near the bottom of this document. Short version: (1) the hero photo is *intentionally* rendered at 52% opacity over a dark navy background, so nothing about it is "invisible to the naked eye" — the achievable fix is in `Frontend/index.css`; (2) the new user's name/details **do** land in the database, but `Dashboard.jsx` hardcodes "Ananya" and `Settings.jsx` reads a static mock object instead of `localStorage`, and the backend silently **drops the `company` field entirely**.

---

## Summary

CargoSpace is a two-part prototype web app for a **shared cargo-container marketplace**. Traders search for leftover/unused capacity (measured in CBM) inside partially filled containers across Road/Rail/Sea/Air lanes, compare providers, book a slot, pay (mock), and chat with an admin. A separate admin console tracks bookings, processes cancellations and refunds, and answers traders over a live chat channel.

It is a **student/prototype-grade** codebase: the majority of the dashboard UI renders hardcoded mock data from `Frontend/data/mockData.js`, while a real Express + SQLite backend at `backend/server.js` powers only authentication, bookings/payments, refunds, and chat. **This split between "mock data" and "real data" is the single most important thing to understand about this repo — it is the direct cause of the bug you reported.**

## Architecture

**Pattern:** React SPA (Vite) + a monolithic single-file Express API, joined by Vite's dev proxy. No state library, no ORM, no migrations framework, no tests, no TypeScript.

- **Frontend** — React 19 + React Router 7 + Tailwind CSS v4 (via `@tailwindcss/vite`, configured through the CSS `@theme` block rather than a `tailwind.config.js`). All logic lives in per-page components; there is no `src/` root — the app lives in a top-level `Frontend/` folder.
- **Backend** — a single 500-line `backend/server.js` that owns everything: schema creation, seed data, ~20 REST routes, and a Socket.IO server. Persistence is **`better-sqlite3`** (synchronous, no async/await) writing to `backend/cargospace.db`.
- **Transport** — REST for CRUD, Socket.IO for push (`booking_created`, `booking_cancelled`, `booking_refunded`, `new_message`).
- **Entry points** — `index.html` (root) loads `/Frontend/main.jsx` → `App.jsx` (router). Backend starts with `node backend/server.js`.

**How execution starts**

1. `npm run dev` → Vite serves on port **5173** with `server.open: true`, and proxies every `/api` request to `http://localhost:5000`.
2. `npm start` (root `package.json`) → `node backend/server.js`. On boot it calls `createTables()`, `ensureSampleAdmin()`, `ensureSampleUser()`, `ensureSampleBookings()`, then `httpServer.listen(5000)`.
3. `index.html` → `Frontend/main.jsx` → `createRoot` → `App.jsx` (BrowserRouter with all routes) → layout + page.

**Authentication model (important, and non-standard)**

There is **no session, no JWT, no cookie, no middleware chain.** Identity is asserted by the client:

- The browser stores the whole user row in `localStorage.cargospace_user` (or `cargospace_admin`) after `/api/login` or `/api/register`.
- Every subsequent protected request manually attaches a header: `x-user-id: <user_id>` or `x-admin-id: <admin_id>`.
- The backend's `getIdentity(req)` reads that header and looks the row up in SQLite. `requireIdentity(req, res, role)` wraps it and 401s if missing or mismatched.
- Socket.IO does the same via `socket.handshake.auth.userId` / `.adminId`.

Consequence: **anyone can impersonate any user by editing localStorage.** This is fine for a prototype but must never ship.

**Domain model (SQLite, created in `createTables()`)**

| Table | Purpose | Notes |
|---|---|---|
| `users` | Traders | `user_id` TEXT unique public ID; has `alternate_name`; **no `company`, `phone`, or `location` columns** |
| `admins` | Admin accounts | Separate table, separate ID space (`ADM-…`) |
| `legacy_users` | Imported historical accounts | Populated only by `POST /api/legacy-user`; never merged into login |
| `bookings` | Reservations + payments | Rich lifecycle columns: `payment_status`, `cancellation_reason`, `cancelled_at`, `refund_status`, `refund_amount`, `refunded_at`, `slot_start_time`, `slot_end_time` |
| `chat_messages` | Per-booking chat | `sender_role`, `read_status`; receiver defaults to the **first active admin** because there is no per-booking admin assignment |

There are exactly **two seeded accounts**, created idempotently if absent:

- Admin: `admin@cargospace.com` / `admin123` (ID `ADM-SAMPLE-001`)
- Trader: `trader@cargospace.com` / `password` (ID `USR-SAMPLE-001`, name "Ananya Mehta")

⚠️ The root `README.md` advertises **different** demo credentials (`trader@cargospace.in`, `admin@cargospace.in`, and a "Provider" role that does not exist in the code). The README is stale — trust `server.js` and the hint text in `Login.jsx`.

## Directory Structure

```
CargoSpace/
├── index.html                    — Vite HTML shell; loads /Frontend/main.jsx
├── package.json                  — Root manifest: "dev" = vite, "start" = node backend/server.js
├── vite.config.js                — React + Tailwind v4 plugins; /api proxy → :5000; polling watch
├── README.md                     — STALE (lists wrong demo emails and a nonexistent Provider role)
│
├── Frontend/                     — ⭐ THE LIVE APPLICATION
│   ├── main.jsx                  — createRoot + StrictMode
│   ├── App.jsx                   — All routes: public, auth, admin, and dashboard
│   ├── index.css                 — ⭐ Tailwind @theme tokens + ALL custom CSS (hero, map, animations)
│   ├── assets/                   — Images AND two stray components (Home.jsx, Navbar.jsx — duplicates)
│   ├── components/
│   │   ├── AuthShell.jsx         — Split-panel login/register frame (photo left, form right)
│   │   ├── Login/Register inputs, Navbar, Sidebar, Footer, ChatDrawer, AdminChatPanel,
│   │   │   ChatProvider, ContainerCard, ContainerVisual, StatsCard, TransportIcon, Map
│   ├── data/mockData.js          — ⭐ ALL mock data: containers, bookings, shipments, traderProfile
│   ├── hooks/, services/, utils/, context/   — present but effectively empty/unused
│   ├── layouts/
│   │   ├── PublicLayout.jsx      — Navbar + Outlet + Footer
│   │   └── DashboardLayout.jsx   — ChatProvider + Sidebar + mobile header + ChatDrawer
│   └── pages/
│       ├── Home.jsx              — Landing page + hero + search + maps
│       ├── Login.jsx, Register.jsx, AdminLogin.jsx
│       ├── Dashboard.jsx         — ⚠️ hardcodes "Ananya"
│       ├── Settings.jsx          — ⚠️ reads static traderProfile mock
│       ├── FindSpace.jsx, Booking.jsx, Payment.jsx, Bookings.jsx
│       ├── Chat.jsx, Notifications.jsx, Placeholder.jsx, AdminDashboard.jsx
│
├── backend/
│   ├── server.js                 — ⭐ Entire API: schema, seeds, 20 routes, Socket.IO
│   ├── cargospace.db             — Committed SQLite file (checked into the repo)
│   └── package.json
│
├── cargospace/                   — ❌ Abandoned scaffold (untouched Vite template)
├── cargospcae/                   — ❌ Abandoned scaffold (untouched Vite template, name typo)
├── public/                       — favicon.svg, icons.svg (served at /)
└── dist/                         — Build output
```

**Three near-identical frontend folders exist.** Only `Frontend/` is wired up (`index.html` → `/Frontend/main.jsx`). `cargospace/` and `cargospcae/` are leftover Vite scaffolds with their own `package.json` and `node_modules` — dead weight that will confuse anyone doing a repo-wide grep. `cargospcae` is a misspelling of `cargospace`, evidence they were accidental duplicate creations.

## Key Abstractions

### `App` / Router (`Frontend/App.jsx`)
- **Responsibility:** Declares every route and which layout wraps it.
- **Structure:** `/` is public (Navbar/Footer). `/login`, `/register`, `/admin/login` render bare (no layout — they use `AuthShell`). `/admin` renders `AdminDashboard` bare. `/dashboard`, `/containers`, `/booking`, `/payment`, `/bookings`, `/shipments`, `/chat`, `/notifications`, `/settings` are wrapped in `DashboardLayout`.
- **Notable:** There is **no route guard component.** Protection is done ad-hoc inside pages (`AdminDashboard` redirects if no `cargospace_admin` in localStorage; `Settings`/`Bookings` just read localStorage and silently degrade).

### `AuthShell` (`Frontend/components/AuthShell.jsx`)
- **Responsibility:** The shared two-panel frame for Login, Register, and AdminLogin.
- **Structure:** A 640px-tall card on `lg`; left 40% is a full-bleed `transportImage` covered by `bg-gradient-to-t from-navy-950 via-navy-900/35 to-navy-950/20`. Right side scrolls independently (`overflow-y-auto`).
- **Gotcha:** It imports the same hero JPEG (`assets/logistics-means-transport-together-with-technological-futuristic-holograms (1).jpg`) that `Home.jsx` uses — note the **literal space and `(1)` in the filename**, which must be reproduced exactly in any import.

### `Sidebar` (`Frontend/components/Sidebar.jsx`) — ✅ correct user-data pattern
- **Responsibility:** Dashboard navigation + the logged-in user's mini-card.
- **Key line:** `const user = JSON.parse(localStorage.getItem('cargospace_user') || 'null')` then `const name = user?.name || traderProfile.name`.
- **This is the reference implementation** that `Dashboard.jsx` and `Settings.jsx` should copy.

### `Navbar` (`Frontend/components/Navbar.jsx`) — ✅ correct user-data pattern
- **Responsibility:** Public top bar; swaps Login/Register for an avatar + name + hover profile flyout when `cargospace_user` exists.
- Same localStorage read; derives `initials` from `user.name`.
- Also runs a **second, independent** `watchPosition` geolocation loop and renders `DeviceLocationStatus`.
- **Duplicate:** a near-identical `Navbar.jsx` and `Home.jsx` also exist under `Frontend/assets/`. They are **not imported anywhere** — leftovers from a botched move.

### `Home` (`Frontend/pages/Home.jsx`)
- **Responsibility:** The marketing landing page. Contains the hero, a 6-field search form, a live map section, "How CargoSpace Works", a location-filtered "Available Space Near You" list, and an About block.
- **Size:** ~300 lines, the largest page. Almost entirely presentational.
- **Data:** Mixes `nearbySpaces` (a local array literal at the top of the file), `containers`/`CITY_COORDINATES`/`stats` from `mockData.js`, and real geolocation.
- **Non-obvious:** It runs **two** geolocation subscriptions — a Places-Autocomplete integration and a `watchPosition` — and on failure calls `applyLocationFallback(...)`, a **6-argument helper that takes five setter functions** and pushes sets directly. It also still calls `useMyLocation`'s "Use my location" button, which is wired to the *second* geolocation call, not the first.

### `ChatProvider` / `ChatDrawer` / `AdminChatPanel`
- **Responsibility:** Socket.IO client lifecycle, per-booking chat rooms, unread counts.
- **Contract:** Join room with `join_booking(bookingId)`; server authorizes by calling `getPaidBooking()`, which **only returns a booking if `payment_status === 'PAID'` AND `status` is `Confirmed` or `In Transit`.**
- **Gotcha:** Cancelling a booking immediately and permanently closes its chat room — the booking no longer satisfies `getPaidBooking`, so the socket `join_booking` ack fails.

### `ApiHandler`-equivalent: there is none
Unlike a typical layered app, **there is no API client module.** `Frontend/services/` exists but is effectively empty. Every page calls bare `fetch('/api/...')` inline, and every protected call hand-writes its own `x-user-id` header. If you add an endpoint, you must also remember to attach the header by hand.

## Data Flow

**Flow A — Registration (this is where your bug lives)**

1. `Register.jsx` collects a 5-field form: `fullName`, `alternateName`, `company`, `email`, `password`.
2. It POSTs `{ name: form.fullName, alternateName, company, email, password, role: 'user' }` to `/api/register`.
3. **`server.js` destructures only `{ name, alternateName, email, password, role }`. `company` is read from `req.body` but never bound to a variable and never inserted.** There is also no `company` column in the `users` table.
4. Server inserts into `users` (with `alternate_name`), re-selects the full row, and returns `{ success, message, user: row }` with HTTP 201.
5. `Register.jsx` writes `data.user` into `localStorage.cargospace_user` and `nav('/dashboard')`.
6. `DashboardLayout` mounts → `Sidebar` and `Navbar` read localStorage → **they show the new name correctly.**
7. `Dashboard.jsx` renders → **it ignores localStorage and prints the hardcoded string "Welcome back, Ananya" / "Mehta Export House".**
8. `Settings.jsx` renders → **it initialises `useState(traderProfile)` from `mockData.js` and shows "Ananya Mehta" / "ananya@mehtaexports.in" / "+91 98765 43210".**

**Flow B — Login**

`Login.jsx` POSTs to `/api/login`. The server checks `admins` first, then `users` (plaintext comparison), and returns `{ success, user: <full row>, role }`. Traders → `localStorage.cargospace_user` + `nav('/dashboard')`. Admins → `localStorage.cargospace_admin` and `window.open('/admin', '_blank')` (a **new tab**, falling back to client-side nav if the popup is blocked).

**Flow C — Booking → Payment → Chat**

1. `FindSpace.jsx` lists `containers` from mock data; "Book" navigates to `/booking?container=<id>`.
2. `Booking.jsx` collects date + arrival window (validated as `HH:MM` clock times).
3. `Payment.jsx` simulates payment and POSTs `/api/payments/confirm` with `bookingId, containerId, route, space, bookingDate, slotStartTime, slotEndTime, amount, receiptNumber`.
4. `server.js` validates the slot times (`isClockTime`, and `slotEndTime > slotStartTime`), rejects if the booking exists and belongs to a different user (403), then **upserts**: UPDATE if the `booking_id` already exists, INSERT otherwise. Status becomes `Confirmed` / `PAID`.
5. Server emits `io.emit('booking_created', booking)`; `AdminDashboard` prepends it to its table live.
6. Chat unlocks: both `/api/chat/:bookingId/messages` and the socket `join_booking` gate on `getPaidBooking`.

**Flow D — Cancellation & refund**

1. Trader cancels with a reason (`POST /api/bookings/:bookingId/cancel`) → status `Cancelled`, `refund_status` set to `PENDING` if it was paid.
2. Admin sees it in the "Refund queue" (`AdminDashboard.jsx`) — filtered to `status === 'Cancelled' && payment_status === 'PAID'`.
3. Admin clicks Issue refund → `POST /api/admin/bookings/:bookingId/refund` → sets `refund_status = 'REFUNDED'`, records `refund_amount` and `refunded_at`, emits `booking_refunded`.

**Flow E — Account deletion**

`DELETE /api/account` (password-confirmed) runs a transaction: deletes the user's chat messages, **nulls out `bookings.user_id` rather than deleting the bookings** (so financial records survive), then deletes the user row. `Settings.jsx`'s dialog copy documents this: *"Booking records are retained without your account details."*

## Non-Obvious Behaviors & Design Decisions

### The mock/real split is the dominant architectural fact
`Frontend/data/mockData.js` is imported by **almost every dashboard page**: `Dashboard.jsx`, `Settings.jsx`, `Bookings.jsx`, `FindSpace.jsx`, `Home.jsx`, `Booking.jsx`, `Payment.jsx`, `Navbar.jsx`, `Sidebar.jsx`. It exports `containers`, `bookings`, `shipments`, `stats`, `traderStats`, `traderProfile`, `CITIES`, `CITY_COORDINATES`, `CARGO_TYPES`, plus `formatInr`, `formatDate`, `getCityCoordinates`, `usedPercent`.

Only three things are genuinely backed by SQLite: **users/admins, bookings, and chat.** Containers, shipments, stats, and the trader profile are fiction. So when you "add a user," the user is real but the containers they browse are not — and the *pages that display the user* were written against the fictional `traderProfile` object, not against the real one.

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
Note that its email (`ananya@mehtaexports.in`) **does not match** the seeded DB user (`trader@cargospace.com`). The mock profile and the seeded user are two different fictional people with the same name. A developer adding a field to registration will see it "work" in the sidebar and "not work" in settings, and will blame the backend when the truth is that settings never reads the backend.

### `company` is accepted by the UI and thrown away by the API
This is the sharpest edge in the repo. `Register.jsx` renders a "Company" input with a `Building2` icon, includes it in the POST body, and `Settings.jsx` renders a `businessName` line. But `users` has no company column, `/api/register` never binds the value, and no endpoint can read or write it. **The field is pure UI decoration today.**

### Identity payloads are intentionally narrow — and inconsistent
- `getIdentity()` returns only `{ id, name, email, role }` — so `alternate_name` is **not** available to any authenticated endpoint. Any "show my alternate name" feature is impossible without changing this.
- `/api/register` and `/api/login` return the **entire row** (`SELECT *`) including the plaintext `password`. That password is then written into `localStorage`. Never ship this.

### Three separate "profile" surfaces, two data sources
| Surface | Source | Correct? |
|---|---|---|
| `Navbar.jsx` avatar/flyout | `localStorage.cargospace_user` | ✅ |
| `Sidebar.jsx` user card | `localStorage.cargospace_user` | ✅ |
| `Dashboard.jsx` greeting | **Hardcoded string literal** | ❌ |
| `Settings.jsx` profile panel | **`mockData.traderProfile`** | ❌ |
| `AdminDashboard.jsx` header | `localStorage.cargospace_admin` | ✅ |

### `Settings.jsx`'s "Edit Profile" is a dead end
Clicking "Edit Profile" toggles `editing`, which swaps `<span>`s for `<input>`s wired to `setProfile`. **On re-render or `Done editing`, the edits evaporate** — `traderProfile` is a module constant and nothing persists `profile` to localStorage or the server. There is no `PUT /api/users/:id` route anywhere. Do not assume profile editing exists.

### Admin chat has no assignment model
When a trader sends a message, the receiver is computed as `db.prepare("SELECT admin_id FROM admins WHERE status='active' ORDER BY id LIMIT 1").get()?.admin_id` — i.e. **the lowest-ID active admin receives everything.** Add a second admin and messages still only ever route to the first one, while *both* admins can see the conversation. If no active admin exists, the API returns 503 "Admin support is currently unavailable."

### Hardcoded content-safety filter
Both the REST and socket message paths run the same regex:
```js
/\b(card number|cvv|cvc|otp|password)\b/i
```
and reject the message with "Payment credentials cannot be sent in chat." Messages are also capped at **2000 characters**. These two rules are duplicated verbatim in `POST /api/chat/:bookingId/messages` and in the `send_message` socket handler — if you change one, change both.

### Schema migrations are hand-rolled `PRAGMA` checks
There is no migration tool. `createTables()` runs `CREATE TABLE IF NOT EXISTS`, then reads `PRAGMA table_info(bookings)` / `PRAGMA table_info(users)` and issues individual `ALTER TABLE ... ADD COLUMN` statements for any missing column. Any new column **must** be added both to the `CREATE TABLE` block *and* to a matching `if (!columns.includes(...))` guard, or existing `cargospace.db` files will break while fresh ones work. Note `cargospace.db` **is committed to the repo**, so every developer inherits someone's local data.

### `CREATE TABLE IF NOT EXISTS` and module-level seeding
`ensureSampleAdmin()`, `ensureSampleUser()`, and `ensureSampleBookings()` all run **at import time, before `listen()`**. `ensureSampleUser()` also returns the sample user's ID, which is then used to backfill `BK-4412`:
```js
db.prepare("UPDATE bookings SET user_id = ?, payment_status='PAID', status='Confirmed' WHERE booking_id = 'BK-4412' AND (user_id IS NULL OR user_id = ?)")
```
This runs on every boot but is idempotent. The other two seeded bookings (`BK-4418`, `BK-4420`) keep `user_id = NULL` and therefore belong to nobody — a trader logging in sees only `BK-4412` from `/api/my-bookings`, even though the mock `Bookings.jsx` fallback shows all three.

### `Bookings.jsx` has a deliberate dual mode
```js
const [bookings, setBookings] = useState(() => {
  const user = JSON.parse(localStorage.getItem('cargospace_user') || 'null')
  return user?.user_id ? [] : initialBookings.map(normalizeBooking)
})
```
If **not** logged in → show mock bookings. If logged in → start empty and fetch `/api/my-bookings`. The `normalizeBooking()` shim renames snake_case DB columns (`booking_id`, `container_id`, `booking_date`, `cancelled_at`, `slot_start_time`) to the camelCase names the JSX expects. **Every DB-backed page needs this shim** — the server returns raw snake_case rows.

### Error propagation is per-page and defensive
- Every `submit` handler wraps `fetch` in try/catch and sets a local `error` string rendered as a red box instead of throwing.
- A deliberate pattern: check `response.headers.get('content-type')` before calling `.json()`, and if the server isn't running, surface: *"The backend server is not running. Start it with: cd backend && npm start"*. This converts a Vite proxy 500 into a helpful message.
- Server-side, `SQLITE_CONSTRAINT_UNIQUE` is caught specifically → 409 "A user with this email already exists." Everything else → 500 with `error.message` leaked to the client.
- **`GET /api/users` and `GET /api/admin/:adminId` have no auth check at all.** They dump every user, admin, and legacy user row (including plaintext passwords) to any caller.

### Performance-sensitive / intentional choices
- `useMemo` guards the O(n·m) geolocation work in `Home.jsx` (`nearby`, `nearbyContainers`).
- `better-sqlite3` is synchronous — no connection pool, no `await`; queries block the event loop, which is fine at this scale.
- `vite.config.js` sets `watch: { usePolling: true, interval: 100 }` — a 100ms polling watcher, likely added to work around a WSL/VM filesystem. It is CPU-hungry; remove it on native Windows.
- The backend uses `db.transaction(...)` for the multi-statement seed and account-deletion paths, but **not** for the payment upsert.

## Diagnosed Issues: Your Two Reported Bugs

### Issue 1 — "make image more light blue, it is not visible by the naked eye"

All hero image styling lives in **`Frontend/index.css`**, not in `Home.jsx`. The relevant rules:

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
  from { opacity: 0;   transform: scale(1.1); }
  to   { opacity: 0.52; transform: scale(1.04); }   /* ← animation's `both` fill also pins 0.52 */
}
```

**Why the image looks invisible:** two independent washes. The photo is at `opacity: 0.52`, and then `.hero-background-fade` — a solid-to-translucent **navy** gradient at 75%/50%/34% alpha — is stacked over it. Multiplying those out, the left third of the hero shows almost no photograph at all; only the far right retains any detail. Additionally, `@media (prefers-reduced-motion: reduce)` sets `.hero-background-image { animation: none }`, which drops the `from` state — but because the base rule also declares `opacity: 0.52`, the result is identical either way. **There is no state in which this image renders at full opacity.**

To shift it "more light blue," the four available levers, in order of impact:
1. **Raise `.hero-background-image { opacity }`** (0.52 → ~0.75) — the biggest single change.
2. **Lighten `.hero-background-fade`** — lower the alphas, e.g. `0.45 / 0.28 / 0.14`.
3. **Lighten `.hero-grid { background-color }`** away from `#0b1f3a` (the `--color-navy-900` token).
4. **Add a blue tint in the `filter`** — e.g. `filter: saturate(1.1) brightness(1.2) hue-rotate(-8deg)` — or lower `.hero-grid`'s `background-image` radial alpha of `0.35`.

⚠️ **If you change `opacity` in the base rule, you must also change the `to { opacity: … }` value inside `@keyframes hero-landscape-reveal`** — with `animation-fill-mode: both`, the keyframe's `to` value wins forever after the animation ends, so editing only the base rule will appear to do nothing.

Separately, `AuthShell.jsx` uses the *same* JPEG at **full opacity** under `bg-gradient-to-t from-navy-950 via-navy-900/35 to-navy-950/20`. If the "invisible" image you mean is the one on the **login/register** panel, that gradient (not any opacity) is the thing to lighten.

Also note the asset filename contains spaces and parentheses — `assets/logistics-means-transport-together-with-technological-futuristic-holograms (1).jpg` — so it must be imported, never referenced as a bare string URL.

### Issue 2 — "when I create the new user the name and other details are not updated"

**The backend is not the problem.** `/api/register` correctly inserts `name`, `alternate_name`, `email`, `password`, `role` and returns the whole row; `Login.jsx`/`Register.jsx` correctly persist that row to `localStorage.cargospace_user`; `Navbar.jsx` and `Sidebar.jsx` correctly read it back. There are **four** concrete defects:

**1. `Frontend/pages/Dashboard.jsx` — hardcoded identity (line ~22)**
```jsx
<h1 className="text-2xl font-extrabold text-navy-900">Welcome back, Ananya</h1>
<p className="text-sm text-slate-500">Mehta Export House · leftover CBM near Mumbai</p>
```
These are string literals. No prop, no localStorage read. Every user of every account sees "Ananya". **Fix:** read `JSON.parse(localStorage.getItem('cargospace_user'))` and interpolate `user.name`, the same way `Sidebar.jsx` does.

**2. `Frontend/pages/Settings.jsx` — the profile panel is bound to the mock object**
```jsx
const [profile, setProfile] = useState(traderProfile)   // from ../data/mockData
```
Everything rendered from `profile` — the avatar initials, the name, `businessName`, `email`, `phone`, `location`, `memberSince` — is Ananya's fiction, regardless of who is signed in. **Fix:** seed state from `localStorage.cargospace_user` with `traderProfile` as fallback, and map the DB's `alternate_name` into the display.

**3. `backend/server.js` — `company` is silently discarded on registration**
```js
app.post('/api/register', (req, res) => {
  const { name, alternateName, email, password, role = 'user' } = req.body || {}
  ...
  ? db.prepare('INSERT INTO users (user_id, name, alternate_name, email, password, role) VALUES (?,?,?,?,?,?)')
```
`Register.jsx` sends `company`, but it is never destructured, never inserted, and **there is no `company` column in `users`** (`createTables()` declares only `name`, `alternate_name`, `email`, `password`, `role`, `created_at`, `status`). So even a fixed `Dashboard.jsx` cannot show a company. **Fix requires three coordinated edits:** add a `company` column to the `CREATE TABLE users` block, add the matching `if (!userColumns.includes('company')) db.exec('ALTER TABLE users ADD COLUMN company TEXT')` guard for existing DBs, and add `company` to both the destructure and the `INSERT`.

**4. There is no profile-update endpoint at all**
Searching `server.js` for `UPDATE users` yields exactly one hit — the password change in `/api/account/change-password`. There is no `PUT /api/users/:id`, no `PATCH /api/account`, nothing that writes `name`, `alternate_name`, `company`, `phone`, or `location`. `Settings.jsx`'s "Edit Profile" toggles inputs but saves nowhere. So "details are not updated" is literally true by construction, not just visually.

**Bonus defect — `alternate_name` is unreachable after login.** `getIdentity()` does `SELECT user_id AS id, name, email, role FROM users …`, omitting `alternate_name` and `company`. Any future "show my preferred name" feature must widen this SELECT.

**Bonus defect — `Navbar`/`Sidebar` never re-render on profile change.** Both read localStorage **inline in the component body**, not via `useState` + a `storage` event listener. Concurrent tabs or an in-app profile write will not propagate. Register works only because `nav('/dashboard')` forces a fresh mount.

**Quick verification recipe:** register with a distinctive name (e.g. "ZZZ Test"), then check (a) the sidebar bottom card — will show "ZZZ Test" ✅; (b) `/dashboard` heading — will still say "Welcome back, Ananya" ❌; (c) `/settings` — will still say "Ananya Mehta / ananya@mehtaexports.in" ❌; (d) the Company value — gone forever ❌.

## Module Reference

| File | Purpose |
|---|---|
| `index.html` | Vite HTML shell; the only place `/Frontend/main.jsx` is referenced |
| `vite.config.js` | React + Tailwind v4 plugins; **`/api` → `localhost:5000` proxy**; polling watcher (100 ms) |
| `package.json` (root) | Scripts: `dev` = vite (5173), `start` = `node backend/server.js` |
| `README.md` | **Stale** — wrong demo emails, nonexistent "Provider" role, claims "no backend yet" |
| `backend/server.js` | **Entire backend**: schema + `PRAGMA` migrations, 3 seed routines, auth, bookings, payments, refunds, chat, Socket.IO, and the identity helpers `getIdentity`/`requireIdentity`/`getPaidBooking` |
| `backend/cargospace.db` | Committed SQLite database — inherits whatever data the last committer had |
| `Frontend/main.jsx` | `createRoot` + `StrictMode` (double-invokes effects in dev — relevant to the double geolocation watchers) |
| `Frontend/App.jsx` | All routes; no guards |
| `Frontend/index.css` | **Tailwind `@theme` tokens (`navy-*`, `brand-*`) + ALL custom CSS**: hero image/fade/keyframes, cargo map SVG classes, `.auth-input`, `.capacity-fill`, reduced-motion block |
| `Frontend/data/mockData.js` | **All mock domain data** + `formatInr`/`formatDate`/`usedPercent`/`getCityCoordinates`. ✅ `traderProfile` lives here and is the source of the "details not updating" bug |
| `Frontend/components/AuthShell.jsx` | Shared login/register split-panel frame; full-opacity hero JPEG under a navy gradient |
| `Frontend/components/Navbar.jsx` | Public nav; ✅ reads `cargospace_user`; hover profile flyout; own geolocation watcher |
| `Frontend/components/Sidebar.jsx` | Dashboard nav; ✅ **reference pattern** for reading `cargospace_user` |
| `Frontend/components/ChatProvider.jsx` | Socket.IO client + chat context; `useChat()`/`openChat()` |
| `Frontend/components/ChatDrawer.jsx` | Slide-in trader↔admin chat panel (`chat-drawer-enter` animation) |
| `Frontend/components/AdminChatPanel.jsx` | Admin-side chat across all paid bookings |
| `Frontend/components/Map.jsx` | Hand-rolled SVG map (landmass paths, dashed grid, animated pins, `.cargo-*` classes) plus `livePosition` pulse |
| `Frontend/components/ContainerCard.jsx` | Container listing card (uses `usedPercent`, `formatInr`) |
| `Frontend/components/ContainerVisual.jsx` | `ContainerYard` decorative SVG/CSS illustration |
| `Frontend/components/StatsCard.jsx` | Icon + label + value metric tile |
| `Frontend/components/TransportIcon.jsx` | Maps Road/Rail/Sea/Air → Lucide icons |
| `Frontend/layouts/PublicLayout.jsx` | Navbar + Outlet + Footer |
| `Frontend/layouts/DashboardLayout.jsx` | ChatProvider + Sidebar + mobile header + ChatDrawer + `page-enter` transition |
| `Frontend/pages/Home.jsx` | Landing page; hero, search, geolocation, map, "How it works", About |
| `Frontend/pages/Login.jsx` | Trader/admin sign-in; writes `cargospace_user` / `cargospace_admin` |
| `Frontend/pages/Register.jsx` | **Sends `company`, which the backend discards**; stores returned row in localStorage |
| `Frontend/pages/AdminLogin.jsx` | Admin sign-in (`admin@cargospace.com` / `admin123`) |
| `Frontend/pages/Dashboard.jsx` | ⚠️ **Hardcoded "Ananya"**; mock bookings/shipments/stats |
| `Frontend/pages/Settings.jsx` | ⚠️ **Bound to `traderProfile` mock**; working password change/delete dialogs via `x-user-id` |
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

1. **`README.md`** — 30 seconds, then **disregard it**. Note which claims are false (demo emails, "Provider" role, "no backend yet"). Knowing what *not* to trust saves hours later.
2. **`index.html` → `Frontend/main.jsx` → `Frontend/App.jsx`** — establishes that the app is `/Frontend/*` (not `src/`), and gives you the complete route map, including which routes are bare vs. wrapped in `DashboardLayout`.
3. **`backend/server.js`** — read top to bottom once. It is the whole backend in one file: `createTables()`, the three `ensure*` seeders, `getIdentity`/`requireIdentity`/`getPaidBooking`, then all routes. You will understand the entire data model from `createTables()` alone.
4. **`Frontend/components/Sidebar.jsx`** — 100 lines. Read this one specifically to see the **correct** `localStorage.cargospace_user` pattern (`user?.name || traderProfile.name`, initials derivation, logout). You will immediately recognise the same code in `Navbar.jsx`, and its **absence** in `Dashboard.jsx`.
5. **`Frontend/data/mockData.js`** — the shared vocabulary. Skim `containers` and `bookings`; then study `traderProfile` carefully, because it is the object causing your user-details bug.
6. **`Frontend/pages/Dashboard.jsx` and `Frontend/pages/Settings.jsx`** — read them back-to-back. The bug is a two-line contrast: `Dashboard.jsx` interpolates a string literal where a name should be; `Settings.jsx` calls `useState(traderProfile)` where `useState(localStorage… || traderProfile)` belongs.
7. **`Frontend/index.css`** — last, because it is the only place hero styling lives. Search for `.hero-grid`, `.hero-background-image`, `.hero-background-fade`, and `@keyframes hero-landscape-reveal` to see the opacity + gradient stack that makes the photo near-invisible.
8. *(Optional)* **`Frontend/pages/Bookings.jsx`** — the best example of the snake_case→camelCase `normalizeBooking()` shim you must replicate whenever a page starts consuming a real API instead of mock data.
