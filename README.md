# Hauler Lead Finder

A lead-sourcing dashboard for septic and grease-trap haulers in Seattle, WA.
Discovers companies via Google Places, verifies fleet size via FMCSA (USDOT
registration data), falls back to satellite-imagery truck counts when no
FMCSA record exists, and scores/ranks leads through a Kanban + table pipeline.

Stack: Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres) ·
shadcn-style UI components · Leaflet map.

## Runs with zero setup

`npm install && npm run dev` works immediately on a bundled mock dataset (14
fictional Seattle companies shaped exactly like real FMCSA + Places output),
so you can see the full UI — map, table, kanban, detail panel, scoring — before
wiring any API keys.

## Going live

1. Create a Supabase project, run `supabase/schema.sql` in the SQL editor.
2. Get a free FMCSA webKey: mobile.fmcsa.dot.gov → sign in via Login.gov.
3. Enable "Places API (New)" and "Maps Static API" in Google Cloud Console.
4. Copy `.env.example` to `.env.local` and fill in all values.
5. `npm run dev`, go to the Dashboard, click **Run lead discovery** — this
   calls `/api/enrich`, which searches Google Places for septic/grease
   companies, matches each against FMCSA by name, and writes everything to
   Supabase. Reload and you're on live data (the "Demo data" badge disappears).

## Project structure

```
app/
  page.tsx                 Dashboard: stats, map, top leads
  leads/page.tsx            Table + Kanban pipeline, filters
  api/leads/route.ts        GET all leads (Supabase or mock)
  api/leads/[id]/route.ts   PATCH status / add note
  api/enrich/route.ts       POST — runs the discovery + FMCSA pipeline
components/
  ui/                       shadcn-style primitives (Button, Card, Tabs, Sheet...)
  LeadsTable.tsx            Sortable table, click row to open detail
  KanbanBoard.tsx           Drag-and-drop pipeline (native HTML5 DnD)
  LeadMap.tsx / LeadMapClient.tsx   Leaflet map, dynamically imported (no SSR)
  SatelliteViewer.tsx        Satellite image + zoom + manual truck-count override
  LeadDetailSheet.tsx        Slide-over: Overview / FMCSA / Satellite / Notes tabs
  FiltersBar.tsx             Search, fleet-size range, category/status/source, sort
  ScoreRing.tsx               Ring gauge (detail) + inline badge (table/kanban)
  EnrichButton.tsx            Triggers /api/enrich, shows toast on completion
lib/
  types.ts, scoring.ts, filters.ts, useLeads.ts, fmcsa.ts, places.ts, supabase.ts
supabase/schema.sql          Full DB schema + RLS policies
```

## User actions on the frontend (what's wired up and what it does)

**Dashboard (`/`)**
- Loads leads on mount via `useLeads()` → `GET /api/leads`.
- **Run lead discovery** button → `POST /api/enrich` → toast shows
  companies found + FMCSA matches → list auto-refreshes.
- Map pins are colored/sized by score tier and fleet size; **clicking a pin**
  opens the same detail sheet as the table.
- **Top leads list** items are clickable, same detail sheet.

**Leads (`/leads`)**
- **Search box**: filters by company name, address, or DOT number, live as you type.
- **Category / Status / Source dropdowns**: exact-match filters, combine with search.
- **Fleet-size dual range slider**: filters by verified-or-estimated truck count.
- **Sort dropdown + direction toggle**: score, fleet size, name, or recency.
- **Clear filters**: appears only when filters differ from default.
- **Table ⟷ Pipeline toggle**: switches between sortable table and Kanban.
- **Kanban drag-and-drop**: dragging a card to a new column calls
  `updateStatus()` → optimistic UI update + `PATCH /api/leads/[id]`.
- **Row/card click**: opens the `LeadDetailSheet`.

**Lead detail sheet** (opens from any view)
- Header shows the score ring, status dropdown (changes pipeline stage from
  here too), call/website buttons, close button.
- **Overview tab**: fleet size, confidence (verified vs. estimated), reviews,
  longevity, source, last updated.
- **FMCSA tab**: USDOT/MC number, power units, drivers, operating status,
  filing date — or an empty state explaining why (too small to need
  registration, or name match needs review).
- **Satellite tab**: live satellite image (or bundled thumbnail in demo mode),
  **+ / − zoom controls**, and a **"Correct count"** button so a human can
  override the automated truck-count estimate after visually inspecting the lot.
- **Notes tab**: textarea + **Add note**, appended optimistically and persisted
  to `lead_notes` in Supabase.

All state changes (status, notes, filters) are optimistic in the UI first,
then synced to the backend — so the interface never feels like it's waiting
on a network round trip.

## Extending it

- Swap the mock 14-company seed for a scraped/imported list from the King
  County or Seattle Public Utilities certified hauler registry — insert
  directly into `companies` with `source = 'hauler_registry'`.
- Add a scheduled job (Supabase cron or a Vercel cron route) that re-runs
  `/api/enrich` weekly to catch new registrations and fleet-size changes.
- For higher-resolution imagery than Google's static tiles provide, swap the
  `imagery` write in `/api/enrich` for a SkyFi (or similar tasking API) call,
  gated behind a per-lead "get high-res image" action instead of running it
  for every lead automatically (it's priced per image).
