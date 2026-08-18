# FibreConnect

> Intervention management platform for a Tunisian fiber optic subcontractor — built as a final-year project (PFE).

<TODO: Add a screenshot here — take one of the dashboard once the app is running. Recommended: drag-and-drop image into a GitHub issue to get a URL, then paste it as: ![Dashboard](URL) >

**🔗 Live demo:** <TODO: paste Vercel/Railway URL here after deployment>
**📚 Case study / blog post:** <TODO: optional — link a blog post if you write one>

---

## The problem

Fiber optic subcontractors in Tunisia coordinate dozens of daily on-site interventions (installations, repairs, cable pulls) across scattered technicians and clients. Existing tools are either paper-based, spread across WhatsApp groups, or too enterprise-heavy for a small team.

## The solution

FibreConnect is a lightweight web app that centralizes intervention lifecycle management — from client request to technician assignment to job completion — with role-based access for admins, dispatchers, and field technicians.

## Features

- 🔐 **Authentication & role-based access** — admin, dispatcher, and technician roles (NextAuth)
- 📋 **Intervention tracking** — create, assign, update status, close
- 👷 **Technician management** — availability, current workload
- 🗂 **Client & site database** — with intervention history
- 📊 **Dashboard** — KPIs at a glance
- 📱 **Responsive UI** — usable on a phone in the field

<TODO: refine this list based on what you actually built — remove any features that aren't real, add any I missed.>

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | SQLite (dev) / <TODO: Postgres if you switch for prod> |
| ORM | Prisma |
| Auth | NextAuth.js |
| Deployment | <TODO: Vercel / Railway> |

## Getting started

```bash
git clone https://github.com/amer-oun/fibreconnect
cd fibreconnect && npm install
cp .env.example .env
# → then paste a session key into NEXTAUTH_SECRET
#   generate one at https://generate-secret.vercel.app/32
npx prisma migrate dev && npx prisma db seed
npm run dev
```

Open http://localhost:3000

### Seeded test accounts

<TODO: list the seed accounts if any — e.g., admin@fibreconnect.tn / password >

## Screenshots

<TODO: add 3-4 screenshots of the main screens — login, dashboard, intervention list, mobile view >

## Project context

Built as a **PFE (Projet de Fin d'Études)** at Collège LaSalle Tunis, 2026, for a real Tunisian fiber optic subcontractor.

## License

MIT — see [LICENSE](./LICENSE).

## Author

**Amer Oun** — [LinkedIn](https://www.linkedin.com/in/amer-oun-b33212312/) · [Email](mailto:ounamer31@gmail.com)
