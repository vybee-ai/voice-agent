# OneX Lead Management

A Dubai-focused property lead-management and sales-operations platform, built as the UI/application layer on top of an existing workflow:

**Property Enquiry → Voice Agent Call → Recording/Transcript → AI Qualification → Analysis → Google Sheet**

Next.js 14 (App Router) + TypeScript + Tailwind CSS. Ships with a realistic **demo mode** so it's presentable immediately, and a **live mode** that reads from a real Google Sheet.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # defaults to APP_MODE=demo — no credentials needed
npm run dev
```

Open http://localhost:3000 — it redirects to `/dashboard`.

## Demo mode vs. live mode

Controlled by `APP_MODE` in `.env.local`:

- **`APP_MODE=demo`** (default) — uses the built-in, realistic Dubai dataset in `services/demoData.ts`. No external services required. This is what you get out of the box.
- **`APP_MODE=live`** — reads leads and calls from your Google Sheet via a server-side service account. Associates, WhatsApp conversations, and follow-ups currently still come from the demo roster until those get their own worksheets/APIs — see "Extending live mode" below.

The app never silently fabricates data: if a value is missing from the Sheet, the UI shows **"Not provided"** rather than inventing something. If live credentials are missing, the app falls back to demo data automatically.

## Connecting the real Google Sheet

1. Create a Google Cloud service account, enable the Sheets API, and share your spreadsheet with the service account's email (view access is enough).
2. Your spreadsheet needs a `Leads` worksheet (and optionally a `Calls` worksheet) with headers roughly matching the columns listed in `lib/normalize.ts` (e.g. `Buyer Name`, `Phone`, `Status`, `Temperature`, `Score`, `Call Outcome`, `Recording URL`, `Transcript`, etc). Column names are matched defensively (a few common variants are checked), and normalization tolerates messy formatting.
3. Set these in `.env.local`:
   ```
   APP_MODE=live
   GOOGLE_SHEET_ID=your-sheet-id
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
   (Keep the `\n` literal characters in the private key when pasting into `.env.local` — the adapter unescapes them at runtime.)
4. Restart the dev server / redeploy.

Credentials are read server-side only (`services/googleSheetsAdapter.ts`) and are never sent to the browser.

## WhatsApp & Voice provider settings

`Settings → WhatsApp` and `Settings → Voice` show connection status driven by env vars — no secrets are hardcoded:

```
WHATSAPP_PROVIDER=twilio          # or "meta"
WHATSAPP_NUMBER=+9715XXXXXXX
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
META_WHATSAPP_TOKEN=
META_WHATSAPP_PHONE_ID=

VOICE_PROVIDER=twilio
VOICE_PHONE_NUMBER=+9715XXXXXXX
VOICE_AGENT_NAME=Sofia
VOICE_RECORDING_ENABLED=true
VOICE_TRANSCRIPT_ENABLED=true
```

**Sending WhatsApp messages from the UI is not wired to a live provider in this build.** The composer and quick-action buttons work and show optimistic messages in the thread, but `services/whatsappService.ts:sendMessage()` is a clearly-labelled stub that returns `ok: false` with an explanation — this is intentional so the demo never pretends a message was actually delivered. To go live, implement that function to call your configured provider from a server route (Twilio REST API or Meta Cloud API), using the env vars above.

## Architecture

```
Google Sheet (or demo data)
      ↓
services/googleSheetsAdapter.ts | services/demoAdapter.ts   (raw I/O)
      ↓
services/dataSource.ts                                       (switches demo/live)
      ↓
lib/normalize.ts                                              (raw row → typed model)
      ↓
services/leadsService.ts, callsService.ts, whatsappService.ts,
analyticsService.ts, associatesService.ts, followUpsService.ts,
activityService.ts, settingsService.ts                        (what the UI calls)
      ↓
app/*  +  components/*                                        (UI)
```

- `lib/types.ts` — application data models, decoupled from raw Sheet column names.
- `lib/normalize.ts` — the only place that reads raw Sheet columns; tolerant of blanks/formatting drift.
- `lib/marketConfig.ts` — single source of truth for country/city/currency/phone-code/timezone (currently Dubai/AED/+971) so the market can be swapped later without touching every screen.
- `lib/leadUtils.ts` — pure filter/sort helpers kept separate from the data-fetching service so client components never accidentally bundle server-only Google API code.
- Swapping the Sheet for a real database later only means writing a new adapter with the same shape as `demoAdapter`/`googleSheetsAdapter` and pointing `dataSource.ts` at it — no UI changes required.

## Routes

`/dashboard`, `/leads`, `/leads/[id]`, `/calls`, `/calls/[id]`, `/whatsapp`, `/whatsapp/[leadId]`, `/follow-ups`, `/analytics`, `/associates`, `/settings`, `/settings/integrations`, `/settings/whatsapp`, `/settings/voice`, `/settings/ai-agent`, `/settings/team`.

## Deployment

Any standard Node hosting platform that supports Next.js works (Vercel is the path of least resistance):

```bash
npm run build
npm run start
```

**Vercel (recommended, fastest to a shareable URL):**
1. Push this project to a GitHub repo.
2. Import it in Vercel.
3. Add the environment variables from `.env.example` in the Vercel project settings (leave `APP_MODE=demo` if you just want a clean client demo link; set it to `live` with Google credentials once the Sheet is ready).
4. Deploy — you'll get a `https://your-project.vercel.app` URL you can share directly.

No local install is required for the person you're sharing it with; only for you as the developer.

## What's simplified in this build vs. the full spec

Being upfront about the current limits so nothing in the UI overstates what's connected:

- **Associates, WhatsApp conversations, and follow-ups** currently come from the demo roster/dataset even in live mode, since the source spec didn't define dedicated worksheets/APIs for them. Wiring these to real data means adding the equivalent worksheets (or another data source) and extending `googleSheetsAdapter.ts` — the UI layer needs no changes.
- **WhatsApp sending** is a stubbed, clearly-labelled no-op (see above) until a provider is wired up server-side.
- **Real-time updates** use manual refresh (the header's Refresh button, which calls `router.refresh()`) rather than polling or websockets, per the spec's guidance to keep this version simple.
