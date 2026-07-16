# AI for Humanity Compass

A lightweight team workspace for evaluating AI projects across eight human-centered dimensions. The app guides a team from evidence and scoring to a server-derived `GO`, `FIX`, `PAUSE`, or `PENDING` decision.

## What is included

- One email-code sign-in flow
- Multiple organizations with admin, assessor, and viewer roles
- A project dashboard and guided eight-step assessment
- Evidence/issues, 0–100 scores, and mitigation actions
- Automatic decision rules: red `0–39`, yellow `40–69`, green `70–100`
- Cloudflare D1 persistence and Sites hosting

## Local development

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example .dev.vars
npm run dev
```

In local development, requesting a sign-in code returns the code in the response so email credentials are optional. Data is stored in the local D1 database managed by Wrangler.

## Production environment

Configure these values in Sites:

```env
APP_ENV=production
APP_URL=https://your-deployed-site.example
SESSION_SECRET=a-long-random-secret
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=AI for Humanity Compass <compass@your-verified-domain.example>
```

`RESEND_API_KEY` and `EMAIL_FROM` are required to deliver sign-in codes and invitations in production.

## Useful commands

```bash
npm run dev          # local Sites-compatible development
npm run lint         # code quality checks
npm run test         # decision tests and production build
npm run db:generate  # regenerate checked-in D1 migrations
```

## Project structure

- `app/` — interface and route handlers
- `db/` and `drizzle/` — D1 schema, prepared queries, and migrations
- `lib/` — authentication, authorization, access, and decision logic
- `shared/` — shared domain types and the eight Compass dimensions
- `worker/` — Cloudflare Worker entry point

Created at Claremont Graduate University by the AI for Humanity Lab and CISAT.
