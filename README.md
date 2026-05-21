# Contract Edge — Provider CLM Platform

**Contract Edge** is a Provider Contract Lifecycle Management (CLM) system built for a New Zealand private health insurer. It replaces emails and spreadsheets with a single platform that manages healthcare provider contracts from creation through expiry — authoring, approvals, negotiation, signing, live monitoring, renewals, amendments, and termination.

> This repository contains the Phase 1 proof-of-concept (POC) demo and supporting modules. The full business context, regulatory requirements, and system design decisions are documented in [`clm-context.md`](clm-context.md).

---

## What's in This Repo

```
├── POC/                    # Frontend demo — the main deliverable
│   ├── index.html          # App shell and screen structure
│   ├── app.js              # All data, screen renderers, and logic
│   ├── style.css           # All styles
│   ├── DEMO_SPEC.md        # Full product specification (source of truth)
│   └── HANDOFF.md          # Session handoff notes and build log
│
├── rules-engine/           # Python pricing rules engine (Phase 1 prototype)
│   ├── engine.py           # Core rule evaluation logic
│   ├── models.py           # Data models
│   ├── main.py             # Entry point / API
│   └── requirements.txt
│
├── clm-demo/               # AI service powering the Smart Contract Assistant
│   └── ai-service/
│       ├── agent.py        # Claude-powered contract assistant
│       ├── livekit_agent.py # Voice interface via LiveKit
│       ├── tools.py        # Tool definitions for the AI agent
│       └── requirements.txt
│
├── clm-context.md          # Full business context, regulatory requirements, OI log
├── control-room/           # Architecture decisions and technical direction log
└── ai-tool-registry.md     # Registry of all AI tools and integrations used
```

---

## The Demo (POC)

The POC is a **frontend-only demo** — no backend, no database. All data is seeded in `app.js` so the demo runs entirely in a browser.

### Running the Demo

No installation required. Open `POC/index.html` directly in any modern browser.

```bash
open POC/index.html
```

The demo tells a single end-to-end story: **Auckland Surgical Centre** (HPI: G00001-K) enters as a Lead and ends as a contracted provider with live KPIs on the dashboard.

### 8-Step Demo Flow

| Step | Screen | What it shows |
|------|--------|---------------|
| 1 | Provider Registry | Active contracted network — HPI-validated, tiered, filterable |
| 2 | Provider Profile | Contacts, compliance checklist, financial summary, activity log |
| 3 | Network Pipeline (Kanban) | Provider moving Lead → Under Review → Negotiating → Contracting |
| 4 | Contact Track | Multiple contacts per provider with role, email, and phone |
| 5 | Clause Selection | Pick a clause from the library and insert it into a contract |
| 6 | Pricing Configuration | CPT/ICD pricing — set rate, choose model, see live output |
| 7 | Approval Workflow | Submit a contract for approval, approve it through the chain |
| 8 | Contract Lifecycle Dashboard | KPIs: active contracts, spend, expiries, pipeline |

---

## Rules Engine

A Python prototype for evaluating provider pricing rules against contract parameters.

### Setup

```bash
cd rules-engine
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

---

## AI Service (Smart Contract Assistant)

A Claude-powered AI assistant that answers contract questions, helps draft clauses, and supports pricing decisions. Includes an optional LiveKit voice interface.

### Setup

```bash
cd clm-demo/ai-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Copy the environment template and fill in your API keys:

```bash
cp .env.example .env
# Edit .env with your Anthropic API key and LiveKit credentials
```

Start the service:

```bash
python main.py
```

> The Smart Contract Assistant text chat works without LiveKit. The voice interface requires LiveKit credentials — see `.env.example` for the required variables.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend demo | Vanilla HTML / CSS / JavaScript (no framework) |
| AI assistant | Claude (Anthropic) via Python SDK |
| Voice interface | LiveKit Agents |
| Rules engine | Python + FastAPI |
| Data residency | AWS Sydney / Azure Australia East (NZ requirement) |

---

## Key Design Decisions

- **No backend in Phase 1** — all demo data lives in `app.js`. The data layer is isolated so a real backend can be swapped in without restructuring the UI.
- **Single-thread demo narrative** — one provider, one story, start to finish.
- **Immutable audit trail** — every action logged; architecture designed for 7-year retention (CoFI Act compliance).
- **FHIR R4 NZ Base IG** — provider registry uses HPI identifiers aligned to the national standard.

Full decision log: [`control-room/decisions.md`](control-room/decisions.md)

---

## Regulatory Context

The system is designed to comply with:
- **CoFI Act** (Conduct of Financial Institutions) — in force March 2025
- **Contracts of Insurance Act 2024** — in force November 2027
- **NZ Privacy Act 2020** + Health Information Privacy Code
- **WCAG 2.1 AA** accessibility standard

See [`clm-context.md`](clm-context.md) for the full regulatory and business context.

---

## Partners

| Organisation | Role |
|---|---|
| **IQVIA** | Platform and analytics |
| **Damco** | Delivery — integrations, middleware, FHIR/API layer |
| **Achieva** | Technology — Insura CRM core product |
| **End Client** | NZ private health insurer (~940,000 insured members) |
