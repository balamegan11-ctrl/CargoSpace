# CargoSpace

Frontend prototype for a shared cargo-container marketplace. Traders find leftover space in nearby containers, compare providers, book, pay (mock), and chat. Logistics providers list capacity. Admins approve providers **only after inspection**.

## Stack

- React 19 + Vite
- Tailwind CSS v4
- React Router
- Lucide React
- Mock data + `localStorage` (no backend yet)

`src/services/api.js` is a stub for a future Node.js/Express API.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Demo logins (password: `password`)

| Role | Email |
| --- | --- |
| Trader | trader@cargospace.in |
| Provider | provider@cargospace.in |
| Admin | admin@cargospace.in |

## Notes

- Provider registration never auto-approves.
- Trader registration requires no inspection.
- Payments are simulated only.
