# Contract Edge — Demo Build Specification

> This file is the source of truth for all changes being made to the POC.
> Every decision recorded here was agreed during the product grilling session on 2026-05-19.
> Update this file whenever a decision changes or a new one is made.

---

## Product Identity

| Item | Old | New |
|------|-----|-----|
| System name | CLM System | **Contract Edge** |
| AI assistant name | AI Voice Assistant | **Smart Contract Assistant** |
| Sub-brand line | NZ Private Health Insurer | NZ Private Health Insurer (keep) |

---

## Demo Format

- **Type:** Guided walkthrough — presenter-led, single operator, no live sandbox
- **Data:** Rich seeded data (no backend, no database) — all data lives in `app.js`
- **Architecture note:** Data layer must be isolated so a real backend can be swapped in later without restructuring the UI

---

## Demo Flow — 8 Steps

The demo tells a single end-to-end story. A provider enters as a Lead and ends as a contracted provider with KPIs on the dashboard.

| Step | Screen | What to show |
|------|--------|--------------|
| 1 | Provider Registry (Active Network) | The active contracted provider network — HPI-validated, tiered, filterable |
| 2 | Provider Profile | Rich profile: contacts, compliance checklist, activity log, financial summary |
| 3 | Network Pipeline (Kanban) | A provider moving through Lead → Under Review → Negotiating → Contracting |
| 4 | Contact Track | Multiple contacts on a single provider, each with role, email, phone |
| 5 | Clause Selection | Selecting a clause from the library and inserting it into a contract in the editor |
| 6 | Pricing Configuration | Interactive CPT/ICD pricing screen — set rate, choose model, see output |
| 7 | Approval Workflow | Submit a contract for approval, show the approval chain, approve it |
| 8 | Contract Lifecycle Dashboard | KPIs: active contracts, spend, expiries, pipeline — the full picture |

> **Confirmed:** All 8 steps follow a **single provider** end-to-end. The hero provider starts as a Lead on the Kanban and ends with a signed contract visible on the dashboard. One story, one thread. Hero provider: **Auckland Surgical Centre** (HPI: G00001-K).

---

## Screen-by-Screen Changes

### 1. Sidebar / Navigation

**Changes:**
- Rename "CLM System" → **Contract Edge**
- Rename "AI Voice Assistant" → **Contra Smart Contract Assistant**
- Move **Template Repository** out of main nav → into **Admin**
- Remove Template Repository from the Network nav group

**Nav structure after changes:**
```
Core
  Dashboard
  Smart Contract Assistant               [AI badge]

Network
  Provider Network

Contract Management
  Contract Registry
  Clause Library
  Negotiation Tracker

Workflow
  Approvals                             [pending badge]

Settings
  Integrations
  Admin
    └── Template Repository             [moved here]
    └── Contract Manager Permissions
    └── Rules & Role Permissions
    └── System Settings
```

---

### 2. Network Screen — Full Redesign

**Current state:** List view (left) + detail panel (right), 3 status filters  
**New state:** Kanban board + full-page provider profile on card click

**Pipeline columns:**
```
Lead  |  Under Review  |  Negotiating  |  Contracting
```

**Rules:**
- Contracted providers do **not** appear on this Kanban — they graduate to the Provider Registry
- Each column shows provider cards: name, city, specialty, tier badge, relationship owner
- Clicking a card navigates to the full-page **Provider Profile** (not a side panel)
- A "+ Add Provider" button appears at the top — validates against NZ HPI (seeded simulation)

**Data change required:**
- Current statuses: `lead`, `in-negotiation`, `contracted`
- New statuses: `lead`, `under-review`, `negotiating`, `contracting`, `contracted`
- Add `under-review` stage to PROVIDERS data
- `contracted` providers appear only in Provider Registry, not Kanban

---

### 3. Provider Profile — New Full-Page Screen

Triggered by clicking any Kanban card. Replaces the old right-side detail panel.

**Layout:** Two-column. Left = profile detail. Right = activity log.

**Left column sections:**

#### Provider Header
- Provider name, type, city, specialty
- Tier badge (Preferred / Standard / Platinum)
- Pipeline stage badge (Lead / Under Review / Negotiating / Contracting)
- HPI Org ID, Facility Code, NZBN, HPI Status

#### Contacts (multiple)
- Table: Name | Role | Email | Phone | Primary contact flag
- "+ Add Contact" button
- Each contact is a row — not a single block as currently shown

#### Compliance & Documents
- Provider-level checklist (not per-contact)
- Table: Document Name | Required | Status (Received / Outstanding / Expired) | Expiry Date
- Example documents:
  - Indemnity Insurance Certificate
  - Facility Accreditation (HDSS)
  - MedSafe Compliance Certificate
  - ACC Provider Registration
  - IRD Registration (NZBN verified)
  - Privacy Act 2020 Acknowledgement
  - Health & Safety Policy
- Visual indicator: green tick = received, amber = expiring, red = outstanding

#### Financial Summary
- YTD Spend, Annual Projected, YTD Procedures
- Network tier multiplier in effect

#### Contracts
- List of contracts linked to this provider
- Status pill per contract (Draft / Negotiation / Active / Expiring)
- "View Contract" button per row
- "Create New Contract" button — **disabled and greyed out until provider status = `contracted`**
  - Tooltip on hover: "Contract creation available after provider onboarding is complete"

**Right column — Activity Log:**
- Chronological feed of interactions
- Entry types: Call, Email, Meeting, Note, System (e.g. "Contract submitted for approval")
- Each entry: icon, date, user, short description
- "Log Activity" button at top — opens a modal (Call / Email / Meeting / Note)
- "Outlook Connected" badge — clicking "Send Email" opens a pre-filled `mailto:` compose window
- Seeded with 5–8 realistic historical entries per provider

**Back navigation:** Back button returns to the Kanban pipeline

---

### 4. Contract Types

Four curated types, each backed by rich, realistic NZ-specific contract content:

| Type | Use case | Key sections |
|------|----------|--------------|
| **Master Service Agreement (MSA)** | Overarching legal framework between insurer and provider group | Parties, Definitions, Scope of Services, Term, Obligations, Compliance (Privacy Act 2020, FHIR R4), Dispute Resolution, Governing Law (NZ) |
| **Individual Pricing Contract** | Procedure-specific pricing for a single provider | Service Schedule, CPT/ICD Codes, Base Rates, Pricing Model, Volume Caps, Adjustment Mechanisms |
| **Surgical Elective Contract** | Elective surgical procedures (knee, hip, etc.) | Procedure List, NZACS codes, ACC codes, Tiered Rate Schedule, Theatre Access Terms, Quality KPIs |
| **Government Contract** | MOH or ACC-funded services | Regulatory Framework, Funding Schedule, Reporting Obligations, Audit Rights, DHB alignment |

**Contract creation rule:** "Create New Contract" button is disabled on provider profile until provider status = `contracted` (i.e. fully onboarded).

**Contract status flow:** Draft → Negotiation → Contracting → Active → Expiring → Expired

---

### 5. Contract Editor — New Feature

Accessible from Contract Registry → open a contract → "Edit Contract" button.

**Layout:** Two-panel. Left = editor canvas. Right = contract context panel.

**Editor features:**
- Rich text editing (bold, italic, headings, lists, tables)
- **Insert Clause** button — opens clause library browser, inserts selected clause at cursor
- **Insert Price Table** button — inserts a formatted CPT/ICD pricing table
- **AI Assist** button — suggests clause improvements, flags missing sections
- **Global Find & Replace** — find a term across the whole document and replace
- **"Invite to Collaborate"** button — opens a pre-filled `mailto:` window with contract name, link, and message. (Real-time co-editing is Phase 2.)

**Right context panel shows:**
- Contract type, provider name, effective date, expiry
- Current status pill
- Linked clause list (clauses already inserted)
- Approval status

**View vs Edit:**
- Contracts default to **View mode** — rendered document, no editing
- "Edit Contract" button switches to Edit mode (the editor above)
- "Download" button available in both modes

---

### 6. Pricing Configuration — New Feature

Accessible from within a contract (pricing section) or from the contract creation flow.

**Screen features:**
- Select procedure by CPT or ICD code (searchable dropdown, pre-loaded with NZ-relevant codes)
- Set base rate (NZD)
- Choose pricing model: FFS / Tiered / Matrix / Staircase
- For Tiered: input volume bands and rates per band
- Live calculation preview — shows what a provider would be paid at 50 / 100 / 150 procedures
- Network tier multiplier applied automatically (Preferred 1.0x, Platinum 1.2x, etc.)
- **"Import from Excel"** button — greyed out, labelled "Phase 2 — Excel upload coming"

---

### 7. Admin — Reorganised

**New Admin sections:**
- **Template Repository** (moved from main nav)
- **Contract Manager Permissions** — assign contract managers to providers/contracts
- **Rules & Role Permissions** — define who can approve, edit, create contracts by role
- **Integrations** (Outlook, FHIR, future CRM)
- **System Settings** — audit log config, data retention, notification rules

---

### 8. UI Fixes

| Issue | Fix |
|-------|-----|
| Back navigation broken on some screens | Add consistent back button wired to previous screen state across all detail views |
| Headings (HPI codes, section labels) not bold enough | Increase font-weight on all `detail-label` and section heading elements |
| Draft contract buttons not linked | Wire to contract creation flow (or disable with tooltip if provider not yet onboarded) |
| Export redlining not working | Fix export function — export current contract state with tracked changes markup |
| Template Repository in main nav | Move to Admin (see above) |

---

## Outlook Integration (Simulated)

- **"Outlook Connected"** badge shown in provider profile activity log header
- Clicking **"Send Email"** from activity log opens `mailto:` with pre-filled subject and body
- Clicking **"Invite to Collaborate"** from contract editor opens `mailto:` with contract name and invite message
- Activity log seeded with realistic email history entries (shown as "Email" type with Outlook icon)
- No OAuth, no live Microsoft Graph API calls — Phase 2

---

## Data Requirements (Seeded)

All data lives in `app.js`. The following need to be added or updated:

- **PROVIDERS:** Add `under-review` stage providers. Add `contacts` array (multiple contacts per provider). Add `complianceDocs` array. Add `activityLog` array.
- **CONTRACTS:** Enrich contract content — real NZ legal text, real procedure codes, real pricing structures. Add `contractType` field mapped to the 4 types above.
- **PRICING:** Add `PRICING_SCHEDULES` dataset — CPT/ICD codes with NZ procedure names and suggested base rates.
- **ACTIVITY_LOG:** Seeded per provider — 5–8 entries mixing calls, emails, meetings, system events.

---

## What Is Explicitly Out of Scope (Phase 2+)

| Feature | Phase |
|---------|-------|
| Real-time collaborative editing (second cursor, live sync) | Phase 2 |
| Excel upload for pricing import | Phase 2 |
| Real Outlook OAuth / Microsoft Graph integration | Phase 2 |
| Per-contact compliance document tracking | Phase 2 |
| Live backend / database | Phase 2 |
| Value-Based Contracting | Phase 4 |
| HL7/EDI adaptors | Phase 2 |
| OceanInsights deep analytics | Phase 2 |
