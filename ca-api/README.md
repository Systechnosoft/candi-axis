# CandiAxis API

The core backend service for the **CandiAxis** Applicant Tracking System (CA). 
Built with [NestJS](https://nestjs.com/), TypeScript, and PostgreSQL.

## 🚀 Features
- **Candidate & Job Pipeline Management**: Complete API suite for requisitions, candidate tracking, and interviews.
- **Robust Database Architecture**: Strictly typed, normalized PostgreSQL schema with 37+ core entities.
- **Automated Database Migrations**: Seamless SQL-based migration tracking and rollback protection.
- **Role-Based Access Control**: Highly granular module-level permissions for Super Admins, Recruiters, and Hiring Managers.

---

## ⚙️ Environment Setup

Before starting the application, ensure you have your environment variables configured. 
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Update the `.env` file with your specific `DATABASE_URL`, `SUPABASE_URL`, and other necessary secrets.

---

## 📦 Installation

Install all required NPM dependencies:

```bash
$ npm install
```

---

## 🗄️ Database Management

CandiAxis uses a custom SQL migration runner to manage its PostgreSQL database. 

```bash
# 1. Run all pending database migrations (creates all tables and constraints)
$ npm run db:migrate

# 2. Seed the database with default organizations, roles, and admin settings
$ npm run db:seed

# 3. Bootstrap the initial Super Admin user
$ npm run db:bootstrap

# 💡 Shortcut: Run the entire database setup sequence at once:
$ npm run setup
```

---

## 🏃 Running the Application

```bash
# Development mode (with auto-reload)
$ npm run start:dev

# Standard run
$ npm run start

# Production mode
$ npm run start:prod
```

---

## 🧪 Testing

```bash
# Unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# Test coverage
$ npm run test:cov
```

---

## 🛡️ License
CandiAxis is proprietary software. All rights reserved.
