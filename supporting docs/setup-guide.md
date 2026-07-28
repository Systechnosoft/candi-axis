# CandiAxis (ATS) - Local Setup Guide

Welcome to the CandiAxis Applicant Tracking System! This guide will help you get the entire application running locally on your Windows machine in just a few minutes.

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your machine:
1. **Node.js** (v18 or higher)
2. **Docker Desktop** (Required for Supabase local database containers)
3. **PowerShell** (Windows default terminal)

---

## 🚀 Step 1: Start the Local Database

CandiAxis uses Supabase for its local database and authentication infrastructure. The configuration for this lives inside the API folder.

1. Open a new terminal.
2. Navigate to the API directory:
   ```cmd
   cd "C:\Users\Tejpal Singh\Desktop\Company Project\ATS\ATS-code-workspace\ca-api"
   ```
3. Start the Supabase containers:
   ```cmd
   npx supabase start
   ```
   *Note: This might take a minute the first time as it downloads the necessary Docker images. Ensure Docker Desktop is running before executing this.*

---

## ⚡ Step 2: Run the Unified Startup Script

We have bundled the entire startup sequence into a single, automated script. Because of default Windows security policies, you need to run it with a flag that allows script execution.

1. Open a **PowerShell** terminal.
2. Navigate to the root workspace directory:
   ```powershell
   cd "C:\Users\Tejpal Singh\Desktop\Company Project\ATS\ATS-code-workspace"
   ```
3. Run the startup script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\start.ps1
   ```

---

## 🧠 What happens next?

When you run the `start.ps1` script, it automatically orchestrates your entire environment by opening three new windows:

1. **Storage (MinIO):** Automatically downloads (if missing) and starts a local S3-compatible storage server for handling resumes and documents.
2. **API Setup:** Automatically runs `npm run env:check`, applies all database migrations (`npm run db:migrate`), inserts default data (`npm run db:seed`), and creates the default admin user (`npm run db:bootstrap`).
3. **Backend Server:** Starts the NestJS API server in development mode.
4. **Frontend UI:** Starts the NextJS Frontend interface.

---

## 🌐 Accessing the Application

Once everything is booted up, you can access your services here:

- **Frontend Interface:** [http://localhost:3001](http://localhost:3001)
- **Backend API:** [http://localhost:3000](http://localhost:3000)
- **MinIO Storage Console:** [http://127.0.0.1:9001](http://127.0.0.1:9001)
- **Supabase Local Studio (DB Manager):** [http://localhost:54323](http://localhost:54323) *(Check terminal output from Step 1 for exact Studio URL)*

---

## 🛑 How to Stop the Application

1. Close the three background windows that popped open (MinIO, Backend, Frontend).
2. To stop the database, run:
   ```cmd
   cd ca-api
   npx supabase stop
   ```
