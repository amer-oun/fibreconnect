# FibreConnect

> Intervention management platform for a Tunisian fiber optic subcontractor — built as a final-year project (PFE).

<p align="center">
  <img width="900" alt="FibreConnect landing page" src="https://github.com/user-attachments/assets/531dbebd-f41d-4b15-9bce-fbe57f29c067" />
</p>

**🔗 Live demo:** https://fibreconnect.vercel.app

---

## The problem

Fiber optic subcontractors in Tunisia coordinate dozens of daily on-site interventions (installations, repairs, cable pulls) across scattered technicians and clients. Existing tools are either paper-based, spread across WhatsApp groups, or too enterprise-heavy for a small team.

## The solution

FibreConnect is a lightweight web app that centralizes intervention lifecycle management — from client request to technician assignment to job completion — with role-based access for admins, dispatchers, and field technicians.

---

## 🧪 Try it live

**Live demo:** https://fibreconnect.vercel.app

All demo accounts share the same password: **`Passer123`**

| Role | Email |
|---|---|
| Superviseur | `superviseur@fibreconnect.tn` |
| Technicien | `karim.bouazizi@fibreconnect.tn` |
| Client | `nadia.chaabane@example.tn` |

The seed creates 1 supervisor, 5 technicians, and 6 clients across 4 Tunisian regions (Tunis, Ariana, Ben Arous, Sfax). Log in with any of them.

---

## Features

### 🔐 Role-based authentication
Three distinct interfaces — client, technician, supervisor — with NextAuth session handling.

<p align="center">
  <img width="700" alt="Login" src="https://github.com/user-attachments/assets/fed873aa-3eee-4688-bd32-da5ae1576dba" />
</p>

### 👤 Client portal
Report fiber outages, track intervention status in real time, view invoicing history.

<p align="center">
  <img width="900" alt="Client view" src="https://github.com/user-attachments/assets/89ff54ce-6f00-495a-9231-5dc7309c998a" />
</p>

### 👷 Technician workspace
Zone-filtered intervention list, accept/start/close workflow, cash-payment collection, mobile-friendly.

<p align="center">
  <img width="900" alt="Technician view" src="https://github.com/user-attachments/assets/eb378fb6-a7d8-4bce-b50a-c039afd91c90" />
</p>

### 📊 Supervisor dashboard
6-month analytics, KPIs by zone, unassigned interventions alerts, manual reassignment, cash reconciliation.

<p align="center">
  <img width="900" alt="Supervisor dashboard" src="https://github.com/user-attachments/assets/2e31c3da-7462-40e3-acb2-ba4619d55acd" />
</p>

### 📋 Intervention lifecycle
Full history tracking from creation → assignment → in-progress → closure, with technician reports and client ratings.

<p align="center">
  <img width="900" alt="Intervention detail" src="https://github.com/user-attachments/assets/22316a00-241d-48dd-aa00-dd929706deb8" />
</p>

### 💰 Invoicing & payments
Automatic invoice generation on closure, multiple payment methods (cash, card, bank transfer, D17), technician cash-remittance tracking.

<p align="center">
  <img width="900" alt="Invoices" src="https://github.com/user-attachments/assets/3f308b40-25c6-40cb-9dc2-515c81082632" />
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

Built as a **PFE (Projet de Fin d'Études)** at Collège LaSalle Tunis, 2026, for a real Tunisian fiber optic subcontractor. The demo dataset simulates a week of operations across four regions with realistic Tunisian names, addresses, and fiber-optic terminology.

## License

MIT — see [LICENSE](./LICENSE).

## Author

**Amer Oun** — [LinkedIn](https://www.linkedin.com/in/amer-oun-b33212312/) · [Email](mailto:ounamer31@gmail.com)
