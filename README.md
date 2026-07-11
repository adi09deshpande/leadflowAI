# LeadFlow AI

LeadFlow AI is a full-stack lead management and outreach app built with:

- React + Vite frontend
- FastAPI backend
- Supabase as the database
- Gemini for lead enrichment and email generation
- Resend for sending emails

## Challenge Fit

LeadFlow AI matches the "AI lead generation" workflow challenge by covering the full journey from lead ingestion to AI-assisted outreach inside one CRM-style product.

It supports:

- importing leads from CSV or manual entry
- calculating lead scores with deterministic backend rules
- automatically enriching CRM data with AI
- generating intelligent prospect summaries
- creating personalized four-step cold email sequences
- saving reusable outreach templates for SaaS, agency, recruiting, and partnership workflows
- scheduling follow-up steps in the outreach sequence
- sending outreach through Resend with sent and delivered status tracking (open, click, bounce, and complaint tracking require a verified custom domain and can be added later)
- managing leads through a smart dashboard with analytics, task reminders, and activity tracking

## Overview

LeadFlow AI helps you:

- store and manage leads
- import leads from CSV
- score leads with rule-based logic
- enrich leads with AI
- save reusable outreach templates
- generate four-step cold email sequences
- schedule follow-up emails with a 0/2/5/9 day cadence
- send sequence emails through Resend
- create CRM task reminders for calls, research, proposals, meetings, and manual follow-ups
- track lead activity, delivery status, and analytics

The current app also includes a simple single-user login flow.

Default login credentials:

- Username: `admin`
- Password: `admin123`

These values are configurable through the root `.env` file.

## Workflow Architecture

### Input -> Process -> Output

```text
Input
  CSV upload or manual lead creation

Process
  Frontend captures lead data
    ->
  FastAPI backend validates and stores leads in Supabase
    ->
  Backend calculates a rule-based lead score
    ->
  Gemini enriches the lead with summary, company context, and tags
    ->
  Gemini generates a personalized four-step outreach sequence
    ->
  Backend stores sequence emails, schedule state, send state, delivery state, task reminders, and activity logs

Output
  Smart CRM dashboard with enriched leads, summaries, scheduled outreach, task reminders, pipeline status, and analytics
```

### System Architecture

```text
React + Vite Frontend
  ->
FastAPI API Layer
  ->
Service Layer
  - deterministic lead scoring
  - Gemini enrichment
  - Gemini prospect summaries
  - Gemini cold email sequence generation
  - Resend email delivery
  ->
Supabase
  - leads
  - emails
  - tasks
  - email_templates
  - activity
```

### Core AI Workflow

1. A lead enters the system through CSV import or manual creation.
2. The backend stores the lead and makes it available in the CRM dashboard.
3. The backend calculates a deterministic score from lead completeness, business email quality, decision-maker title signals, and company context.
4. Gemini adds summary, tags, industry, company size, and revenue context.
5. A personalized four-email sequence is generated automatically for enriched leads.
6. Users can choose a saved outreach template to guide the sequence angle.
7. Users review, regenerate, copy, schedule, and send each sequence step from the Email page.
8. Scheduled follow-ups are stored on each sequence email; the app tracks when a step is planned or due.
9. Sent status is stored immediately after Resend accepts an email.
10. Delivered status is updated automatically through the Resend webhook (open, click, bounce, and complaint tracking require a verified custom domain and can be added later).
11. Lead activity, email state, task reminders, templates, and dashboard metrics stay synced across the app.

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

- calculates lead scores with backend rules instead of relying on Gemini's judgment
- scoring considers lead completeness, business email domain, title seniority, website, LinkedIn, industry, company size, revenue, location, summary, and tags
- current scoring weights are: name +5, valid email +10, business email domain +10, company +10, title +10, decision-maker title +20, website +10, LinkedIn +10, industry +10, company size +10, revenue +5, location +5, summary +5, and tags +5, capped at 100
- enriches lead context using Gemini
- stores generated summaries and enrichment fields
- prepares a four-step email sequence automatically when a lead is enriched
- re-enrichment reuses an existing complete email sequence and only generates missing sequence steps, so sent emails are not duplicated or overwritten

### Email Workflow

- only enriched leads can have outreach sequences generated or sent
- generated sequences contain four steps: intro, follow-up, value proof, and breakup
- saved templates can guide the outreach angle before a sequence is generated
- saved sequence emails are reused when available
- automatic sequence repair only fills missing steps; it does not create replacement records for steps that already exist
- manual sequence regeneration refreshes only unsent draft steps and preserves steps that were already sent
- sequence steps can be scheduled individually or with a 0/2/5/9 day follow-up cadence
- individual sequence emails can be sent through Resend
- sent status is saved immediately after Resend accepts the email
- delivered status is updated by the Resend webhook and appears in the Email page without a manual reload (open, click, bounce, and complaint tracking require a verified custom domain and can be added later)

### Tasks and Reminders

- create lead-specific tasks for calls, research, proposals, meetings, and manual follow-ups
- assign due dates, priority, notes, and completion state
- view open, completed, or all reminders from the Tasks page
- task changes are logged to the activity feed

### Email Template Library

- save reusable templates for SaaS founder outreach, agency client outreach, recruiting outreach, partnership outreach, or custom categories
- each template stores category, description, subject guidance, body guidance, tone, and tags
- templates can be selected on the Email page before generating or regenerating a sequence
- the Supabase schema seeds four starter templates if they do not already exist

### CRM Dashboard and Analytics

- tracks lead status through table and kanban views
- shows recent activity and operational metrics
- reflects enrichment progress, sent and delivered email state, delivery rate, and pipeline movement

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
- a Resend webhook secret if you want delivered status to update automatically

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
SUPABASE_TASKS_TABLE=tasks
SUPABASE_TEMPLATES_TABLE=email_templates

RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=LeadFlow AI <onboarding@yourdomain.com>
RESEND_REPLY_TO=founder@yourdomain.com
RESEND_WEBHOOK_SECRET=whsec_your_resend_webhook_secret_here

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
  Required for AI enrichment and email sequence generation.

- `GEMINI_MODEL`
  Gemini model used by the backend.

- `SUPABASE_URL`
  Supabase project URL.

- `SUPABASE_SERVICE_ROLE_KEY`
  Service role key used by the backend.

- `SUPABASE_LEADS_TABLE`
- `SUPABASE_EMAILS_TABLE`
- `SUPABASE_ACTIVITY_TABLE`
- `SUPABASE_TASKS_TABLE`
- `SUPABASE_TEMPLATES_TABLE`
  Table names used by the backend.

- `RESEND_API_KEY`
  Required for sending emails.

- `RESEND_FROM_EMAIL`
  Default sender used by Resend.

- `RESEND_REPLY_TO`
  Default reply-to email.

- `RESEND_WEBHOOK_SECRET`
  Optional for sending, but required for automatic delivered tracking. Use the signing secret from your Resend webhook settings.

- `VITE_API_BASE_URL`
  Optional. Useful when the frontend should call the backend directly instead of relying on a local proxy.

## Database Setup

Run [supabase_schema.sql](supabase_schema.sql) inside your Supabase SQL editor.

This schema creates:

- `public.leads`
- `public.emails`
- `public.tasks`
- `public.email_templates`
- `public.activity`

It also:

- adds useful indexes
- enables row level security
- creates service-role-only policies
- adds an `updated_at` trigger for leads
- stores email sequence metadata with `sequence_step` and `sequence_label`
- stores email scheduling metadata with `scheduled_at` and `schedule_status`
- stores Resend delivery identifiers with `provider_message_id`
- stores CRM reminders in `public.tasks`
- stores reusable outreach templates in `public.email_templates`
- seeds starter templates for SaaS founder, agency client, recruiting, and partnership outreach
- tracks only `sent` and `delivered` email states
- removes older open, click, reply, and bounce tracking columns if they exist from a previous setup

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
- `RESEND_WEBHOOK_SECRET`

You can also change:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `AUTH_TOKEN`

if you do not want to keep the default single-user login credentials.

### Step 3: Set Up the Database in Supabase

Open your Supabase project SQL editor and run:

- [supabase_schema.sql](supabase_schema.sql)

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
   - save reusable email templates
   - generate and send four-step email sequences
   - apply templates when generating outreach
   - schedule follow-up sequence steps
   - create task reminders for manual sales work
   - send sequence emails and track sent/delivered status
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
4. A four-step email sequence is automatically prepared for that lead
5. If the lead is enriched again later, existing sequence steps are reused and only missing steps are generated

### Create and Apply Email Templates

1. Go to the Templates page
2. Create a reusable template for a SaaS, agency, recruiting, partnership, or custom outreach angle
3. Add subject guidance, body guidance, tone, and tags
4. Go to the Email page
5. Select a template before generating or regenerating a sequence
6. Gemini uses the selected template as guidance while still personalizing the sequence for the selected lead

### Generate and Send an Email Sequence

1. Go to the Email page
2. Select a lead
3. If the lead is not enriched, enrich it first
4. Optionally choose a saved template to guide the outreach angle
5. Review the generated sequence tabs:
   - Email 1: Intro
   - Email 2: Follow-up
   - Email 3: Value proof
   - Email 4: Breakup
6. Send the sequence step you want to test or use
7. The Email page marks the message as sent after Resend accepts it
8. The delivered badge updates automatically after Resend posts the delivered webhook event (open, click, bounce, and complaint tracking require a verified custom domain and can be added later)

### Schedule Follow-Up Emails

1. Go to the Email page
2. Select an enriched lead with a saved sequence
3. Set a date/time for the active email step, or choose a sequence start date
4. Apply the 0/2/5/9 day cadence to schedule unsent steps
5. Use the Scheduled and Due badges to decide what to send next

Note:

- scheduling stores planned send times; it does not silently send emails in the background
- sent sequence steps are preserved and are not rescheduled by the cadence button

### Create Task Reminders

1. Go to the Tasks page
2. Select a lead
3. Create a reminder for a call, research, proposal, meeting, follow-up, or other task
4. Add a due date, priority, and optional notes
5. Mark the task complete when the manual work is done

Note:

- the backend enforces the enriched-lead requirement for both sequence generation and sending
- Resend's free test sender is limited, so test with your own verified recipient or a verified sending domain

## Demo Guide

If you are recording the 5-10 minute demo for the challenge, this is a strong flow:

1. Show the project goal: AI-powered lead generation and CRM workflow.
2. Import a CSV file with sample leads.
3. Open the Leads page and show unenriched vs enriched lead states.
4. Trigger AI enrichment for a lead and explain the rule-based score, summary, and tags.
5. Open the Templates page and show reusable outreach templates.
6. Open the Email page, choose a template, and show the generated four-step cold email sequence.
7. Show that sequence emails are saved, labeled, tied to enriched leads, and schedulable.
8. Apply the follow-up cadence and point out scheduled/due badges.
9. Create a task reminder for manual sales work.
10. Send one email through Resend and show the sent/delivered badges.
11. Walk through the Dashboard / Analytics view to show CRM visibility and delivery metrics.
12. Briefly explain the architecture: React frontend, FastAPI backend, Gemini for AI, Supabase for persistence, Resend for delivery.

## Why This Matches the Challenge

- It starts with lead ingestion, not just email generation.
- It combines deterministic scoring with AI enrichment, summaries, and personalized outreach.
- It adds CRM workflow depth through follow-up scheduling and task reminders.
- It persists and manages leads inside a CRM workflow.
- It provides clear input -> process -> output architecture for review.
- It is implemented as a public GitHub project and is demo-ready.

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
- `/api/tasks`
- `/api/templates`

Useful email routes:

- `GET /api/ai/email/{lead_id}/sequence`
- `POST /api/ai/email/{lead_id}/sequence`
- `POST /api/ai/email/{lead_id}/send`
- `PATCH /api/ai/email/{lead_id}/{email_id}/schedule`

Useful task routes:

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/{task_id}`
- `DELETE /api/tasks/{task_id}`

Useful template routes:

- `GET /api/templates`
- `POST /api/templates`
- `PATCH /api/templates/{template_id}`
- `DELETE /api/templates/{template_id}`

Public webhook route:

- `POST /api/webhooks/resend`

Configure this URL in Resend to automatically update delivered status. Subscribe only to the `email.delivered` event for the current app (open, click, bounce, and complaint tracking require a verified custom domain and can be added later). In production, set `RESEND_WEBHOOK_SECRET` from the Resend webhook settings so the backend can verify webhook signatures.

For local testing, Resend cannot call `localhost:8000` directly. Run a tunnel such as:

```bash
ngrok http 8000
```

Then use the forwarded HTTPS URL plus `/api/webhooks/resend` as the Resend webhook endpoint.

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

### Delivered Badge Does Not Update

Check:

- the backend is running on port `8000`
- the Resend webhook endpoint points to your public backend URL plus `/api/webhooks/resend`
- local testing uses a tunnel such as `ngrok http 8000`
- the webhook is subscribed to `email.delivered`
- `RESEND_WEBHOOK_SECRET` matches the signing secret from Resend
- the email row has a `provider_message_id` saved after sending

The app intentionally tracks only sent and delivered. Open, click, reply, bounce, and complaint tracking were removed because they are not reliable for this free/local setup without a proper verified sending domain and additional provider support.

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
- the Resend webhook uses a shared signing secret from `.env`
- this is not a production-grade multi-user auth system

If you plan to deploy this publicly, you should replace it with a proper user auth system.

## Safe-to-Delete Local Files

These are generated locally and can usually be recreated:

- `backend/.venv/`
- `frontend/node_modules/`
- `frontend/dist/`
- Python `__pycache__` folders
