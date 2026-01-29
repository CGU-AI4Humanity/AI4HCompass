# AI for Humanity Compass

A web application implementing Dr. Itamar Shabtai's "AI for Humanity Compass" tool - a decision framework for assessing AI projects against 8 dimensions of human dignity, safety, and well-being.

## Overview

The AI for Humanity Compass helps teams evaluate AI initiatives by answering essential questions across 8 compass dimensions:

1. **N - Purpose**: The human need being served
2. **NE - People**: Who benefits and who could be harmed
3. **E - Values**: Human values built into the design
4. **SE - Risks**: What can go wrong and prevention measures
5. **S - Human-in-the-Loop**: Where humans stay in control
6. **SW - Data & Privacy**: Data boundaries, consent, and access
7. **W - Outcomes**: Positive impact to be delivered
8. **NW - Metrics of Humanity**: Tracking trust, dignity, and fairness

## Tech Stack

- **Frontend**: React with TypeScript, Vite, TailwindCSS
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Email OTP + Passkey (WebAuthn)
- **Styling**: Bauhaus design with CGU branding colors

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── styles/        # CSS and Tailwind styles
│   │   └── App.tsx        # Main app component
│   └── index.html
├── server/                 # Express backend
│   └── src/
│       ├── db/            # Database schema and initialization
│       ├── routes/        # API routes
│       └── index.ts       # Server entry point
├── shared/                 # Shared types and constants
│   └── types.ts
└── package.json
```

## Key Features

1. **Email OTP Authentication**: Users register/login with email and one-time password
2. **Passkey Support**: Optional WebAuthn passkeys for passwordless login
3. **Project Management**: Create and manage AI assessment projects
4. **8-Dimension Assessment**: Each compass direction has its own tab
5. **Issue Tracking**: Add issues/goals to each dimension with scores
6. **Traffic Light System**: Green (70+), Yellow (40-69), Red (<40) indicators
7. **Mitigations**: Add mitigation plans for yellow/red issues
8. **GO/NO-GO Decision**: Automatic project decision calculation

## Database Schema

- **users**: User accounts with email
- **otp_codes**: Email verification codes
- **passkeys**: WebAuthn credentials
- **projects**: AI assessment projects
- **attributes**: 8 compass dimensions per project
- **issues**: Issues/goals per attribute
- **mitigations**: Action items for resolving issues

## CGU Branding Colors

- CGU Red: #8B1538
- CGU Maroon: #5C1128
- CGU Green: #8FA643
- Traffic Green: #22C55E
- Traffic Yellow: #EAB308
- Traffic Red: #EF4444

## Development

Start the development server:
```bash
npm run dev
```

This builds the frontend and starts the Express server on port 5000.

## Recent Changes

- 2026-01-29: Initial implementation with full feature set
  - Email OTP + Passkey authentication
  - Bauhaus styling with CGU branding
  - 8 compass dimension tabs
  - Issue/goal scoring with traffic lights
  - Mitigation system for yellow/red items
  - Summary tab with GO/NO-GO decision
  - Seeded AI Triage Agent example project

## Created By

Dr. Itamar Shabtai, Director of Center for Information Systems and Technology at Claremont Graduate University, as part of the AI for Humanity Lab at CGU.
