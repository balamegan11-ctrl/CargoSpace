# CargoSpace — Fix Plan for the Two Reported Bugs

> **Companion document.** This is the *remediation* plan; the full architectural survey is in `project_info__1.md`.
> **Verified against the current working tree.** No edits have been applied yet — `Frontend/index.css` still contains `opacity: 0.52` on `.hero-background-image`, and `Frontend/pages/Dashboard.jsx` still contains the literal string `Welcome back, Ananya`.

---

## Scope

Two independent defects were reported:

1. **"Make the image more light blue — it is not visible by the naked eye."** → A CSS visibility problem in the hero.
2. **"When I create the new user the name and other details are not updated."** → A data-binding problem across three files, plus a missing DB column and a missing endpoint.

Neither is a backend data-loss issue. Both are fixable in a small, well-bounded set of files.

---

## Fix 1 — Hero image visibility (`Frontend/index.css`)

### Root cause

The hero photo is washed out by **two stacked layers**, both in `Frontend/index.css`:

```css
.hero-background-image {
  opacity: 0.52;                                      /* layer 1: hides 48% of the photo */
  filter: saturate(1.08) brightness(1.18) contrast(1.02);
  transform: scale(1.04);
  animation: hero-landscape-reveal 1.1s ease-out both;
}

.hero-background-fade {
  background: linear-gradient(90deg,
    rgba(15, 58, 112, 0.75) 0%,
    rgba(30, 100, 178, 0.50) 48%,
    rgba(69, 153, 220, 0.34) 100%);                   /* layer 2: navy veil on top */
}

@keyframes hero-landscape-reveal {
  from { opacity: 0;    transform: scale(1.1); }
  to   { opacity: 0.52; transform: scale(1.04); }     /* also pins 0.52, permanently */
}
```

The photo sits at 52% opacity over `.hero-grid`'s solid `#0b1f3a`, and then a navy gradient at 75%/50%/34% alpha is painted over it. On the **left third** of the hero the composite is almost entirely navy — the photograph is effectively erased. (This is likely why it reads as "not visible by the naked eye.")

### The critical gotcha

`animation: hero-landscape-reveal … both` uses **`fill-mode: both`**, so after the 1.1 s animation completes the `to { opacity: 0.52 }` keyframe value **permanently overrides** the base rule. **Changing only `.hero-background-image { opacity: … }` will appear to do absolutely nothing.** Both values must be changed together.

### Recommended change set

Apply in this order; stop when the result looks right.

| # | Selector | Property | From | Suggested | Effect |
|---|---|---|---|---|---|
| 1 | `.hero-background-image` | `opacity` | `0.52` | `0.78` | Primary brightening |
| 2 | `@keyframes hero-landscape-reveal` → `to` | `opacity` | `0.52` | `0.78` | **Must match #1** — otherwise #1 is ignored |
| 3 | `.hero-background-fade` | `background` alphas | `0.75 / 0.50 / 0.34` | `0.48 / 0.26 / 0.12` | Removes the left-side navy wash |
| 4 | `.hero-grid` | `background-color` | `#0b1f3a` | `#12395f` *(or lighter)* | Lifts the tint behind the photo toward "light blue" |
| 5 | `.hero-background-image` | `filter` | `saturate(1.08) brightness(1.18) contrast(1.02)` | add `hue-rotate(-10deg)` and raise `brightness` | Pushes the palette specifically toward blue |

**Why #2 is non-negotiable:** the reveal animation ends on `scale(1.04)` at the `to` opacity. If the base rule says `0.78` but the keyframe still says `0.52`, the visible result stays `0.52`.

**Note on the reduced-motion path:** the `@media (prefers-reduced-motion: reduce)` block sets `.hero-background-image { animation: none }`. That drops the keyframe entirely, so the **base rule's** opacity applies. A developer testing with reduced motion enabled and another without it will see *different* brightnesses if #1 and #2 are allowed to drift apart. Keeping them equal makes the two paths agree.

### If the "invisible image" is actually on the login/register screen

`Frontend/components/AuthShell.jsx` uses the **same JPEG at full opacity**, covered by a Tailwind gradient:

```jsx
<div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-900/35 to-navy-950/20" />
```

There, the levers are different: reduce `from-navy-950` toward `from-navy-900/70`, or lighten the `via` stop. No CSS opacity is involved.

### Asset-name warning

Both `Home.jsx` and `AuthShell.jsx` import:

```js
import transportImage from '../assets/logistics-means-transport-together-with-technological-futuristic-holograms (1).jpg'
```

The filename contains a **literal space and parentheses**. It must remain an `import` (Vite resolves it and emits a hashed URL). Do not rewrite it as a plain string path in `src`/`href` — the parentheses and space will break URL resolution.

**Files touched: `Frontend/index.css` only** (or `Frontend/components/AuthShell.jsx` if the auth panel is the target).

---

## Fix 2 — New user's name and details not updating

### Root cause

Registration and login **do** work. `/api/register` inserts `name`, `alternate_name`, `email`, `password`, and `role`, and returns the full row. `Register.jsx` stores that row in `localStorage.cargospace_user`. `Navbar.jsx` and `Sidebar.jsx` read it back correctly.

The failure is that **four** other things are broken or missing:

| # | Defect | File | Symptom |
|---|---|---|---|
| 1 | Greeting is a hardcoded string literal | `Frontend/pages/Dashboard.jsx` | Always "Welcome back, Ananya" |
| 2 | Profile panel seeded from the mock object | `Frontend/pages/Settings.jsx` | Always "Ananya Mehta / ananya@mehtaexports.in" |
| 3 | `company` dropped by the API; no DB column | `backend/server.js` | Company vanishes on registration, forever |
| 4 | No profile-update endpoint exists | `backend/server.js` | "Edit Profile" saves nowhere |

### Fix 2.1 — `Frontend/pages/Dashboard.jsx`

Current (broken):

```jsx
<div>
  <h1 className="text-2xl font-extrabold text-navy-900">Welcome back, Ananya</h1>
  <p className="text-sm text-slate-500">Mehta Export House · leftover CBM near Mumbai</p>
</div>
```

Copy the pattern already proven in `Frontend/components/Sidebar.jsx`:

```jsx
const user = JSON.parse(localStorage.getItem('cargospace_user') || 'null')
const displayName = user?.name || user?.alternate_name || 'Trader'
const company = user?.company || 'Your workspace'
```

then:

```jsx
<h1 …>Welcome back, {displayName}</h1>
<p …>{company} · leftover CBM near {user?.location || 'Mumbai'}</p>
```

**Prefer `useState` + a `storage` listener** rather than an inline read, so the header updates if the profile is edited elsewhere:

```jsx
const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('cargospace_user') || 'null'))
useEffect(() => {
  const sync = () => setUser(JSON.parse(localStorage.getItem('cargospace_user') || 'null'))
  window.addEventListener('storage', sync)
  return () => window.removeEventListener('storage', sync)
}, [])
```

Note: the `storage` event only fires for *other* tabs. For same-tab updates, write the new value to localStorage and call your own setter (or route through a small context).

### Fix 2.2 — `Frontend/pages/Settings.jsx`

Current (broken):

```jsx
const [profile, setProfile] = useState(traderProfile)
```

`traderProfile` is a **module constant imported from `../data/mockData`**, so every render — for every account — shows Ananya. Its `email` (`ananya@mehtaexports.in`) does not even match the seeded DB row (`trader@cargospace.com`).

Preferred shape:

```jsx
const stored = JSON.parse(localStorage.getItem('cargospace_user') || 'null')
const [profile, setProfile] = useState(() => ({
  ...traderProfile,
  ...(stored || {}),
  name:        stored?.name        || traderProfile.name,
  email:       stored?.email       || traderProfile.email,
  businessName: stored?.company    || traderProfile.businessName,
  alternateName: stored?.alternate_name || '',
}))
```

Two things to note:

- **Field-name mismatch.** The DB returns `alternate_name` (snake_case) and will return `company`; the JSX reads `businessName`. Map explicitly, as above — do not spread blindly.
- **`initials(profile.name)` will throw** if `name` is ever empty (`name.split(' ').map(p => p[0])` on `undefined`). Guard it while you are in this file.
- **"Edit Profile" is still a dead end** after this fix — it edits local state only. Persisting requires Fix 2.4.

### Fix 2.3 — `backend/server.js`, the `company` column

Current (broken) — `company` is sent by the client and silently discarded:

```js
app.post('/api/register', (req, res) => {
  const { name, alternateName, email, password, role = 'user' } = req.body || {}
  …
  ? db.prepare('INSERT INTO users (user_id, name, alternate_name, email, password, role) VALUES (?,?,?,?,?,?)')
```

There is **no `company` column** in the `users` table. Three coordinated edits are required — miss any one and either fresh DBs or existing DBs will break.

**Edit A — the `CREATE TABLE users` block inside `createTables()`:**

```sql
CREATE TABLE IF NOT EXISTS users (
  …
  alternate_name TEXT,
  company        TEXT,      -- ← ADD
  …
);
```

**Edit B — the migration guard for already-existing databases.** Note the existing pattern used for `alternate_name`; `cargospace.db` is **committed to the repo**, so this guard is mandatory, not optional:

```js
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((column) => column.name)
if (!userColumns.includes('alternate_name')) db.exec('ALTER TABLE users ADD COLUMN alternate_name TEXT')
if (!userColumns.includes('company'))        db.exec('ALTER TABLE users ADD COLUMN company TEXT')   // ← ADD
```

**Edit C — bind and insert the value in `/api/register`:**

```js
const { name, alternateName, company, email, password, role = 'user' } = req.body || {}
…
normalizedRole === 'user'
  ? insert.run(userId, name, String(alternateName || '').trim() || null,
               String(company || '').trim() || null, email, password, normalizedRole)
  : insert.run(userId, name, email, password, normalizedRole)
```

This also requires updating the user `INSERT` statement's column list and placeholder count:

```js
db.prepare('INSERT INTO users (user_id, name, alternate_name, company, email, password, role) VALUES (?,?,?,?,?,?,?)')
```

**Edit D (recommended) — widen `getIdentity()`.** It currently selects a narrow projection:

```js
db.prepare('SELECT user_id AS id, name, email, role FROM users WHERE user_id = ? AND status = ?')
```

Because `alternate_name` and `company` are omitted, **no authenticated endpoint can ever return them**, no matter what you store. Add them to the projection (and to the `admins` branch's counterpart if you add admin fields):

```js
'SELECT user_id AS id, name, alternate_name, company, email, role FROM users WHERE user_id = ? AND status = ?'
```

(Mind the `admins` branch too — it selects `admin_id AS id, name, email, role`. Widening one without the other is fine, but keep it deliberate.)

⚠️ **Two behavioural notes introduced by this fix:**
- Returning `company` from `/api/register` means the row stored in `localStorage.cargospace_user` gains a `company` field, which `Settings.jsx` and `Dashboard.jsx` can then read. Existing logged-in users will have a stale localStorage row **without** the field until they log in again — so the UI must tolerate `company === undefined` (the `|| fallback` pattern above does).
- The register response is `SELECT * FROM users WHERE user_id = ?`, so `company` is returned automatically once the column exists. No extra query needed.

### Fix 2.4 — Add a profile-update endpoint (required for "Edit Profile" to work)

Today, `UPDATE users` appears **exactly once** in `backend/server.js` — inside `/api/account/change-password`. Nothing can write `name`, `alternate_name`, `company`, `phone`, or `location`.

To make `Settings.jsx`'s "Edit Profile" real, add a route alongside the existing account routes:

```
PUT /api/account
  headers: { 'x-user-id': <user_id> }
  body:    { name?, alternateName?, company?, phone?, location? }
```

Implementation notes, matching existing house style:

- Authorize with `requireIdentity(req, res, 'user')` — the same helper the change-password and delete routes use.
- Validate that `name` is non-empty if supplied; trim all strings; coerce blanks to `null`.
- Run a single parameterised `UPDATE users SET … WHERE user_id = ?` — **do not** build SQL by string concatenation from request keys.
- Return the **updated row** (`SELECT * FROM users WHERE user_id = ?`) so the client can overwrite `localStorage.cargospace_user` and re-render immediately.
- Remember `phone` and `location` have **no columns either** — add them the same way (Edit A + Edit B) if the UI is to persist them. Today `Settings.jsx` renders both, so they will silently fail to save unless columns exist.

Then update `Settings.jsx` to call it on "Done editing" (or add an explicit Save button), write the response into `localStorage.cargospace_user`, and update local state.

### Fix 2.5 — Optional: make `Navbar`/`Sidebar` reactive

Both read localStorage **inline in the component body** (`const user = JSON.parse(localStorage.getItem('cargospace_user') || 'null')`). They will not re-render on an in-app profile change; registration only appears to work because `nav('/dashboard')` forces a fresh mount and a remount reads fresh values.

If you want live updates, either:
- move the read into `useState` + a `storage` listener (works across tabs only), or
- introduce a small `UserProvider` context that owns the profile and exposes an updater (works everywhere) — the cleaner option given `ChatProvider` already establishes this pattern in `DashboardLayout`.

---

## Verification Recipe

After applying the fixes, do this end-to-end check. It exercises every defect.

1. **Register** a brand-new account with a distinctive name, e.g. full name `ZZZ Test`, alternate name `Zed`, company `ZZZ Logistics`, email `zzz@test.com`, password `secret123`.
2. **Sidebar** (bottom card) → should read **ZZZ Test**. *(Was already correct.)*
3. **`/dashboard` heading** → should read **Welcome back, ZZZ Test**. *(Previously stuck on "Ananya".)*
4. **`/dashboard` subtitle** → should read **ZZZ Logistics**. *(Previously hardcoded "Mehta Export House".)*
5. **`/settings`** → name **ZZZ Test**, email **zzz@test.com**, company **ZZZ Logistics**. *(Previously "Ananya Mehta" / "ananya@mehtaexports.in".)*
6. **Edit Profile → change the name → save → reload the page.** The new name must survive the reload. *(This is the step that fails today, and will keep failing until Fix 2.4 exists.)*
7. **Inspect the database** to confirm persistence independently of the UI:
   `SELECT user_id, name, alternate_name, company, email FROM users WHERE email = 'zzz@test.com';`
   Expect all four fields populated.
8. **Hero image** → open `/` and confirm the photograph is visible across its full width, not just the right edge, and that the tone reads light blue.

### Failure signatures to expect if a step is missed

| Symptom | Missing step |
|---|---|
| Hero looks unchanged after editing `opacity` | You edited only the base rule; `@keyframes hero-landscape-reveal`'s `to { opacity }` still pins the old value (Fix 1 #2) |
| Dashboard heading updates but the subtitle shows "undefined" | `company` was not added to the DB / INSERT (Fix 2.3 A–C) |
| Registration succeeds but `user.company` is `undefined` in localStorage | `company` added to the table but not to the `INSERT` statement |
| Existing accounts log in and show blank company, new ones fine | Expected — localStorage rows are stale until re-login; the `||` fallback must handle it |
| "Edit Profile" reverts on reload | Fix 2.4 not implemented (still also affected by editing localStorage without a setter) |
| Settings page crashes with "Cannot read properties of undefined (reading 'split')" | `initials(profile.name)` with an empty name — guard it (Fix 2.2) |
| Fresh clone boots but your machine errors on ALTER | The `PRAGMA table_info(users)` guard (Fix 2.3 B) is missing; `cargospace.db` is committed |

---

## Change Set Summary

| File | Change | Required for |
|---|---|---|
| `Frontend/index.css` | `.hero-background-image` opacity **and** matching `@keyframes hero-landscape-reveal` `to` opacity; optionally lighten `.hero-background-fade` and `.hero-grid` | Bug 1 |
| `Frontend/pages/Dashboard.jsx` | Replace hardcoded name/company with a `localStorage.cargospace_user` read | Bug 2 |
| `Frontend/pages/Settings.jsx` | Seed `profile` from localStorage with `traderProfile` fallback; map `alternate_name`/`company`; guard `initials()` | Bug 2 |
| `backend/server.js` | (A) `company` in `CREATE TABLE users`; (B) `PRAGMA` migration guard; (C) destructure + `INSERT` binding; (D) widen `getIdentity()` SELECT | Bug 2 |
| `backend/server.js` | **(New)** `PUT /api/account` to persist profile edits (+ optional `phone`/`location` columns) | Bug 2, "Edit Profile" |
| `Frontend/pages/Settings.jsx` | Call `PUT /api/account`, then update localStorage + state | Bug 2, "Edit Profile" |
| *(optional)* `Frontend/components/Navbar.jsx`, `Sidebar.jsx` | Move localStorage read into state/context so it reacts to profile changes | Polish |

**Minimum viable fix for Bug 2 (name shows correctly right after registration):** `Dashboard.jsx` + `Settings.jsx` only. No backend change is needed for the *name* — it already persists. The backend work exists solely to make **company** (and any future field) survive.

**Do not** attempt these edits in Explore Mode. Switch to **Act Mode** via the mode selector at the bottom of the chat.
