# LeadFlow AI

LeadFlow AI is a full-stack lead management and outreach app built with:

- React + Vite frontend
- FastAPI backend
- Supabase as the database
- Gemini for lead enrichment and email generation
- Resend for sending emails

## Overview

LeadFlow AI helps you:

- store and manage leads
- import leads from CSV
- enrich leads with AI
- generate cold email drafts
- send emails through Resend
- track lead activity and analytics

The current app also includes a simple single-user login flow.

Default login credentials:

- Username: `admin`
- Password: `admin123`

These values are configurable through the root `.env` file.

## Project Structure

```text
leadflow-ai/
  .gitignore             Root ignore rules
  README.md              Project documentation
  supabase_schema.sql    Database schema for Supabase

  backend/
    app/
      api/               FastAPI route handlers
      core/              Settings, auth, database helpers
      models/            Pydantic schemas
      repositories/      Database access layer
      services/          Gemini and email services
    main.py              FastAPI entrypoint
    requirements.txt     Python dependencies

  frontend/
    src/
      components/        Reusable UI and layout components
      pages/             Route-level pages
      services/          API client helpers
      store/             Client-side state and auth/leads context
    package.json         Frontend scripts and dependencies
```

## Features

### Lead Management

- create, edit, delete, and browse leads
- view leads in table and kanban layouts
- filter by status, source, and search terms

### CSV Import

- validates required CSV columns before import
- shows clear errors for unsupported columns, bad rows, and invalid emails
- supports common column aliases such as `full name`, `email address`, and `company name`

### AI Enrichment

- enriches leads using Gemini
- stores generated summaries and enrichment fields
- prepares email drafts automatically when a lead is enriched

### Email Workflow

- only enriched leads can be drafted and sent
- saved drafts are reused when available
- emails can be sent through Resend
- send activity is stored for analytics and activity feeds

### Authentication

- single-user login
- frontend login page
- backend bearer-token enforcement for protected API routes
- credentials and token come from `.env`

## Tech Stack

### Frontend

- React 19
- Vite
- React Router
- Framer Motion
- Tailwind CSS v4
- Recharts
- Papa Parse

### Backend

- FastAPI
- Uvicorn
- Pydantic v2
- Supabase Python client
- HTTPX
- Google Generative AI SDK

### External Services

- Supabase
- Google Gemini
- Resend

## Requirements

Before running the project locally, make sure you have:

- Node.js 20+ recommended
- npm
- Python 3.11+ recommended
- a Supabase project
- a Gemini API key
- a Resend API key if you want email sending to work

## Environment Variables

This project uses a single root `.env` file.

Create a file named `.env` in the project root and add the values below.

```env
ENVIRONMENT=development
FRONTEND_ORIGINS=http://localhost:5173,http://localhost:3000

ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
AUTH_TOKEN=leadflow-admin-token

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_LEADS_TABLE=leads
SUPABASE_EMAILS_TABLE=emails
SUPABASE_ACTIVITY_TABLE=activity

RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=LeadFlow AI <onboarding@yourdomain.com>
RESEND_REPLY_TO=founder@yourdomain.com

# Optional: only needed if the frontend should call the backend directly
VITE_API_BASE_URL=http://localhost:8000/api
```

Important variables:

- `ENVIRONMENT`
  Controls app environment name.

- `FRONTEND_ORIGINS`
  Comma-separated list of allowed frontend origins for backend CORS.

- `ADMIN_USERNAME`
  Login username for the single app user.

- `ADMIN_PASSWORD`
  Login password for the single app user.

- `AUTH_TOKEN`
  Backend token returned after login and used for protected API requests.

- `GEMINI_API_KEY`
  Required for AI enrichment and draft generation.

- `GEMINI_MODEL`
  Gemini model used by the backend.

- `SUPABASE_URL`
  Supabase project URL.

- `SUPABASE_SERVICE_ROLE_KEY`
  Service role key used by the backend.

- `SUPABASE_LEADS_TABLE`
- `SUPABASE_EMAILS_TABLE`
- `SUPABASE_ACTIVITY_TABLE`
  Table names used by the backend.

- `RESEND_API_KEY`
  Required for sending emails.

- `RESEND_FROM_EMAIL`
  Default sender used by Resend.

- `RESEND_REPLY_TO`
  Default reply-to email.

- `VITE_API_BASE_URL`
  Optional. Useful when the frontend should call the backend directly instead of relying on a local proxy.

## Database Setup

Run [supabase_schema.sql](/abs/path/d:/leadflow-ai/supabase_schema.sql:1) inside your Supabase SQL editor.

This schema creates:

- `public.leads`
- `public.emails`
- `public.activity`

It also:

- adds useful indexes
- enables row level security
- creates service-role-only policies
- adds an `updated_at` trigger for leads

## Start Here: Full Setup and Run Guide

Follow these steps in order if you are setting up the project for the first time.

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd leadflow-ai
```

### Step 2: Create the Root `.env` File

Create a file named `.env` in the project root.

Copy the full environment block from the `Environment Variables` section above into that file.

Then replace all placeholder values with your real values, especially:

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO`

You can also change:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `AUTH_TOKEN`

if you do not want to keep the default single-user login credentials.

### Step 3: Set Up the Database in Supabase

Open your Supabase project SQL editor and run:

- [supabase_schema.sql](/abs/path/d:/leadflow-ai/supabase_schema.sql:1)

This creates the required tables and policies used by the backend.

### Step 4: Install Backend Dependencies

Open a terminal and run:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### Step 5: Install Frontend Dependencies

Open a second terminal and run:

```bash
cd frontend
npm install
```

### Step 6: Start the Backend

In the backend terminal:

```bash
cd backend
.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

Backend endpoints:

- App info: `http://localhost:8000/`
- Health check: `http://localhost:8000/health`
- API base: `http://localhost:8000/api`

### Step 7: Start the Frontend

In the frontend terminal:

```bash
cd frontend
npm run dev
```

Frontend URL:

- `http://localhost:5173`

### Step 8: Log In and Use the App

1. Open `http://localhost:5173`
2. You will be redirected to the login page
3. Sign in using the credentials from your `.env`
4. After login, you can:
   - add leads manually
   - import leads from CSV
   - enrich leads with AI
   - generate and send emails
   - view dashboard metrics and analytics

### Default Login

If you did not change the auth values in `.env`, use:

- Username: `admin`
- Password: `admin123`

## Login Flow

After starting the app:

1. Open `http://localhost:5173`
2. You will be redirected to the login page
3. Sign in with the configured admin credentials
4. The frontend stores the backend-issued auth token locally
5. Protected API requests include that token automatically

## Common Workflows

### Add a Lead Manually

1. Log in
2. Open the Leads page
3. Click `Add Lead`
4. Fill the lead form
5. Save

### Import Leads from CSV

1. Open the Import page
2. Upload a `.csv` file
3. Fix validation errors if shown
4. Preview the parsed leads
5. Import them into Supabase

Required CSV columns:

- `name`
- `email`
- `company`

Recommended CSV columns:

- `title`
- `source`
- `linkedin`
- `website`
- `location`
- `industry`

Optional CSV columns:

- `phone`
- `company_size`
- `revenue`
- `notes`

### Enrich a Lead

1. Open Leads, Dashboard, or Enrich page
2. Trigger AI enrichment for a lead
3. The backend stores enrichment data
4. A draft email is automatically prepared for that lead

### Generate and Send an Email

1. Go to the Email page
2. Select a lead
3. If the lead is not enriched, enrich it first
4. Review the generated draft
5. Click `Send Email`

Note:

- the backend enforces the enriched-lead requirement for both draft generation and sending

## API Notes

The backend is organized under `/api`.

Public route:

- `POST /api/auth/login`

Protected route groups:

- `/api/leads/*`
- `/api/ai/*`
- `/api/stats`
- `/api/activity`
- `/api/analytics`

## Command Reference

### Frontend

```bash
cd frontend
npm run dev
```

Frontend lint:

```bash
npm run lint
```

Frontend production build:

```bash
npm run build
```

Frontend preview build:

```bash
npm run preview
```

### Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Backend quick import sanity check:

```bash
python -c "from app.api.leads import router; print('OK')"
```

## Troubleshooting

### Login Fails

Check:

- `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`
- backend was restarted after changing `.env`
- frontend is talking to the correct backend URL

### `Authentication required`

This usually means:

- you are not logged in
- the auth token is missing or stale
- the backend was restarted with a different `AUTH_TOKEN`

Try logging out and logging back in.

### Supabase Errors

Check:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- table names in `.env`
- schema has been executed in Supabase

### Gemini Errors

Check:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- quota and key validity in your Google AI account

### Email Send Fails

Check:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO`
- your sender/domain setup in Resend

### CSV Import Fails

Check:

- the file is a real `.csv`
- required columns exist
- headers are supported
- email values are valid
- there are actual lead rows in the file

## Security Notes

This project currently uses a simple single-user auth model intended for local use, demos, and personal projects.

Important limitations:

- credentials are stored in `.env`
- the app uses one shared backend token
- this is not a production-grade multi-user auth system

If you plan to deploy this publicly, you should replace it with a proper user auth system.

## Safe-to-Delete Local Files

These are generated locally and can usually be recreated:

- `backend/.venv/`
- `frontend/node_modules/`
- `frontend/dist/`
- Python `__pycache__` folders
