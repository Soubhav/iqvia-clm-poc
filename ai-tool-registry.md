# AI Tool Registry — CLM Rules Engine

> **Purpose:** This file is the complete inventory of every tool and external integration the AI layer calls at runtime. The AI never generates contract data, rates, provider information, or compliance decisions from its own knowledge. Every piece of structured data in an AI response came from one of these tool calls. This is the architectural guarantee against hallucination.

---

## How This Works

When a contract manager types a natural language instruction, the AI does the following:

1. Interprets the intent
2. Identifies which tools to call and in what order
3. Calls each tool — receiving real, structured data back
4. Assembles the response using only that data
5. Presents a structured preview for human confirmation
6. On confirmation, commits via `create_contract` and triggers the approval workflow

The AI contributes: language understanding, instruction parsing, response presentation.
The tools contribute: every fact, number, name, rate, and compliance check.

---

## Tool Inventory

### Tool 1 — `evaluate_pricing`
**Status:** Built (Python FastAPI — `/rules-engine`)

| Field | Detail |
|---|---|
| **What it does** | Given a provider, procedure, year-to-date volume, and claim modifiers — returns the correct contracted rate |
| **Connects to** | Rules Engine (local service, `POST /evaluate`) |
| **AI sends** | `procedure_code`, `provider_id`, `ytd_volume`, `modifiers` |
| **Returns** | `base_rate`, `final_rate`, `pricing_model`, `multipliers_applied`, `rule_trace` |
| **Why it matters** | AI never calculates or guesses rates. Every price in an AI response was returned by this tool. The `rule_trace` shows exactly which rules fired — auditable at every step. |
| **POC status** | Live. 4 contracts loaded. Tiered + FFS + Multipliers working. |

---

### Tool 2 — `lookup_contract`
**Status:** To build (POC: in-memory store from `rules.json`)

| Field | Detail |
|---|---|
| **What it does** | Retrieves full contract terms for a given provider, contract ID, or procedure code |
| **Connects to** | CLM Contract Repository (Insura CRM database in production; JSON store in POC) |
| **AI sends** | `provider_id` OR `contract_id` OR `procedure_code` (any combination) |
| **Returns** | Full contract object: terms, rate schedule, volume caps, PA rules, expiry date, status |
| **Why it matters** | When a manager says "same structure as Auckland Surgical's knee contract" — the AI calls this tool to fetch the actual terms. It does not recall them from training data. |
| **POC status** | Mock — returns from `rules.json`. Production would query Insura CRM via REST API. |

---

### Tool 3 — `validate_provider`
**Status:** To build (POC: mock response simulating HPI API)

| Field | Detail |
|---|---|
| **What it does** | Validates a healthcare provider against the NZ Health Provider Index — confirms identity, current registration status, and qualifications |
| **Connects to** | **NZ HPI FHIR R4 API** — operated by Te Whatu Ora (Health New Zealand). Endpoint: `GET /Practitioner/{hpi-person-id}`, `GET /Organization/{hpi-org-id}` |
| **AI sends** | `provider_id` (HPI CPN for individuals, HPI-Org-ID for organisations) |
| **Returns** | `registered: true/false`, `registration_status`, `specialty_codes`, `registration_expiry`, `disciplinary_flags` |
| **Why it matters** | The insurer cannot contract with an unregistered or struck-off provider. This call happens at contract creation and periodically during active contracts. The AI cannot assume a provider is valid — it must confirm. CoFI requirement. |
| **POC status** | Mocked. Returns a realistic HPI-shaped response for demo providers. Production requires Te Whatu Ora API credentials and OAuth 2.0 token. |
| **Standard** | FHIR R4 NZ Base Implementation Guide |

---

### Tool 4 — `get_approval_route`
**Status:** To build (POC: rule-based router)

| Field | Detail |
|---|---|
| **What it does** | Given contract value and type, returns the required approval chain before the contract can be executed |
| **Connects to** | Approval Workflow Engine (configured rules within Insura CRM; rule-based logic in POC) |
| **AI sends** | `estimated_annual_value`, `contract_type`, `introduces_new_pa_rules: bool`, `new_provider_type: bool` |
| **Returns** | Ordered list of approvers: `[{role: "Contracting Manager", required: true}, {role: "CFO", required: true}, ...]` |
| **Why it matters** | The AI cannot decide who needs to approve a contract. This is determined by configured business rules. A $600K contract must go to the CFO — the AI surfaces this automatically rather than leaving it to the manager to remember. |
| **Routing rules (from BRD)** | Under $500K → Contracting Manager only. Over $500K → + CFO. New PA rules → + Medical Director. New provider type → + Legal. |
| **POC status** | Rule-based logic. Production would query the workflow engine configuration. |

---

### Tool 5 — `draft_contract`
**Status:** To build (POC: template assembly)

| Field | Detail |
|---|---|
| **What it does** | Assembles a complete, formatted contract document from confirmed terms |
| **Connects to** | Contract Template Engine (approved templates stored in Insura CRM; static templates in POC) |
| **AI sends** | All confirmed contract terms: `provider_id`, `procedure_codes`, `pricing_model`, `rate_schedule`, `volume_caps`, `pa_rules`, `start_date`, `end_date`, `template_type` |
| **Returns** | Structured contract document (JSON for preview, PDF-ready for signature) |
| **Why it matters** | The AI does not write legal clauses. It fills a pre-approved template with confirmed data. The template contains the legally-reviewed standard language. The AI only contributes the variable terms the manager specified. |
| **POC status** | Simple template assembly. Production would use approved Insura CRM templates. |

---

### Tool 6 — `create_contract`
**Status:** To build (POC: writes to local JSON store)

| Field | Detail |
|---|---|
| **What it does** | Saves the confirmed contract, writes the audit log entry, and triggers the approval workflow |
| **Connects to** | CLM Contract Repository + Audit Log + Approval Workflow Engine |
| **AI sends** | Confirmed contract object + `confirmed_by` (user identity) + `conversation_summary` (the natural language instruction that initiated this) |
| **Returns** | `contract_id`, `audit_entry_id`, `approval_workflow_id`, `next_approver` |
| **Why it matters** | The commit step. Nothing is saved until the human explicitly confirms. The audit log entry records: the natural language instruction, the AI's interpretation, the structured terms generated, and the human's confirmation — all as a single immutable record. |
| **POC status** | Writes to local JSON. Production would commit to Insura CRM via REST API. |

---

### Tool 7 — `check_utilization`
**Status:** To build (POC: computed from mock claims data)

| Field | Detail |
|---|---|
| **What it does** | Returns year-to-date procedure volume for a given provider and procedure code |
| **Connects to** | IQVIA TMB (claims platform) — the source of actual utilization data |
| **AI sends** | `provider_id`, `procedure_code`, `contract_year` |
| **Returns** | `ytd_volume`, `annual_cap`, `pct_utilised`, `cap_alert_threshold_reached: bool` |
| **Why it matters** | When evaluating pricing (tiered model), the AI needs the real YTD volume — not an estimate. Also surfaces alerts: "This provider has used 87% of their annual cap for this procedure." |
| **POC status** | Mocked from synthetic claims data. Production connects to IQVIA TMB via REST API. |

---

### Tool 8 — `get_pa_rules`
**Status:** To build (POC: loaded from rules.json)

| Field | Detail |
|---|---|
| **What it does** | Returns the prior approval requirements for a given procedure code under a specific contract |
| **Connects to** | CLM PA Rules Store (part of contract terms in Insura CRM) |
| **AI sends** | `procedure_code`, `contract_id` |
| **Returns** | `pa_required: bool`, `pa_conditions` (e.g. "required if patient age > 65"), `retrospective_review_only: bool` |
| **Why it matters** | When drafting a contract, the AI must surface what PA rules apply to each procedure. When a claim comes in, the system checks this before processing. The AI does not decide PA requirements — it reads the rules from the contract. |
| **POC status** | Rule-based from sample data. |

---

## External System Integrations

These are the upstream systems that the tools above connect to in production.

| System | What It Is | How We Connect | Data We Get | POC Approach |
|---|---|---|---|---|
| **NZ HPI** | Health Provider Index — national registry of all licensed NZ providers. Operated by Te Whatu Ora. | FHIR R4 API (`GET /Practitioner`, `GET /Organization`, `GET /Location`) | Provider identity, registration status, specialty, disciplinary flags | Mock FHIR R4 response with realistic shape |
| **NZ NHI** | National Health Index — unique identifier for every NZ patient/member | FHIR R4 API (`GET /Patient/{nhi-id}`) | Member identity validation (used in PA requests) | Mock response |
| **IQVIA TMB** | Transaction Management & Billing — IQVIA's claims processing platform | REST API (bi-directional) | Inbound: actual utilization and claims data. Outbound: contracted rates and PA rules pushed on contract execution | Mock utilization data |
| **Insura CRM (Achieva)** | Core CLM platform — contracts, workflows, provider master, audit log | REST API | Contract repository, approval workflow state, provider master data | Local JSON store |
| **DocuSign** | Digital contract signing | DocuSign REST API v2.1 | Envelope status, signed document PDF, timestamp | Not included in POC (noted as future step) |
| **OceanInsights (IQVIA)** | Analytics platform — financial exposure, utilization trends, IFRS 17 | REST API / data feed | Financial exposure reports, benchmark data | Not included in POC |

---

## Why Salesforce Cannot Replicate This

A standard Salesforce implementation can add AI features (Einstein GPT). What it cannot do natively:

1. **FHIR R4 tool calls** — Salesforce has no native FHIR R4 client. Connecting to the NZ HPI requires a custom Apex integration or middleware layer. We build this natively.
2. **Grounded pricing evaluation** — The tiered/matrix/staircase pricing logic lives in our Rules Engine. Salesforce would require custom Apex code for every pricing model, deployed by a developer. Our Rules Engine is configured by a business user.
3. **Real-time utilization from IQVIA TMB** — Salesforce does not know what IQVIA TMB is. This integration is custom regardless of platform — but we design the AI around it from day one rather than bolting it on later.
4. **Immutable audit trail for CoFI** — Salesforce audit logging is configurable and can be modified by admins. Our audit trail is append-only by design, built to the CoFI standard from the start.
5. **Tool-calling AI that shows its reasoning** — Einstein GPT generates responses. Our AI calls structured tools and returns a `rule_trace` showing every data source it used. Every number is traceable to a tool call. That is a fundamentally different and more defensible architecture for a regulated financial system.

---

*Part of the CLM AI-Native PoC — Damco / WeAreHashira. Last updated: May 2026.*
