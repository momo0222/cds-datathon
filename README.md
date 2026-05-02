# TRVL — AI-Powered Collaborative Travel Planning

> Plan trips together, not in 47 open tabs.

TRVL consolidates flights, itineraries, budgets, and sharing into one app — with AI that can build entire trips from a prompt or parse your booking emails automatically.

**Live Demo:** [trvl-iota.vercel.app](https://trvl-iota.vercel.app)

**Demo Account:**
| | |
|---|---|
| **Email** | `demo@trvl.app` |
| **Password** | `demo1234` |

---

## The Problem

Planning a group trip means juggling Google Docs, spreadsheets, Venmo threads, screenshot dumps, and 47 browser tabs. Nobody knows what's booked, what's suggested, or who's over budget.

## Our Solution

A single collaborative workspace for every trip, powered by AI:

- **AI Trip Builder** — Describe your trip ("5 days in Tokyo, food-heavy, $2500 budget") and get a full day-by-day itinerary generated instantly
- **Smart Email Import** — Paste a booking confirmation email and AI extracts the hotel, flight, or activity into your itinerary automatically
- **AI Budget Analysis** — One-click spending analysis with actionable tips ("You've spent 60% of your budget on hotels — consider hostels for the last 2 nights")
- **Real-time Collaboration** — Invite friends as editors or viewers with role-based permissions
- **Flight Search** — Compare flights directly in the app
- **Shareable Links** — Generate public read-only links for anyone to view the itinerary

---

## Key Features

### AI-Powered Planning
| Feature | What it does |
|---|---|
| **Trip Builder** | Generates a complete multi-day itinerary from a natural language prompt |
| **Email Import** | Parses booking confirmation emails into structured itinerary items |
| **Budget Analyzer** | Analyzes spending patterns and gives personalized saving tips |

### Collaboration & Sharing
| Feature | What it does |
|---|---|
| **Role-based access** | Owner, editor, and viewer roles enforced at API and UI level |
| **Email invites** | Invite collaborators by email with role selection |
| **Public share links** | Generate expirable read-only links for non-users |

### Trip Management
| Feature | What it does |
|---|---|
| **Day-by-day itinerary** | Organized timeline with drag-and-drop items |
| **Inline editing** | Click any field to edit — budget, items, expenses |
| **Category breakdown** | Expandable spending categories showing each item |
| **Flight comparison** | Search and compare flights by route and date |
| **Expense tracking** | Add manual expenses, auto-tracks booked item costs |

---

## Tech Stack

| Layer | Tech | Why |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Fullstack React with server components, API routes, and an auth proxy |
| **Database** | Supabase (Postgres) | Auth, row-level security, instant REST API |
| **AI** | OpenAI GPT-4.1 | Structured JSON output for reliable itinerary generation |
| **Styling** | Tailwind CSS | Rapid UI development with consistent design tokens |
| **Auth** | Supabase Auth + middleware | Session-based auth with protected routes |
| **Deployment** | Vercel | Zero-config Next.js hosting with edge functions |

---

## Architecture Highlights

- **Server Components + API Routes** — Server components for initial data fetching, API routes for mutations. No client-side Supabase credentials for writes.
- **Admin Client Pattern** — A `supabase-admin` client using the service role key bypasses RLS for server-side operations, while the browser client respects row-level security.
- **Role Enforcement at Two Layers** — Every write API route checks the user's trip role (owner/editor/viewer). The UI also hides edit controls for viewers, but the API is the source of truth.
- **AI with Structured Output** — `askAIJSON<T>()` uses OpenAI's JSON mode to return typed, parseable responses — no fragile regex or markdown parsing.
- **Auth Guard** — `proxy.ts` redirects unauthenticated users away from protected routes before any page code runs.

---

## Quick Start

```bash
git clone <NEW_REPO_URL>
cd <NEW_REPO_FOLDER>
npm install

# Set up Supabase: create a project, run supabase/schema.sql in the SQL editor

cp .env.example .env.local
# Fill in your keys (see below)

npm run dev
```

For local development, open [http://localhost:3000](http://localhost:3000) after the dev server starts.

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
```

---

## Database Schema

Postgres via Supabase with row-level security enabled on all tables:

| Table | Purpose |
|---|---|
| `profiles` | User profiles (extends Supabase auth) |
| `trips` | Trip metadata — destination, dates, budget, currency |
| `trip_members` | Membership with roles: `owner`, `editor`, `viewer` |
| `days` | Individual days within a trip |
| `itinerary_items` | Flights, hotels, activities, restaurants with cost tracking |
| `expenses` | Manual expense entries per trip |
| `shared_links` | Public share links with optional expiration |

Full schema: [`supabase/schema.sql`](./supabase/schema.sql)

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/trips` | GET, POST | List/create trips |
| `/api/trips/[id]` | GET, PATCH, DELETE | Trip CRUD |
| `/api/trips/[id]/days` | GET, POST | Day management |
| `/api/trips/[id]/expenses` | GET, POST | Expense tracking |
| `/api/trips/[id]/members` | GET, POST | Member invites |
| `/api/trips/[id]/share-link` | GET, POST, PATCH, DELETE | Share link management |
| `/api/days/[dayId]/items` | GET, POST | Itinerary items per day |
| `/api/items/[id]` | PATCH, DELETE | Edit/delete items |
| `/api/flights` | GET | Flight search |
| `/api/ai/trip-builder` | POST | AI full trip generation |
| `/api/ai/import-email` | POST | AI booking email parser |
| `/api/ai/budget-analyze` | POST | AI spending analysis |

---

## Team

Built during a hackathon sprint by a team of 3.
