I'm in **Explore Mode** — a codebase investigation mode. I can't edit files or make changes here. To apply any of the fixes below, **switch to Act Mode using the mode selector at the bottom of the chat.** Your findings carry over as context.

I re-verified the working tree: **nothing has been edited yet** — `.hero-background-image` is still `opacity: 0.52`, and `Dashboard.jsx` still contains the literal string `Welcome back, Ananya`. So both bugs are still open.

Two documents are saved in the project root:
- **`project_info__1.md`** — full architectural survey of the codebase
- **`project_info__3.md`** — the fix plan below (full version)

---

# CargoSpace — Fix Plan for the Two Reported Bugs

## Scope

1. **"Make the image more light blue — not visible by the naked eye"** → a CSS visibility problem in the hero.
2. **"When I create the new user the name and other details are not updated"** → a data-binding problem in three files, plus a missing DB column and a missing endpoint.

**Neither is a backend data-loss issue.** Registration *does* persist the name correctly.

---

## Fix 1 — Hero image visibility (`Frontend/index.css`)

### Root cause
The hero photo is washed out by **two stacked layers**, both in `Frontend/index.css` (not `Home.jsx`):

```css
.hero-background-image {
  opacity: 0.52;                                      /* layer 1: hides 48% of the photo */
  filter: saturate(1.08) brightness(1.18) contrast(1.02);
  animation: hero-landscape-reveal 1.1s ease-out both;
}

.hero-background-fade {
  background: linear-gradient(90deg,
    rgba(15, 58, 112, 0.75) 0%, rgba(30, 100, 178, 0.50) 48%,
    rgba(69, 153, 220, 0.34) 100%);                   /* layer 2: navy veil on top */
}

@keyframes hero-landscape-reveal {
  from { opacity: 0;    transform: scale(1.1); }
  to   { opacity: 0.52; transform: scale(1.04); }     /* also pins 0.52, permanently */
}
```

The photo sits at 52% opacity over `.hero-grid`'s solid `#0b1f3a`, then a navy gradient at 75%/50%/34% alpha is painted over it. On the **left third of the hero the composite is almost entirely navy** — the photograph is effectively erased. That is why it reads as "not visible."

### ⚠️ The critical gotcha
`animation: … both` means **`fill-mode: both`** — after the 1.1 s animation completes, the keyframe's `to { opacity: 0.52 }` **permanently overrides** the base rule. **Changing only `.hero-background-image { opacity: … }` will appear to do absolutely nothing.** Both values must change together.

### Recommended change set (apply in order, stop when it looks right)

| # | Selector | Property | From | Suggested |
|---|---|---|---|---|
| 1 | `.hero-background-image` | `opacity` | `0.52` | **`0.78`** |
| 2 | `@keyframes hero-landscape-reveal` → `to` | `opacity` | `0.52` | **`0.78` (must match #1)** |
| 3 | `.hero-background-fade` | gradient alphas | `0.75 / 0.50 / 0.34` | `0.48 / 0.26 / 0.12` |
| 4 | `.hero-grid` | `background-color` | `#0b1f3a` | `#12395f` (or lighter) |
| 5 | `.hero-background-image` | `filter` | `saturate(1.08) brightness(1.18) contrast(1.02)` | add `hue-rotate(-10deg)`, raise `brightness` |

Note: the `@media (prefers-reduced-motion: reduce)` block sets `animation: none`, which drops the keyframe and lets the **base rule** apply. If #1 and #2 drift apart, users with reduced-motion enabled see a *different* brightness than everyone else. Keep them equal.

### If the "invisible image" is actually on login/register
`Frontend/components/AuthShell.jsx` uses the **same JPEG at full opacity**, covered by a Tailwind gradient:
```jsx
<div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-900/35 to-navy-950/20" />
```
There, the lever is that gradient — lighten the `from`/`via` stops. No CSS opacity is involved.

### Asset-name warning
The imported file is `logistics-means-transport-together-with-technological-futuristic-holograms (1).jpg` — **a literal space and parentheses**. It must stay an `import` (Vite resolves it). Do not rewrite it as a plain `src` string; the space/parens will break URL resolution.

**Files touched: `Frontend/index.css` only.**

---

## Fix 2 — New user's name and details not updating

### Root cause
`/api/register` inserts `name`, `alternate_name`, `email`, `password`, `role` and returns the full row. `Register.jsx` stores it in `localStorage.cargospace_user`. `Navbar.jsx` and `Sidebar.jsx` read it back **correctly**.

**Four** other things are broken:

| # | Defect | File | Symptom |
|---|---|---|---|
| 1 | Greeting is a hardcoded string literal | `Frontend/pages/Dashboard.jsx` | Always "Welcome back, Ananya" |
| 2 | Profile panel seeded from the mock object | `Frontend/pages/Settings.jsx` | Always "Ananya Mehta / ananya@mehtaexports.in" |
| 3 | `company` dropped by the API; no DB column | `backend/server.js` | Company vanishes forever |
| 4 | No profile-update endpoint exists | `backend/server.js` | "Edit Profile" saves nowhere |

### Fix 2.1 — `Frontend/pages/Dashboard.jsx`
Current (broken):
```jsx
<h1 className="text-2xl font-extrabold text-navy-900">Welcome back, Ananya</h1>
<p className="text-sm text-slate-500">Mehta Export House · leftover CBM near Mumbai</p>
```
Copy the pattern already proven in `Sidebar.jsx`:
```jsx
const user = JSON.parse(localStorage.getItem('cargospace_user') || 'null')
const displayName = user?.name || user?.alternate_name || 'Trader'
const company = user?.company || 'Your workspace'
```
then interpolate:
```jsx
<h1 …>Welcome back, {displayName}</h1>
<p …>{company} · leftover CBM near {user?.location || 'Mumbai'}</p>
```
Prefer `useState` + a `storage` event listener over an inline read, so the header reacts to profile edits. (Caveat: `storage` fires only for *other* tabs — for same-tab updates, update state directly or use a context.)

### Fix 2.2 — `Frontend/pages/Settings.jsx`
Current (broken):
```jsx
const [profile, setProfile] = useState(traderProfile)   // module constant from ../data/mockData
```
Every render, for every account, shows Ananya — whose mock email (`ananya@mehtaexports.in`) doesn't even match the seeded DB row (`trader@cargospace.com`).

Preferred shape:
```jsx
const stored = JSON.parse(localStorage.getItem('cargospace_user') || 'null')
const [profile, setProfile] = useState(() => ({
  ...traderProfile,
  ...(stored || {}),
  name:          stored?.name          || traderProfile.name,
  email:         stored?.email         || traderProfile.email,
  businessName:  stored?.company       || traderProfile.businessName,
  alternateName: stored?.alternate_name || '',
}))
```
Two traps:
- **Field-name mismatch** — the DB returns `alternate_name` (snake_case) and will return `company`, but the JSX reads `businessName`. Map explicitly; don't spread blindly.
- **`initials(profile.name)` throws on an empty name** (`name.split(' ')` on `undefined`). Guard it while you're in this file.

### Fix 2.3 — `backend/server.js`: the missing `company` column
`company` is sent by the client and silently discarded — it's never destructured, never inserted, and **there is no `company` column** in `users`. Three coordinated edits required; miss any one and either fresh or existing DBs break.

**A — `CREATE TABLE users` inside `createTables()`:**
```sql
alternate_name TEXT,
company        TEXT,      -- ← ADD
```

**B — the migration guard (mandatory — `cargospace.db` is committed to the repo):**
```js
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name)
if (!userColumns.includes('alternate_name')) db.exec('ALTER TABLE users ADD COLUMN alternate_name TEXT')
if (!userColumns.includes('company'))        db.exec('ALTER TABLE users ADD COLUMN company TEXT')   // ← ADD
```

**C — bind it in `/api/register`:**
```js
const { name, alternateName, company, email, password, role = 'user' } = req.body || {}
…
db.prepare('INSERT INTO users (user_id, name, alternate_name, company, email, password, role) VALUES (?,?,?,?,?,?,?)')
…
insert.run(userId, name, String(alternateName || '').trim() || null,
           String(company || '').trim() || null, email, password, normalizedRole)
```

**D — widen `getIdentity()` (recommended).** It currently selects `SELECT user_id AS id, name, email, role FROM users …`, so `alternate_name` and `company` are **unreachable from any authenticated endpoint**, no matter what you store:
```js
'SELECT user_id AS id, name, alternate_name, company, email, role FROM users WHERE user_id = ? AND status = ?'
```

⚠️ Behavioural note: once `company` is returned by `/api/register`, existing logged-in users have **stale** localStorage rows without it until they log in again. The UI must tolerate `company === undefined` — the `|| fallback` pattern above already does.

### Fix 2.4 — Add `PUT /api/account` (required for "Edit Profile" to actually save)
Today `UPDATE users` appears **exactly once** in `server.js` — inside `/api/account/change-password`. Nothing writes `name`, `alternate_name`, `company`, `phone`, or `location`. So "details are not updated" is **literally true by construction**, not just visually.

```
PUT /api/account
  headers: { 'x-user-id': <user_id> }
  body:    { name?, alternateName?, company?, phone?, location? }
```
Match existing house style:
- Authorize with `requireIdentity(req, res, 'user')` (same helper as change-password/delete).
- Trim all strings, coerce blanks to `null`.
- One **parameterised** `UPDATE users SET … WHERE user_id = ?` — never concatenate request keys into SQL.
- Return the updated row so the client can overwrite `localStorage.cargospace_user` and re-render.
- `phone` and `location` have **no columns either** — add them via A + B if they should persist. `Settings.jsx` renders both today, so they silently fail.

Then have `Settings.jsx` call it on "Done editing" and write the response into localStorage + state.

### Fix 2.5 (optional) — make `Navbar`/`Sidebar` reactive
Both read localStorage inline in the component body, so they don't re-render on an in-app profile change. Registration only appears to work because `nav('/dashboard')` forces a fresh mount. Either add a `storage` listener, or introduce a small `UserProvider` context — the cleaner option, since `ChatProvider` already establishes that pattern in `DashboardLayout`.

---

## Verification Recipe

1. Register a new account: name `ZZZ Test`, alternate `Zed`, company `ZZZ Logistics`, email `zzz@test.com`.
2. **Sidebar** bottom card → "ZZZ Test" ✅ *(was already correct)*
3. **`/dashboard` heading** → "Welcome back, ZZZ Test" *(was stuck on "Ananya")*
4. **`/dashboard` subtitle** → "ZZZ Logistics" *(was hardcoded "Mehta Export House")*
5. **`/settings`** → name/email/company all match *(was "Ananya Mehta / ananya@mehtaexports.in")*
6. **Edit Profile → save → reload.** Must survive. *(Fails today; needs Fix 2.4.)*
7. Confirm in the DB independently:
   `SELECT user_id, name, alternate_name, company, email FROM users WHERE email = 'zzz@test.com';`
8. **Hero** → open `/`; the photo should be visible across its **full width**, not just the right edge, and read light blue.

### Failure signatures to watch for

| Symptom | Missing step |
|---|---|
| Hero unchanged after editing `opacity` | Edited only the base rule — `@keyframes hero-landscape-reveal` `to { opacity }` still pins the old value (Fix 1 #2) |
| Heading updates but subtitle shows "undefined" | `company` not added to DB/INSERT (Fix 2.3 A–C) |
| Register succeeds but `user.company` is `undefined` | Column added but not to the `INSERT` statement |
| "Edit Profile" reverts on reload | Fix 2.4 not implemented |
| Settings crashes: *"Cannot read properties of undefined (reading 'split')"* | `initials(profile.name)` on an empty name (Fix 2.2) |
| Fresh clone works but your machine errors on `ALTER` | `PRAGMA table_info(users)` guard missing (Fix 2.3 B) |

---

## Change Set Summary

| File | Change | For |
|---|---|---|
| `Frontend/index.css` | `.hero-background-image` opacity **+** matching `@keyframes` `to` opacity; optionally lighten `.hero-background-fade` and `.hero-grid` | Bug 1 |
| `Frontend/pages/Dashboard.jsx` | Replace hardcoded name/company with a `localStorage.cargospace_user` read | Bug 2 |
| `Frontend/pages/Settings.jsx` | Seed `profile` from localStorage (mock as fallback); map `alternate_name`/`company`; guard `initials()` | Bug 2 |
| `backend/server.js` | (A) `company` column, (B) `PRAGMA` migration guard, (C) destructure + `INSERT` binding, (D) widen `getIdentity()` | Bug 2 |
| `backend/server.js` | **(New)** `PUT /api/account` (+ optional `phone`/`location` columns) | "Edit Profile" |
| `Frontend/pages/Settings.jsx` | Call `PUT /api/account`, update localStorage + state | "Edit Profile" |
| *(optional)* `Navbar.jsx`, `Sidebar.jsx` | Move localStorage read into state/context | Polish |

**Minimum viable fix for Bug 2** (the name showing correctly right after registration) is **`Dashboard.jsx` + `Settings.jsx` only** — the name already persists server-side. The backend work exists solely to make **company** (and any future field) survive.

**Nothing above can be applied in Explore Mode.** Switch to **Act Mode** via the mode selector at the bottom of the chat, and I'll hand over `project_info__1.md` and `project_info__3.md` as context.

Want me to go deeper on any part before you switch — e.g. exact line numbers for each edit, or the full `PUT /api/account` implementation?