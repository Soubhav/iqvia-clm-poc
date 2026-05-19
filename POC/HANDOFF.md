# Contract Edge — Session Handoff

## What This Is
A frontend-only POC demo for a Fortune 500 NZ private health insurer client.
Three files: `POC/index.html`, `POC/app.js`, `POC/style.css`. No backend. No database.
All data is seeded in `app.js`. Full spec lives in `POC/DEMO_SPEC.md`.

---

## What Was Decided (Non-Negotiable)

| Decision | Answer |
|----------|--------|
| Demo format | Presenter-led guided walkthrough — Option A. Not a live sandbox. |
| Data strategy | Rich seeded data in app.js — no backend. Designed to swap in backend later. |
| Network view | Full Kanban board — 4 columns: Lead / Under Review / Negotiating / Contracting |
| Provider click | Full-page provider profile (not side panel) |
| Contracted providers | Graduate OUT of Kanban → into Provider Registry. Not shown on pipeline board. |
| Activity log | On provider profile page (right column) |
| Compliance checklist | Provider level only (not per-contact) for this demo |
| Contract editor | Single-user rich text editor + "Invite to Collaborate" button (mailto only) |
| Pricing screen | Interactive — CPT/ICD selector, model picker, live calc. Excel = Phase 2 button. |
| Contract types | 4 types with rich NZ legal content: MSA, Individual Pricing, Surgical Elective, Government |
| Outlook | Simulated — "Outlook Connected" badge, mailto compose. No OAuth. |
| Demo narrative | Single provider end-to-end. Hero provider: **Auckland Surgical Centre** (HPI: G00001-K) starts as a Lead and ends contracted on the dashboard. |

---

## Branding
- System name: **Contract Edge** (was "CLM System")
- AI assistant: **Smart Contract Assistant** (was "AI Voice Assistant")

---

## Demo Flow (8 Steps)
1. Provider Registry — active contracted network
2. Provider Profile — contacts, compliance checklist, activity log
3. Kanban Pipeline — Auckland Surgical Centre moving through Lead → Contracting
4. Contact Track — multiple contacts on the provider
5. Clause Selection — pick a clause from library, insert into contract
6. Pricing Configuration — CPT/ICD interactive pricing screen
7. Approval Workflow — submit and approve a contract
8. Contract Lifecycle Dashboard — KPIs showing the full story

---

## What Has Been Built (All Chunks 1–8 — DONE)
- "Contract Edge" branding everywhere (title, sidebar, greeting)
- "Smart Contract Assistant" in nav and opening message
- "Provider Network" nav label (was "Network List")
- Template Repository removed from main nav
- Back navigation: `previousScreen` + `goBack()` function in app.js
- `screen-provider-profile` div added to index.html + registered in screen renderers
- `renderProviderProfile()` placeholder function added — wired to `openProviderProfile(id)`
- Admin screen fully reorganised: Rules & Role Permissions / Contract Manager Assignments / Template Repository (with "Open" button) / Users / System Settings / CoFI Compliance
- Outlook added to INTEGRATIONS data as "Connected"
- API URL updated to `contractedge.healthinsurer.co.nz`
- Headings bolder: `screen-title`, `detail-label`, `section-card-title` all font-weight 700

**Chunk 2 — Data Layer:**
- All 6 PROVIDERS upgraded: `contacts[]`, `complianceDocs[]`, `activityLog[]` arrays added to every provider
- Pipeline statuses updated: lead (PRV-001 hero), under-review (PRV-006), negotiating (PRV-003), contracting (PRV-005), contracted (PRV-002, PRV-004)
- `"in-negotiation"` status retired — split into `"negotiating"` and `"contracting"`
- `PRICING_SCHEDULES` dataset added (22 codes: NZACS + CPT, 6 categories)

**Chunks 3–8 — All Built:**
- Chunk 3: 4-column Kanban (Lead / Under Review / Negotiating / Contracting) — contracted providers in Provider Registry only
- Chunk 4: Full provider profile — 2-col layout, contacts table, compliance docs, financial summary, activity log, Outlook badge, Log Activity modal
- Chunk 5: Contract types + rich NZ legal content — MSA, surgical-elective, individual-pricing, government; view/edit mode split
- Chunk 6: Contract editor overlay — contenteditable canvas, toolbar, Insert Clause, Insert Price Table, AI Assist, Find & Replace, Invite to Collaborate, right context panel
- Chunk 7: Pricing Config screen — 22-code procedure selector, 4 pricing models (FFS/Tiered/Matrix/Staircase), live calculation preview, tier multiplier
- Chunk 8: Dashboard enriched with pipeline journey tracker + network overview; Export Redline PDF wired; back navigation verified across all screens

---

## What Still Needs to Be Built

Nothing — all 8 chunks are complete. The demo is ready for walkthrough.
- Stat summary row above Kanban (counts per stage)

### Chunk 4 — Provider Profile (full-page)
Replace `renderProviderProfile()` placeholder with the real screen.
Two-column layout. Left = detail. Right = activity log.

**Left column:**
- Header: name, type, city, specialty, tier badge, pipeline stage badge
- HPI Registration section (HPI Org ID, Facility Code, NZBN, HPI Status)
- Contacts table: Name / Role / Email / Phone / Primary flag. "+ Add Contact" button.
- Compliance & Documents table: Document / Required / Status / Expiry. Checkmarks for received.
- Financial Summary: YTD Spend, Annual Projected, YTD Procedures
- Contracts list with status pills + "View Contract" button per row
- "Create New Contract" button — DISABLED with tooltip if provider not `contracted`

**Right column:**
- "Outlook Connected" badge at top
- "Log Activity" button → modal (Call/Email/Meeting/Note)
- Chronological activity feed from `activityLog` — icon, date, user, description
- "Send Email" button → opens `mailto:` compose

### Chunk 5 — Contract Types & Rich Content
Add `contractSubType` field to each contract in CONTRACTS array.
4 types: `"msa"`, `"individual-pricing"`, `"surgical-elective"`, `"government"`

Each type needs a rich `fullText` field — actual NZ legal contract language:
- MSA: Parties, Definitions, Scope, Term, Obligations, Privacy Act 2020, FHIR R4, Dispute Resolution, Governing Law NZ
- Surgical Elective: Procedure List, NZACS codes, ACC codes, Tiered Rate Schedule, Theatre Access, Quality KPIs
- Individual Pricing: Service Schedule, CPT/ICD Codes, Base Rates, Pricing Model, Volume Caps
- Government: Regulatory Framework, MOH/ACC funding, Reporting Obligations, Audit Rights

Add contract view mode to `selectContract()`:
- Default = view mode (rendered document in the right panel)
- "Edit Contract" button switches to editor (Chunk 6)
- "View Contract" button on provider profile opens this view

Contract creation flow: type selection modal with the 4 types. Creation blocked (disabled button + tooltip) if provider not `contracted`.

### Chunk 6 — Contract Editor
New function `renderContractEditor(contractId)` — opens as a full-screen overlay or replaces right panel.
- Rich text editing area (contenteditable div styled as document)
- "Insert Clause" button → shows clause library picker → inserts at cursor
- "Insert Price Table" button → inserts formatted CPT/ICD table
- "AI Assist" button → shows a simulated suggestion panel
- "Find & Replace" button → simple modal input
- "Invite to Collaborate" button → `mailto:` with contract name pre-filled
- Right sidebar: contract context (type, provider, effective date, status, linked clauses)
- "Save" button, "Back to View" button

### Chunk 7 — Pricing Configuration
New screen `renderPricingConfig()` accessible from contract creation flow.
- Procedure search: dropdown of CPT/ICD codes from PRICING_SCHEDULES
- Base rate input (NZD)
- Pricing model selector: FFS / Tiered / Matrix / Staircase
- For Tiered: add/remove volume bands with rate per band
- Live preview table: "At 50 procedures: $X · At 100: $Y · At 150: $Z"
- Network tier multiplier applied automatically
- "Import from Excel" — greyed button labelled "Phase 2"
- "Save to Contract" button

### Chunk 8 — Polish & Demo Prep
- Dashboard KPIs: enrich with Auckland Surgical Centre in the pipeline view, showing progression
- Fix Export Redline PDF button in Negotiation screen (currently does nothing)
- Wire all "Draft Contract in AI Studio" buttons to contract creation flow instead
- Full demo walkthrough test — click through all 8 steps, verify nothing breaks
- Ensure back navigation works on every screen that has it

---

## Current File Structure
```
POC/
  index.html      — HTML shell, sidebar nav, screen divs
  app.js          — All data + all screen renderers + all logic (~1500 lines)
  style.css       — All styles (~1100 lines)
  DEMO_SPEC.md    — Full product spec (source of truth)
  HANDOFF.md      — This file
```

## Key Functions in app.js
- `showScreen(name)` — switches screens, tracks `previousScreen`
- `goBack()` — returns to previousScreen
- `openProviderProfile(id)` — sets selectedProviderId and navigates to provider-profile screen
- `renderNetworkList()` — current list view (to be replaced in Chunk 3)
- `renderProviderProfile()` — placeholder (to be built in Chunk 4)
- `renderAdmin()` — fully reorganised in Chunk 1
- `renderContracts()` / `selectContract()` — contract registry + detail panel
- `renderClauseLibrary()` / `toggleClause()` — clause browser
- `renderApprovals()` — approval queue with accept/reject

## Key Data Arrays in app.js
- `PROVIDERS` — 6 providers (needs Chunk 2 upgrade)
- `CONTRACTS` — 8 contracts
- `APPROVALS` — 2 pending approvals
- `CLAUSES` — 8 pre-approved legal clauses
- `TEMPLATES` — 6 contract templates
- `INTEGRATIONS` — 5 integrations including Outlook (added Chunk 1)
- `NEGOTIATIONS` — 2 active negotiations
- `USERS` — 5 internal users
- `ROLES` — 4 roles with permissions
