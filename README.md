# AI for Humanity Compass

A lightweight team workspace for evaluating AI projects across eight human-centered dimensions. The app guides a team from evidence and scoring to a server-derived `GO`, `FIX`, `PAUSE`, or `PENDING` decision.

**Leadership & team:** Developed under the leadership of **Dr. Itamar Shabtai**, Director of the AI for Humanity Lab (Claremont Graduate University). The project is currently being executed by AI for Humanity Lab Fellows **Mahesh Balan**, **Aashish Sunar**, and **Gauri Parnaik**.

**Framework guide (PDF):** [AI for Humanity Compass — Practical Guide for Responsible AI Decisions (V5)](attached_assets/AI_For_Humanity_Compass_V5.pdf) by Itamar Shabtai, Ph.D. (October 2025). Source Word document: [`AI_For_Humanity_Compass_V5_1769706807313.docx`](attached_assets/AI_For_Humanity_Compass_V5_1769706807313.docx).

---

## Key Messages from the Compass Guide

The Compass exists because AI moves fast, while people, organizations, and policy move slowly. It helps teams slow down at the right moments, ask the right questions, and take responsibility for impact — not only capability, efficiency, or cost.

### What it is
- A **practical decision tool** (not theory) to keep every AI initiative aligned with human dignity, safety, and well-being — before launch, during deployment, and after it is live.
- A shared language for eight essential questions: real human need; who benefits and who could be harmed; values in the design; what can go wrong; where a human stays in control; privacy and data boundaries; the good we aim to create; and how we measure trust, fairness, and well-being over time.

### The problem it solves
Most AI projects optimize for “What can we build?” and “How much can we save?” What gets missed:
- Unclear human impact (who is helped, stressed, or exposed to harm)
- Values that stay on slides instead of owners, tests, and review cycles
- No safety gates until after a complaint, headline, or injury
- No dignity check (stress, surveillance, bias, exclusion as outcomes)
- No clear escalation path when a real human must take responsibility
- “Humans in the loop” who lack authority, training, or capacity to intervene

### The eight dimensions
| Direction | Dimension | Focus |
|-----------|-----------|--------|
| N | Purpose | The human need — why this matters to a person, not just the business |
| NE | People | Who we help, who we might hurt, and whom we must protect |
| E | Values | Human values we refuse to trade away, and how we build them in |
| SE | Risks | Main ways this can go wrong, and what we are doing about it |
| S | Human-in-the-Loop | Where a qualified human can review, approve, or override — with skills, authority, and capacity |
| SW | Data & Privacy | Data boundaries, consent, retention, and access |
| W | Outcomes | Positive impact for people, the organization, and society |
| NW | Metrics of Humanity | Tracking trust, dignity, fairness, and well-being over time |

### How to use it (Go / Fix / Pause)
1. **Write the goal** in one sentence: “We are building ______ so that ______ can ______.”
2. **Walk the Compass** — short answers for each of the eight points.
3. **Traffic-light** each point: Green = clear and acceptable; Yellow = needs work; Red = unsafe / unclear / not acceptable. **If any point is Red, you do not ship.**
4. **Decide:** Go (all Green/Yellow with owners and deadlines), Fix (too many Yellows or missing owners), or Pause (unacceptable dignity/safety risk).

### Why it matters
- Stops “ship now, clean up later”
- Protects vulnerable groups, not just the average user
- Turns ethics into ownership and action
- Gives leaders permission to pause **before** harm, not after

### Organizational call to action
- Treat the Compass as a **launch gate** for AI that affects access, eligibility, safety, health, money, surveillance, or that replaces human judgment
- Complete it with a **cross-functional** group (not one person alone), at build / pilot / scale gates
- Put the right humans in the loop — with authority, skills, and capacity
- Track humanity metrics (trust, clarity, equity, well-being, accessibility) next to cost and performance
- Be willing to say **Pause** when the cost to human dignity is too high

---

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

---

*Developed under the leadership of Dr. Itamar Shabtai, Director of the AI for Humanity Lab, Claremont Graduate University. Currently executed by AI for Humanity Lab Fellows Mahesh Balan, Aashish Sunar, and Gauri Parnaik.*
