# 🎨 ProjectGallerie

> **ProjectGallerie** is a premium, enterprise-grade digital operating system engineered specifically for high-end art galleries, auction houses, and fine art institutions. It bridges the gap between aesthetic excellence and operational precision, managing high-value art collections, secure transactions, and intricate branch workflows with absolute ease.

Built for the unique complexities of the fine art market, **ProjectGallerie** replaces disjointed spreadsheets with a unified, real-time command center. The system manages multi-million dollar catalogs, multi-branch consignments, client reservations, and secure transfer logistics under a highly secure, role-based ecosystem.

---

### 🌟 Key Capabilities
* **Dynamic Inventory & Master View:** Real-time visibility into artwork locations, artist profiles, dimensions, frame statuses, and active valuations across multiple physical galleries.
* **Chain of Custody & Logistics:** Auditable request-and-approval workflows for high-value artwork transfers, courier scheduling, and digital delivery tracking.
* **Finance, Sales & Auction Engine:** Multi-step approval pipelines for sales records, payment plans, event exhibitions, and live auction catalog management.
* **Enterprise Security & Accountability:** Granular role-based access control (RBAC), a robust database audit logging module, and a "Time Machine" feature for point-in-time catalog recovery.

---

### 💻 High-Performance Tech Stack
Designed for zero-latency execution, **ProjectGallerie** utilizes a modern, serverless Jamstack architecture:
* **Frontend:** A React 19 and Vite Single Page Application, optimized for instantaneous global delivery via the Vercel Edge Network.
* **Backend:** Powered by Supabase Pro (PostgreSQL, GoTrue Authentication, and Object Storage for high-definition artwork assets).
* **Communications:** An Express.js microservice handling secure, rate-limited transactional email workflows.

---

### 🚀 Getting Started Locally

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Configure Environment Variables
Create a `.env` or `.env.local` file at the root and populate your Supabase and Email configuration:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
```

#### 3. Run the Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.
