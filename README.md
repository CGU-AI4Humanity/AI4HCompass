# AI for Humanity Compass

A decision-making tool for assessing AI projects against 8 dimensions of human dignity, safety, and well-being.

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

## Table of Contents

1. [Key Messages from the Compass Guide](#key-messages-from-the-compass-guide)
2. [Prerequisites](#prerequisites)
3. [Local Setup](#local-setup)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Running the App](#running-the-app)
7. [Project Structure](#project-structure)
8. [Moving to GitHub](#moving-to-github)

---

## Prerequisites

Make sure you have the following installed on your laptop:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v20 or higher | https://nodejs.org |
| npm | v10 or higher | Included with Node.js |
| PostgreSQL | v15 or higher | https://www.postgresql.org/download/ |
| Git | Any recent version | https://git-scm.com |

To verify your installations, run:

```bash
node --version
npm --version
psql --version
git --version
```

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/ai-humanity-compass.git
cd ai-humanity-compass
```

### 2. Install dependencies

```bash
npm install
```

---

## Environment Variables

Create a `.env` file in the root of the project:

```bash
touch .env
```

Add the following variables to `.env`:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:5432/ai_humanity_compass

# Session secret — use any long random string (e.g. run: openssl rand -hex 32)
SESSION_SECRET=your_super_secret_session_key_here

# Email settings for OTP login (use Gmail or any SMTP provider)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=your_app_password_here
EMAIL_FROM=your.email@gmail.com

# App URL (used for WebAuthn/Passkeys)
APP_URL=http://localhost:5000

# Set to "development" for local; shows OTP codes in server logs
NODE_ENV=development
```

> **Gmail tip:** For `EMAIL_PASS`, use a Google App Password (not your regular Gmail password).  
> Generate one at: https://myaccount.google.com/apppasswords

> **Development tip:** In `NODE_ENV=development`, the OTP code is printed directly in the server terminal so you can log in without email setup.

---

## Database Setup

### 1. Start PostgreSQL

**macOS (Homebrew):**
```bash
brew services start postgresql@15
```

**Windows:** PostgreSQL runs as a service automatically after installation. Open pgAdmin or use the SQL Shell.

**Linux:**
```bash
sudo systemctl start postgresql
```

### 2. Create the database and user

Open a PostgreSQL shell:

```bash
psql postgres
```

Then run these SQL commands:

```sql
-- Create a database user
CREATE USER compass_user WITH PASSWORD 'your_password_here';

-- Create the database
CREATE DATABASE ai_humanity_compass OWNER compass_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ai_humanity_compass TO compass_user;

-- Exit
\q
```

Update your `.env` file `DATABASE_URL` to match the user and password you just created:

```
DATABASE_URL=postgresql://compass_user:your_password_here@localhost:5432/ai_humanity_compass
```

### 3. Push the database schema

This creates all the tables automatically using Drizzle ORM:

```bash
npm run db:push
```

You should see output confirming each table was created (users, projects, attributes, issues, mitigations, sessions, etc.).

---

## Running the App

### Development mode (with live reload)

```bash
npm run dev
```

This will:
- Build the React frontend
- Start the Express server on **http://localhost:5000**
- Watch for server-side file changes and auto-restart

Open your browser and go to: **http://localhost:5000**

### Logging in locally

1. Enter any email address and click **Send OTP**
2. Look at your **terminal/server logs** — the OTP code will be printed there (in development mode)
3. Enter that code to log in

---

## Project Structure

```
ai-humanity-compass/
├── client/                     # React frontend (TypeScript + Vite)
│   ├── src/
│   │   ├── components/         # Reusable UI components (Header, Footer)
│   │   ├── pages/              # Page components
│   │   │   ├── Login.tsx       # Email OTP + Passkey authentication
│   │   │   ├── Dashboard.tsx   # Project list + About section
│   │   │   └── ProjectView.tsx # 8-dimension assessment interface
│   │   ├── styles/             # Tailwind CSS + custom styles
│   │   └── App.tsx             # Routing and auth state
│   └── index.html
│
├── server/                     # Express.js backend (TypeScript)
│   └── src/
│       ├── db/
│       │   ├── schema.ts       # Database table definitions (Drizzle ORM)
│       │   └── index.ts        # Database connection
│       ├── routes/
│       │   ├── auth.ts         # OTP + Passkey authentication routes
│       │   └── projects.ts     # Project CRUD + assessment API routes
│       └── index.ts            # Express server entry point
│
├── shared/                     # Types shared between client and server
│   └── types.ts
│
├── drizzle.config.ts           # Database ORM configuration
├── vite.config.ts              # Frontend build configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Scripts and dependencies
```

### Key Technologies

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Backend | Express.js, TypeScript, tsx |
| Database | PostgreSQL, Drizzle ORM |
| Auth | Email OTP, WebAuthn Passkeys |
| Sessions | connect-pg-simple (stored in PostgreSQL) |

---

## Moving to GitHub

Follow these steps to push this project to your GitHub account.

### Step 1 — Create a new repository on GitHub

1. Go to https://github.com/new
2. Name it `ai-humanity-compass` (or anything you prefer)
3. Set it to **Private** (recommended) or Public
4. **Do NOT** initialize with a README, .gitignore, or license (the project already has these)
5. Click **Create repository**

### Step 2 — Download the code from Replit

In Replit, click the **three dots (⋮)** menu in the Files panel and select **Download as ZIP**.  
Extract the ZIP on your laptop.

Alternatively, if you have Git access to Replit, you can clone directly:

```bash
git clone https://replit.com/@YOUR_REPLIT_USERNAME/ai-humanity-compass.git
cd ai-humanity-compass
```

### Step 3 — Connect to your GitHub repository

Inside the project folder on your laptop:

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Create the first commit
git commit -m "Initial commit: AI for Humanity Compass"

# Point to your GitHub repository (replace with your actual URL)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ai-humanity-compass.git

# Push to GitHub
git push -u origin main
```

> If prompted, sign in with your GitHub credentials or a Personal Access Token.  
> Create a token at: https://github.com/settings/tokens

### Step 4 — Invite collaborators

1. Go to your repository on GitHub
2. Click **Settings** → **Collaborators**
3. Click **Add people**
4. Enter each collaborator's GitHub username or email
5. They will receive an email invitation to accept

> GitHub allows unlimited collaborators on private repositories for free (on the Free plan as of 2024).

### Step 5 — Collaborators: clone and set up locally

Each collaborator should:

```bash
# Clone the repo
git clone https://github.com/YOUR_GITHUB_USERNAME/ai-humanity-compass.git
cd ai-humanity-compass

# Install dependencies
npm install

# Set up their own .env file (see Environment Variables section above)
# Set up their own local PostgreSQL database (see Database Setup section above)

# Push the schema to their database
npm run db:push

# Start the app
npm run dev
```

---

## Troubleshooting

**`DATABASE_URL` connection error:**  
Make sure PostgreSQL is running and the credentials in `.env` exactly match what you created.

**Port 5000 already in use:**  
Kill the process using that port:
```bash
# macOS/Linux
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

**OTP email not arriving:**  
In `NODE_ENV=development`, check your terminal — the OTP code is printed there. No email configuration needed for local development.

**`npm run db:push` fails:**  
Double-check your `DATABASE_URL` in `.env` and confirm the database was created with `psql -U compass_user -d ai_humanity_compass`.

---

*Developed under the leadership of Dr. Itamar Shabtai, Director of the AI for Humanity Lab, Claremont Graduate University. Currently executed by AI for Humanity Lab Fellows Mahesh Balan, Aashish Sunar, and Gauri Parnaik.*
