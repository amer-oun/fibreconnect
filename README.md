# FibreConnect

> Intervention management platform for a Tunisian fiber optic subcontractor — built as a final-year project (PFE).

<p align="center">
  <img width="900" alt="FibreConnect landing page" src="https://github.com/user-attachments/assets/fed873aa-3eee-4688-bd32-da5ae1576dba" />
</p>

**🔗 Live demo:** https://fibreconnect.vercel.app

---

## The problem

Fiber optic subcontractors in Tunisia coordinate dozens of daily on-site interventions (installations, repairs, cable pulls) across scattered technicians and clients. Existing tools are either paper-based, spread across WhatsApp groups, or too enterprise-heavy for a small team.

## The solution

FibreConnect is a lightweight web app that centralizes intervention lifecycle management — from client request to technician assignment to job completion — with role-based access for admins, dispatchers, and field technicians. Three spaces, one login.

<p align="center">
  <img width="900" alt="Three-role overview" src="https://github.com/user-attachments/assets/eb378fb6-a7d8-4bce-b50a-c039afd91c90" />
</p>

---

## 🧪 Try it live

**https://fibreconnect.vercel.app**

The login page has a **Comptes de démonstration** panel with all demo emails. All accounts share the password **`Passer123`**.

<p align="center">
  <img width="700" alt="Login with demo accounts" src="https://github.com/user-attachments/assets/2e31c3da-7462-40e3-acb2-ba4619d55acd" />
</p>

The seed creates 1 supervisor, 5 technicians (across Tunis, Ariana, Ben Arous, Sfax), and 6 clients — one of whom is in Sousse, a zone with no technician coverage (intentional, to demonstrate the manual assignment flow).

---

## Features

### 👤 Client space
Report a fiber outage, track its resolution in real time, rate the technician after closure.

### 👷 Technician workspace
Zone-filtered intervention list, accept/start/close workflow, cash-payment collection, mobile-friendly. Technicians only see interventions in their coverage zone.

### 📊 Supervisor dashboard
6-month analytics, workload distribution per technician, zone coverage overview (uncovered zones highlighted), manual reassignment, cash reconciliation.

<p align="center">
  <img width="900" alt="Supervisor dashboard" src="https://github.com/user-attachments/assets/531dbebd-f41d-4b15-9bce-fbe57f29c067" />
</p>

### 🗺 Client directory
Full client list with interactive map, contract references, operator (Tunisie Telecom / Ooredoo), and open interventions per client.

<p align="center">
  <img width="900" alt="Client directory with map" src="https://github.com/user-attachments/assets/89ff54ce-6f00-495a-9231-5dc7309c998a" />
</p>

### 💰 Invoicing & payments
Automatic invoice generation on intervention closure. Multiple payment methods (cash, card, bank transfer, D17). Cash-remittance tracking: what technicians have collected but not yet handed in.

<p align="center">
  <img width="900" alt="Finances and invoicing" src="https://github.com/user-attachments/assets/3f308b40-25c6-40cb-9dc2-515c81082632" />
</p>

---

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Auth | NextAuth.js |
| Hosting | Vercel |

## Getting started

```bash
git clone https://github.com/amer-oun/fibreconnect
cd fibreconnect && npm install
cp .env.example .env
# → set DATABASE_URL to a Postgres connection string (Neon has a free tier)
# → generate NEXTAUTH_SECRET at https://generate-secret.vercel.app/32
# → set NEXTAUTH_URL to http://localhost:3000 for dev
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open http://localhost:3000

## Project context

Built as a **PFE (Projet de Fin d'Études)** at Collège LaSalle Tunis, 2026, for a real Tunisian fiber optic subcontractor. The full specification — data model, business rules, deadlines, and the money circuit — is in [docs/cahier-des-charges.md](./docs/cahier-des-charges.md) (French). The demo dataset simulates a week of operations across four regions with realistic Tunisian names, addresses, and fiber-optic terminology (NRO, PBO, ONT, épissure, réflectométrie).

## License

MIT — see [LICENSE](./LICENSE).

## Author

**Amer Oun** — [LinkedIn](https://www.linkedin.com/in/amer-oun-b33212312/) · [Email](mailto:ounamer31@gmail.com)
