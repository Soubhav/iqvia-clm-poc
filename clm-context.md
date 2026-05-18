# CLM System — Complete Context & Control Room

> **Purpose:** This document is the single source of truth for the Provider Contract Lifecycle Management (CLM) system being built for a New Zealand private health insurer. It is written to give Claude Code (or any engineer/decision-maker) complete context of what we are building, why every piece exists, and how it all connects. No insurance or technical background is assumed.

---

## 0. Who Is Involved and Why

| Party | Role |
|---|---|
| **IQVIA** | Global healthcare tech company. Found this opportunity. Brought Damco/Achieva in. Their platform handles claims processing and analytics — CLM is the missing piece. |
| **Damco** | Delivery partner. Builds all integrations, middleware adaptors, and the FHIR/API layer. |
| **Achieva** | Technology partner. Provides **Insura CRM** — the core CLM product being configured and deployed. |
| **End Client** | A private health insurer in New Zealand (name TBC). Manages ~940,000 insured members per year. |
| **Healthcare Providers** | Hospitals, specialist clinics, surgeons, radiologists, physiotherapists — the organisations the insurer contracts with and pays. |

---

## 1. The Business Problem — From First Principles

### What the insurer actually does

The insurer collects monthly premiums from 940,000 members. When members need medical treatment — surgery, specialist consultations, scans, physio — the insurer pays the bill. The insurer doesn't own hospitals or employ doctors. Instead, they negotiate **contracts** with independent healthcare providers (hospitals, clinics, individual specialists).

A provider contract is a legal agreement that says:
> *"We (insurer) will send our members to you (provider). In return, you treat them at the rates we've negotiated, under the conditions we've set."*

The insurer may have contracts with hundreds of providers across New Zealand. Each contract is different — different prices per procedure, different conditions, different expiry dates, different rules about what needs special approval before treatment.

### The current state (the problem)

Today, every contract is managed through emails, Word documents, and spreadsheets. There is no single system. This means:

- Nobody has a real-time view of all active contracts
- Pricing errors happen because spreadsheets get out of sync with what's actually been agreed
- Contracts expire without anyone noticing
- There's no automated check between "what we agreed to pay" and "what claims are being submitted"
- There's no audit trail — if a regulator asks why a rate was changed, nobody can easily prove what happened
- Scaling to more providers or more complex pricing is practically impossible

### What we are building

A **Provider Contract Lifecycle Management (CLM) system** — a digital platform that manages everything about provider contracts from the moment one is first drafted through to when it eventually expires or is terminated. It replaces all the emails, spreadsheets, and shared drives with one authoritative system.

---

## 2. The Regulatory Environment — Constraints That Shape the Build

These are not optional. They define hard requirements the system must meet on Day 1.

### CoFI Act (Conduct of Financial Institutions) — IN FORCE March 2025

Requires health insurers to demonstrate fair conduct in all their operations, including how they contract with providers. In practice: **every decision, change, and approval in the system must be logged with full context** so the regulator (FMA) can review it on demand. The system must maintain an immutable audit trail — logs that can never be deleted or altered.

### Contracts of Insurance Act 2024 — In force by November 2027

New rules around contract transparency and claims payment timing. Provider contracts and the CLM governance layer must be demonstrably compliant with these obligations when the Act comes into full force.

### NZ Privacy Act 2020 + Health Information Privacy Code

All personal health data (member information, clinical records) must be:
- Protected with appropriate access controls (only authorised users can see specific data)
- Stored only in New Zealand or Australia (data cannot reside on servers in the US or Europe)
- Subject to a 7-year minimum retention policy for financial records
- Covered by breach notification capability

**Technical implication:** The system must run on AWS Sydney or Azure Australia East — not US or European cloud regions.

### FHIR R4 — NZ National Digital Health Standard

FHIR (Fast Healthcare Interoperability Resources, pronounced "fire") is the mandated standard for how health systems exchange data in New Zealand. Version R4 with the NZ Base Implementation Guide is the specific variant required. Any system connecting to national NZ health infrastructure must speak this standard. Think of it as the universal plug adapter for NZ health data.

**Technical implication:** The CLM must expose FHIR R4 API endpoints and integrate with the national HPI registry via its FHIR R4 API.

### HPI — Health Provider Index

New Zealand's national registry of every licensed healthcare provider. Every doctor gets a **CPN (Common Person Number)**. Every organisation gets an **HPI Organisation ID**. Every physical facility (hospital, clinic) gets an **HPI Facility ID**.

**Why it matters:** When the insurer creates a contract with a provider, the system must verify that provider exists in the HPI and has the correct registration and qualifications. This prevents the insurer from inadvertently contracting with or paying an unlicensed provider.

### IFRS 17 — Insurance Accounting Standard (Mandatory in NZ from 2023)

A new international accounting standard requiring insurance companies to report their contract liabilities in a specific structured format. The CLM must be able to export contract financial data in machine-readable formats on demand for actuarial and finance teams.

### RBNZ Solvency Requirements

The Reserve Bank of New Zealand requires insurers to hold enough capital to cover their potential liabilities. This means the insurer needs real-time visibility of their total financial exposure across all contracts. The CLM must provide structured financial data to support this calculation.

---

## 3. System Architecture — What Is Being Built and By Whom

The system is not a single monolithic application. It is a set of components that work together.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INSURER (INTERNAL USERS)                     │
│         Contract Managers │ Finance │ Medical │ Legal │ IT          │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│                    CORE CLM PLATFORM (Insura CRM — Achieva)         │
│  Contract authoring │ Workflow engine │ Provider master │ Audit log  │
│  Network management │ RBAC │ Repository │ Provider portal │ REST API │
└──────┬──────────────────────────────────────────────────────┬───────┘
       │                                                      │
┌──────▼──────────┐   ┌───────────────────┐   ┌─────────────▼───────┐
│  RULES ENGINE   │   │  OCEAN INSIGHTS    │   │  CLAIMS INTEGRATOR  │
│ (TBD — Drools / │   │  (IQVIA Analytics) │   │  (Damco — custom)   │
│  commercial /   │   │  Quality metrics   │   │  Bi-directional link │
│  custom build)  │   │  Financial reports │   │  to IQVIA TMB       │
│  Tiered/matrix/ │   │  Utilization trend │   │  (claims platform)  │
│  staircase/     │   │  IFRS 17 data      │   └─────────────────────┘
│  episode pricing│   └───────────────────┘
└─────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────────────┐
│                    NZ STANDARDS LAYER (Damco — custom build)        │
│   FHIR R4 / HPI Adaptor │ HL7 v2 Middleware │ EDI Adaptors          │
│   Connects to national NZ health infrastructure                      │
└──────────────────────────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────────────┐
│              EXTERNAL SYSTEMS                                        │
│   NZ HPI (Health Provider Index — national provider registry)        │
│   NZ NHI (National Health Index — national member/patient ID)        │
│   IQVIA TMB (Transaction Management & Billing — claims platform)     │
│   DocuSign (e-signature for digital contract execution)              │
│   Legacy hospital systems (HL7 v2 / EDI)                            │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | What It Does | Built/Provided By |
|---|---|---|
| **Insura CRM** | Core CLM — contracts, workflows, provider data, audit, portal, API | Achieva (product) |
| **Rules Engine** | Executes complex pricing logic — tiered, matrix, staircase, episodes, multipliers | TBD (Drools / commercial / custom) |
| **OceanInsights** | Analytics — financial exposure, utilization trends, quality metrics, IFRS 17 | IQVIA partner |
| **Claims Integrator** | Connects CLM to IQVIA's claims platform (TMB) bi-directionally | Damco (custom build) |
| **FHIR/HPI Adaptor** | FHIR R4 NZ Base IG compliance; validates providers against HPI | Damco (custom build) |
| **HL7/EDI Middleware** | Translates legacy hospital messaging formats | Damco (custom build) |
| **DocuSign Integration** | Digital contract signing and archiving | Third party |

---

## 4. The Central Database — Why Everything Must Live Together

### The core concept

The system has one unified database. This is not just a technical preference — it is the foundation that makes everything else work. Here is why each data type must be connected to every other.

### Contract Details

The raw contract: which provider, which services are covered, what the rates are, what the conditions are, when it starts and ends, what the current status is (draft / negotiating / active / expiring / terminated).

### Clinical Codes — What They Are and Why They Must Be Linked to Contracts

A clinical code is a standardised number that precisely identifies a medical procedure or diagnosis. Instead of writing "knee replacement surgery" (which is ambiguous), everyone uses a specific code like **NZACS-14711**. Every claim submitted by a hospital references a code. Every contract defines rates for specific codes.

New Zealand uses:
- **ICD-10-AM codes** — for diagnoses (e.g., a specific code for osteoarthritis of the knee)
- **NZACS codes** — for surgical procedures (e.g., total knee replacement)
- **CPT codes** — for other medical procedures
- **MCNZ specialty codes** — for provider specialty classification

**Why the link between contracts and clinical codes is critical:**

When a hospital submits a claim saying "we performed procedure NZACS-14711 on member NHI-456789," the claims system needs to instantly answer:
1. Is this procedure covered under our contract with this hospital?
2. What is the agreed rate for this procedure?
3. Does this procedure require prior approval, and was one obtained?
4. Is the provider still within their annual volume cap for this procedure?

If contracts and clinical codes are stored separately, a human has to manually look all of this up every time. At 1–2 million claims per year, that is impossible. The linkage enables **automated claims adjudication** — the system checks and processes claims without human intervention for the routine cases.

### Provider Data — Why HPI IDs Must Be Stored and Verified

Every contracted provider must be linked to their official HPI identifier (CPN for individual practitioners, HPI-Org-ID for organisations, HPI-Facility-ID for physical locations).

**Why this matters:**
- If a doctor has their registration cancelled (struck off), the system must catch this before the insurer pays another claim for that doctor's work
- During contract creation, the system queries the live HPI API to confirm the provider is currently registered with the right qualifications
- Periodically during the contract lifecycle, the system re-validates registration status
- This is required for CoFI compliance — the insurer must demonstrate they are contracting only with qualified, registered providers

### Financial Data — Why It Must Be in the Same Place

Each contract has a financial dimension tracked in real time:
- Contracted rates per procedure (what was agreed)
- Actuals paid (what was actually claimed and paid, sourced from the claims system)
- Total financial exposure (if every provider hit their maximum contracted volumes, what is the total liability?)
- Budget vs. actual variance per provider, per specialty, per time period

**Why this matters:**
- **Operational:** Contract managers need to know when a provider is approaching their volume cap before it's breached
- **Solvency (RBNZ):** The Reserve Bank requires the insurer to hold capital reserves proportional to their contract liabilities. Without structured financial data in the CLM, this is calculated manually and is error-prone
- **Accounting (IFRS 17):** The new accounting standard requires contract liability data in machine-readable structured format, exportable on demand

### Utilization Data — Connecting Usage to Contract Terms

Utilization is the record of how many procedures have been performed under each contract. This feeds:
- Cap tracking (have they hit their annual limit?)
- Alert generation (are they approaching a threshold?)
- Analytics (are utilization patterns changing? Is cost pressure building in a particular specialty?)
- Contract renewal negotiations (what actually happened vs. what was projected?)

**The key insight:** When all four data types (contract terms, clinical codes, provider identity, financial/utilization actuals) live in the same database and are linked to each other, the system can answer complex questions instantly and automatically. When they live in different systems, every question requires a human to manually pull data from multiple places and reconcile it. That is the current state. The CLM eliminates that entirely.

---

## 5. The Full Contract Lifecycle — Every Stage Explained

### Stage 1: Authoring

The contract manager does not start from a blank page. The system contains **approved templates** — pre-built contract structures with standard legal clauses, compliance terms, and formatting already in place. The manager selects the appropriate template (e.g., "Specialist Surgical Agreement" or "Day Hospital Facility Contract") and populates the specific terms: which provider, which procedure codes are covered, what the rates are, what utilization controls apply.

**Version control:** Every save creates a new version. The system records who made the change, when, and why. You can retrieve the exact state of the contract at any point in its history. This is the same concept as Git for code, applied to legal contracts.

### Stage 2: Internal Review and Approval Workflow

Before the contract goes to the provider, it must be approved internally. The system has a configurable **approval workflow engine** — a set of rules that determines who needs to approve based on what's in the contract.

Examples of approval routing rules:
- Contract annual value under $500K → Contracting Manager approval only
- Contract annual value over $500K → Contracting Manager + CFO approval
- Contract introducing new prior approval rules → also requires Medical Director approval
- Contract with a new provider type not previously contracted → also requires Legal review

Approvals can be:
- **Sequential:** Person A must approve before Person B is even notified
- **Parallel:** Multiple people are notified simultaneously and can approve concurrently

Every approval decision is logged: who approved, timestamp, any comments or conditions attached to the approval.

### Stage 3: Provider Negotiation

The draft contract is sent to the provider through the system (not via email). The provider can review terms, propose changes, and add comments — all tracked within the system. The insurer can accept, reject, or counter-propose. Every exchange is logged with timestamps and participant identities.

This creates a legally defensible negotiation record. If a provider later disputes what was agreed, the complete negotiation history is in the system.

### Stage 4: Digital Execution (E-Signature)

Once both parties agree on terms and internal approval is complete, the contract goes to digital signing via **DocuSign** (or equivalent). The provider receives an email, reviews the final contract online, and signs electronically. The signed contract is automatically archived back into the CLM repository. No printing, scanning, or physical postage.

### Stage 5: Active Contract Management

While the contract is live, the system continuously monitors:
- Utilization against volume caps (with configurable alert thresholds — e.g., alert when 80% of annual cap is reached)
- Contract expiry timeline (automated alerts 90+ days before expiry)
- Provider HPI registration status (periodic re-validation)
- Prior approval rule compliance in downstream claims processing

### Stage 6: Renewal

90 days before expiry (configurable), the system automatically triggers a renewal workflow. The contract manager is notified and the renewal process begins — essentially a new negotiation cycle starting from the existing terms as a baseline. The manager can see the existing rates vs. proposed new rates side by side.

### Stage 7: Amendment

If a change is needed mid-contract (a new procedure needs to be added, rates need adjusting for a specific service), the system handles this through a structured **amendment process**. The amendment is version-controlled, goes through an appropriate approval workflow (potentially lighter-weight than a full contract approval depending on the nature of the change), and the new terms take effect from the agreed amendment date — with the original terms preserved in history.

### Stage 8: Termination

When a contract ends, the system manages the wind-down: tracking any required notice period, calculating final settlement amounts, archiving the full contract history, and updating the provider's network status accordingly.

---

## 6. The Pricing Engine — All Pricing Models Explained

### Why pricing is complex

A simple flat rate ("we pay $4,200 for every knee replacement, every time") is the exception, not the rule. Real provider contracts contain sophisticated pricing arrangements that incentivise particular behaviours. The CLM must support all of the following.

### Fee-for-Service (FFS) — The Baseline

The simplest model. Provider performs a procedure → insurer pays the agreed rate. $4,200 for NZACS-14711 (total knee replacement). Every instance. This is the dominant model in NZ private health insurance today.

### Tiered Pricing

The rate per procedure changes based on how many procedures the provider has performed in the contract period.

```
Example:
Procedures 1–50 per year:    $4,200 each
Procedures 51–100 per year:  $3,900 each
Procedures 101+ per year:    $3,600 each
```

The provider earns a lower rate per procedure as volume increases — but total revenue still grows. From the insurer's perspective, they get a volume discount in exchange for directing more patients to that provider. The system must track the running count per provider, per procedure code, per contract year, and automatically apply the correct tier to each claim.

### Range-Based Pricing

The rate varies based on a measurable attribute of the specific case.

```
Example — by length of inpatient stay:
0–1 night:  $3,800
2–3 nights: $4,500
4+ nights:  $5,200

Example — by procedure complexity score:
Complexity 1–3: $2,900
Complexity 4–6: $4,200
Complexity 7+:  $5,800
```

The system reads the attribute value from the claim and applies the corresponding rate automatically.

### Matrix Pricing

The rate is determined by the intersection of two or more variables — like a lookup table or spreadsheet VLOOKUP.

```
Example:
                        | Tier A Hospital | Tier B Day Surgery |
Low complexity case     |     $3,500      |       $2,800       |
High complexity case    |     $5,000      |       $4,200       |
```

A high-complexity procedure at a Tier A hospital = $5,000. The same procedure at a Tier B day surgery = $4,200. The system reads both variables from the claim and the contract, looks up the intersection, and applies the rate.

### Staircase Arrangements

Similar to tiered pricing, but the rate change is permanent from the point the threshold is crossed — not just applied to procedures above the threshold.

```
Example:
- Procedures 1–99: billed at $4,200 each (as they occur)
- Provider performs their 100th procedure
- From procedure 100 onwards, ALL subsequent procedures are billed at $3,600
- The previous 99 procedures remain at $4,200 as already billed
```

The system tracks the milestone and flips the rate for all future claims once crossed.

### Multiplier Structures

A base rate is modified by a multiplier that applies in specific circumstances.

```
Examples:
Out-of-hours procedure:           base rate × 1.25  (25% premium)
Bilateral procedure (both sides): base rate × 1.70  (not 2× due to shared overhead)
Emergency procedure:              base rate × 1.50
Repeat procedure within 30 days:  base rate × 0.80  (20% reduction)
```

The system reads flags on the claim (out-of-hours indicator, bilateral indicator, emergency indicator) and applies the correct multiplier to the base rate automatically.

### Episode-Based Bundling

Instead of paying separately for every component of a treatment, the insurer pays one flat fee for the entire episode of care.

```
Example — Total Knee Replacement Bundle: $12,000 flat covers:
- Surgeon's fee (procedure NZACS-14711)
- Anaesthetist's fee
- Prosthesis/implant cost
- 2-night inpatient stay at the facility
- 1 post-operative outpatient review
```

The hospital, surgeon, and anaesthetist each submit their own invoices — but the system tracks them as part of the same episode and ensures the total paid across all components does not exceed $12,000. This incentivises coordination between providers and creates cost predictability for the insurer.

**Why this is technically harder:** The system must identify which claims belong to the same episode, aggregate them, and reconcile against the bundle cap — rather than processing each invoice independently.

### The Rules Engine — Technical Architecture

All of these pricing models are managed by a dedicated **Rules Engine** — a separate software component that executes configurable business rules without requiring code changes.

**Why a separate Rules Engine?**

If pricing logic is hard-coded into the CLM application, every time a new pricing arrangement is negotiated, a developer must write code, test it, and deploy it. That is expensive, slow, and risky.

A Rules Engine allows a trained business user to define pricing rules through a user interface ("if procedure code = NZACS-14711 AND facility tier = A AND complexity = High, then price = $5,000") and activate them immediately, without developer involvement.

**How it works technically:**

1. A claim event arrives (procedure code, provider, facility, episode context, modifiers)
2. The CLM sends this data to the Rules Engine as a query
3. The Rules Engine evaluates all active rules that match the inputs
4. The Rules Engine returns the calculated price within 500ms (the performance SLA)
5. The CLM uses this price for adjudication and financial logging

**Rules Engine options being evaluated:**
- **Drools** — open-source Java-based business rules engine, widely used in healthcare and insurance, highly configurable
- **Commercial healthcare rules engine** — purpose-built for insurance pricing, faster to implement but licensing cost
- **Custom build** — maximum control but highest build cost and ongoing maintenance burden

**Decision required before RFI submission (Open Item OI-01).**

---

## 7. Utilization Management — Controlling Volume and Approvals

### Volume Caps and Alerts

Each contract can define maximum annual volumes per procedure or per specialty. The system tracks cumulative volume in real time.

```
Example configuration:
- Auckland Surgical Centre, NZACS-14711 (knee replacement): max 150/year
- Alert at 80% threshold → notify contract manager when count reaches 120
- Alert at 95% threshold → notify contract manager AND medical director when count reaches 143
- At 150: flag all further claims from this provider for this procedure for manual review
```

The contract manager receives system notifications (not just emails — tracked within the system) so alerts don't get lost.

### Prior Approval (PA) — Full Explanation

Prior approval (also called pre-authorisation) means the insurer must approve a treatment before it happens for the insurer's obligation to pay to be triggered.

**The workflow from the provider's perspective:**

1. Member's GP refers them to a surgeon for a knee replacement
2. The surgeon's practice manager submits a PA request to the insurer: patient NHI, procedure code, provider details, clinical justification
3. The insurer's team (or an automated rules check) reviews: Is this procedure on the PA-required list for this contract? Does the member's policy cover it? Is the provider in-network? Is the clinical indication appropriate?
4. Decision: Approved or declined, within the SLA (target: 95% of requests within 2 business hours)
5. If approved: a PA number is issued. The surgeon performs the procedure. The hospital submits the claim with the PA number. The claims system validates the PA number and processes the claim automatically.
6. If no PA number, or PA number doesn't match: the claim is flagged and held for manual review.

**What the CLM manages vs. what IQVIA's platform manages:**

- **CLM:** Stores and manages the rules — which procedures require PA, under what conditions, for which providers. This is part of the contract terms.
- **IQVIA TMB:** Manages the actual PA workflow — receiving requests, routing for review, recording decisions, issuing PA numbers. The claims system checks PA numbers against what's in the database.

The CLM is the rulebook. IQVIA's platform executes the process. The two must be tightly integrated.

**Example PA rule configuration in the CLM:**

```
Procedure NZACS-14711 (total knee replacement): PA always required
Procedure NZACS-09821 (knee arthroscopy):       PA required if patient age > 65
Specialist consultation (first visit):           No PA required
Specialist consultation (follow-up 3+):         PA required
Emergency procedures (any):                     PA not required (retrospective review instead)
```

These rules are stored in the CLM as part of the contract terms. When IQVIA's platform receives a claim or PA request, it queries the CLM for the applicable rules.

---

## 8. Provider Network — Tiers, Coverage, and Geography

### The Three Network Tiers

**Preferred Network (Fully Contracted)**
- Direct agreement with negotiated rates
- Member pays little or nothing out of pocket (the insurer pays the provider directly at the contracted rate)
- Full utilization controls and PA rules apply
- Quality monitoring applies in Phase 2

**Recognized Provider (Partially Contracted)**
- Agreement based on benefit schedule (a standard rate table, not individually negotiated)
- Member may have a gap payment (the provider charges more than the benefit schedule; member pays the difference)
- Some utilization controls apply

**Non-Network / Unaffiliated**
- No direct contract
- Insurer pays a reduced benefit amount; member pays a large gap
- No utilization controls or quality monitoring
- Insurer has no visibility into this provider's practices

### Network Segmentation

Network status is not binary (in or out). A provider can be:
- Preferred for orthopedic surgery, recognized for general surgery
- Preferred in Auckland, recognized in Wellington
- Preferred for procedures under a certain complexity threshold, recognized above it

The CLM manages all these dimensions with effective-dated records — so the system always knows what status a provider had on any given date, not just their current status.

### Geographic Coverage Gaps

New Zealand's private surgical capacity is concentrated in Auckland, Wellington, and Christchurch. Outside these centres, the insurer may have limited or no contracted providers for certain specialties (e.g., no contracted cardiac surgeon in Queenstown).

The CLM, in combination with OceanInsights, must identify these gaps. Why?
- **Member experience:** A member in Queenstown needing cardiac surgery has no in-network option and faces large out-of-pocket costs or travel
- **Solvency risk (RBNZ):** High concentration of contracted volume in a small number of providers is a financial risk — if a major provider exits the network, claims costs could spike unpredictably
- **Commercial:** Identifying gaps helps the contracting team prioritise new provider recruitment

---

## 9. Reporting, Audit, and Compliance

### The Audit Trail — Technical and Regulatory

Every action in the system creates an immutable log entry:

```
Examples of logged events:
- User [name] viewed contract [ID] at [timestamp] from IP [address]
- User [name] changed rate for procedure NZACS-14711 from $4,200 to $4,400 on contract [ID] at [timestamp]
- User [name] approved contract [ID] at [timestamp] with comment [text]
- Contract [ID] sent to provider [name] for digital signature at [timestamp]
- Provider [name] signed contract [ID] at [timestamp] (DocuSign transaction ID: [X])
- System alert: provider [name] reached 80% of annual volume cap for NZACS-14711
```

**Immutable** means write-once — once an entry is written to the audit log, it cannot be modified or deleted, even by system administrators. This is technically implemented using append-only database tables or a dedicated audit logging service.

Retained for minimum 7 years (NZ financial records obligation).

The FMA (Financial Markets Authority) can request audit exports as part of CoFI reviews. The system must be able to produce these exports quickly in a structured format.

### Operational Dashboards (Built Into CLM)

Real-time views for internal contract management users:
- Contracts by status: active, pending signature, in negotiation, expiring within 90 days, terminated
- Approval workflow queue: what's pending, who it's waiting on, how long it's been waiting
- Utilization alerts: which providers are approaching volume caps, which have exceeded them
- Prior approval SLA tracking: what percentage of PA requests are being resolved within 2 hours

### Advanced Analytics (OceanInsights — IQVIA's Platform)

More sophisticated analysis delivered by the analytics layer, fed by structured data exports from the CLM:
- Total financial exposure by specialty, network tier, geographic region, and time period
- Utilization trend analysis: is the volume of a particular procedure increasing? By how much? Is it concentrated in specific providers?
- Financial impact modelling: if the insurer were to increase rates for orthopedic surgery by 5%, what is the estimated annual cost impact?
- Contract performance vs. benchmarks: how does the insurer's contracted rates compare to industry benchmarks?
- IFRS 17 data: contract liability extracts in the format required by the accounting standard

---

## 10. Integrations — How Everything Connects

### IQVIA TMB (Claims Platform) — The Most Critical Integration

TMB (Transaction Management and Billing) is IQVIA's claims processing system. It receives every claim submitted by every provider and processes them for payment.

**CLM → TMB (outbound):**
When a contract is executed in the CLM, the agreed rates and PA rules are automatically pushed to TMB. This means when a claim arrives for procedure NZACS-14711 from Auckland Surgical Centre, TMB already knows: contracted rate = $4,200, PA required = No (for standard cases), annual cap = 150. It can process the claim automatically without any human looking up the contract.

**TMB → CLM (inbound):**
Actual claims data flows back into the CLM so contract managers can see real-world utilization and financial actuals against contracted terms. This is what feeds the utilization cap tracking and the financial reconciliation dashboards.

**Without this integration:** A human must manually enter rates from every contract into the claims system. At the scale of hundreds of contracts and thousands of procedure codes, this is error-prone and creates pricing leakage (claims paid at wrong rates).

### NZ HPI FHIR R4 Integration

The HPI (Health Provider Index) is New Zealand's national provider registry, operated by Te Whatu Ora (Health New Zealand). It exposes a FHIR R4 API.

**When used:**
- During contract creation: system queries HPI in real time to validate the provider's identity, registration status, and qualifications
- Periodically during active contracts: system re-validates that the provider's registration has not lapsed or been cancelled

**Technically:** Damco builds a FHIR adaptor layer using HAPI FHIR (an open-source FHIR implementation library) that translates between the CLM's internal data model and the FHIR R4 NZ Base IG format required by the HPI API.

### REST API — How the CLM Exposes Its Own Data

The CLM exposes a **REST API** — a standard web interface that allows other systems to query and exchange data with the CLM programmatically.

REST (Representational State Transfer) is the standard pattern for modern web APIs. Systems communicate over HTTPS using standard verbs (GET to retrieve data, POST to create, PUT to update, DELETE to remove). Responses are typically in JSON format.

**Who uses the CLM's REST API:**
- IQVIA's Integration Layer (to pull contract terms into TMB)
- OceanInsights (to pull financial and utilization data for analytics)
- The insurer's internal finance and actuarial systems (to pull contract data for IFRS 17 reporting)

The API is documented in **OpenAPI 3.x format** (a machine-readable API specification standard, also known as Swagger) so that consuming systems know exactly what endpoints exist, what parameters to send, and what responses to expect.

**Authentication:** OAuth 2.0 — a standard security protocol where systems exchange cryptographic tokens rather than username/password credentials to prove they are authorised to access the API.

### FHIR R4 Endpoints

In addition to the standard REST API, the CLM exposes selected data as FHIR R4 resources. This is specifically required for:
- Interoperability with other NZ health systems that speak FHIR natively
- Compliance with the NZ digital health interoperability mandate
- Future-proofing as more NZ health infrastructure adopts FHIR as the standard

### HL7 v2 and EDI — Legacy System Connectors

Not all hospital systems in New Zealand are modern. Many still use:

**HL7 v2** — A healthcare messaging standard from the late 1980s/early 1990s. Still widely deployed in hospital information systems (HIS) and laboratory systems globally. Messages are text-based with a specific pipe-delimited format (e.g., MSH|^~\&|SendingApp|...). Different from FHIR but carries similar information.

**EDI (Electronic Data Interchange)** — An even older standard for electronic business document exchange. Used for transactions like eligibility verification and claim status inquiries.

Damco builds **middleware adaptors** — translation services that convert between these legacy formats and the CLM's modern REST/FHIR interfaces. This allows the CLM to integrate with legacy hospital systems without requiring those hospitals to upgrade their own software.

---

## 11. Non-Functional Requirements — How Good the System Must Be

| Requirement | Target | Why |
|---|---|---|
| **Scalability** | Support 940K members; scale to 1.5M without replatforming | Insurer expects growth; rebuild would be expensive and risky |
| **Search Performance** | Contract search results < 2 seconds (95th percentile) | Contract managers need instant responses during negotiations |
| **Pricing Evaluation** | Rules Engine < 500ms per contract line | Claims adjudication cannot be blocked waiting for pricing calculation |
| **Availability** | 99.5% uptime during business hours | Less than 44 hours downtime per year during business hours |
| **Disaster Recovery — RTO** | System restored within 4 hours of failure | RTO = Recovery Time Objective |
| **Disaster Recovery — RPO** | Maximum 1 hour of data loss | RPO = Recovery Point Objective; requires hourly backups minimum |
| **Data Residency** | All personal health data stored in NZ or Australia | NZ Privacy Act — data cannot reside on offshore servers |
| **Cloud Region** | AWS Sydney or Azure Australia East | The APAC cloud regions nearest to NZ |
| **Authentication** | OAuth 2.0 / SAML 2.0 for SSO; MFA mandatory for all users | MFA = Multi-Factor Authentication (password + authenticator app) |
| **Audit Retention** | 7 years minimum | NZ financial records legal obligation |
| **Accessibility** | WCAG 2.1 Level AA for provider portal | International standard for web accessibility for users with disabilities |
| **Browser Support** | Chrome, Edge, Safari, Firefox (current + 1 prior version) | Cross-browser compatibility for provider and internal users |

---

## 12. User Roles and Access Control (RBAC)

**RBAC = Role-Based Access Control.** The system restricts what each user can see and do based on their assigned role. This is a security and compliance requirement — not everyone should be able to see every contract or approve every change.

| Role | Can Do | Cannot Do |
|---|---|---|
| **Contract Author** | Create and edit contracts, initiate workflows | Approve contracts, change pricing rules |
| **Contract Approver** | Approve or reject contracts in workflow | Create contracts from scratch |
| **Read-Only Reviewer** | View contracts and status | Make any changes |
| **Finance User** | View financial data, export IFRS 17 data | Change contract terms |
| **System Administrator** | Configure workflows, manage user access | Approve contracts (segregation of duties) |
| **Provider Portal User** | View their own contracts, submit PA requests, check payments | See any other provider's data |

All access events are logged in the audit trail (who logged in, what they viewed, what they changed).

---

## 13. The Provider Portal — What External Users See

The provider portal is a separate web interface (not the same as the internal system) that hospitals, clinics, and specialist practices use to interact with the insurer.

**What providers can do in the portal:**
- View their current contract terms, rate schedules, and covered procedure codes
- See their real-time utilization against annual volume caps ("you have performed 87 of your 150 contracted knee replacements this year")
- Submit prior approval requests for upcoming procedures
- Check the status of PA requests already submitted
- View payment status for submitted claims
- Submit a request to amend their contract (triggers a workflow in the main CLM for the insurer's team to review)

**Why this matters:** Every query a provider can answer through the portal is a phone call or email the insurer's team doesn't have to handle. The target is 70% of provider queries resolved through self-service. At scale, this represents significant operational savings.

**Multi-user support:** A surgical group practice might have multiple surgeons and multiple administrative staff, all needing access to the same portal account with different permission levels. The portal must support this.

---

## 14. Phased Delivery Plan

| Phase | Timeline | What Gets Built |
|---|---|---|
| **Phase 0: Discovery & Design** | Months 1–2 | Requirements confirmation, data migration assessment, integration design (IQVIA API specs, HPI FHIR), Rules Engine selection and proof-of-concept, solution architecture sign-off |
| **Phase 1: Core CLM** | Months 3–8 | Insura CRM configuration, provider data model, contract lifecycle workflows, approval engine, audit trail, basic operational reporting. Rules Engine integration (FFS, tiered, matrix pricing). HPI FHIR adaptor build. |
| **Phase 2: Integration & SIT** | Months 9–11 | IQVIA TMB integration (contract feeds, PA linkage), OceanInsights data feeds, provider portal launch, HL7/EDI adaptors, end-to-end System Integration Testing |
| **Phase 3: UAT & Go-Live** | Months 12–14 | User Acceptance Testing, parallel run against existing contracting processes, go-live, 30-day hypercare support |
| **Phase 4: VBC Evolution** | Year 2+ | Bundled episode payments, quality-linked rate adjustments, OceanInsights quality measure integration, PROMs/PREMs linkage, shared savings models |

---

## 15. Open Items — Decisions Blocking the Bid

These must be resolved before or during the Discovery phase. They represent risk to scope, cost, and timeline.

| ID | What It Is | Why It Blocks Us | Owner | Urgency |
|---|---|---|---|---|
| **OI-01** | Rules Engine product not chosen (Drools vs. commercial vs. custom) | Cannot scope or price the most complex pricing requirements without this | Damco Arch | Before RFI |
| **OI-02** | IQVIA TMB API spec not received | Cannot design the most critical integration | IQVIA / Damco PM | 2 weeks post-contract |
| **OI-03** | OceanInsights commercial engagement not confirmed | 8 analytics requirements have no delivery vehicle | IQVIA / Damco BD | Before RFI |
| **OI-04** | Client identity not confirmed | Cannot design HPI integration without Te Whatu Ora access | IQVIA (client relationship) | Before RFI |
| **OI-05** | Data migration scope unknown | May add 4–8 weeks and NZD 50–100K to the estimate | Damco / Client | Discovery phase |
| **OI-06** | NZ/APAC delivery partner not identified | RFI evaluation scores on regional presence | Damco BD | Before RFI |
| **OI-07** | VBC messaging not agreed | Risk of over-claiming Day 1 VBC or under-addressing client's strategic goal | Solution Lead | Before RFI |
| **OI-08** | Specific FHIR/HL7 message types not confirmed | Adaptor build scope and cost depends on client's legacy systems | Damco Arch / Client IT | Discovery phase |

---

## 16. Glossary — Every Term Defined

| Term | Plain-Language Definition |
|---|---|
| **ACC** | Accident Compensation Corporation — NZ government body covering accident injuries. Separate from private health insurance. |
| **Adjudication** | The automated process of checking a submitted claim against contract terms, eligibility rules, and PA requirements, then approving or flagging it for payment. |
| **APAC** | Asia-Pacific region. |
| **Audit Trail** | An immutable, timestamped log of every action taken in a system. Cannot be deleted or modified. |
| **CIA 2024** | Contracts of Insurance Act 2024 — NZ insurance contract law reform. |
| **CLM** | Contract Lifecycle Management — the full process and system for managing contracts from creation to termination. |
| **CoFI** | Conduct of Financial Institutions Act 2022 — requires NZ insurers to maintain fair conduct programs. |
| **CPN** | Common Person Number — the unique identifier for individual healthcare practitioners in the NZ HPI. |
| **DRG** | Diagnosis-Related Group — a system of classifying inpatient hospital cases into groups for billing and benchmarking purposes. |
| **EDI** | Electronic Data Interchange — a legacy standard for electronic business document exchange. |
| **Episode of Care** | All the healthcare services related to a single medical event (e.g., a knee replacement and its follow-up). |
| **FHIR R4** | Fast Healthcare Interoperability Resources, version 4 — the internationally standard and NZ-mandated way for health systems to exchange data electronically. Pronounced "fire." |
| **FMA** | Financial Markets Authority — NZ conduct regulator for financial institutions including health insurers. |
| **FFS** | Fee-for-Service — payment model where providers are paid per procedure performed. |
| **HAPI FHIR** | An open-source Java library for implementing FHIR servers and clients. |
| **HL7 v2** | Health Level 7 version 2 — a legacy healthcare messaging standard from the 1980s/90s, still widely used. |
| **HPI** | Health Provider Index — NZ national registry of healthcare providers, accessible via FHIR R4 API. |
| **ICD-10-AM** | International Classification of Diseases, 10th revision, Australian Modification — the clinical coding standard for diagnoses used in NZ and Australia. |
| **IFRS 17** | International Financial Reporting Standard 17 — accounting standard for insurance contracts, mandatory in NZ from 2023. |
| **Immutable** | Cannot be changed or deleted. An immutable audit log is write-once; entries can be added but never modified. |
| **IQVIA HIMP** | IQVIA Health Insurance Management Platform — IQVIA's modular cloud platform for health insurance operations. |
| **MFA** | Multi-Factor Authentication — requiring two forms of identification to log in (e.g., password + authenticator app code). |
| **MCNZ / NZMC** | Medical Council of New Zealand — regulates medical practitioners and publishes specialty classifications. |
| **NHI** | National Health Index — the unique identifier for every healthcare consumer (patient/member) in New Zealand. |
| **OAuth 2.0** | Open Authorization 2.0 — a security standard for API authentication using tokens instead of passwords. |
| **OceanInsights** | IQVIA's analytics and reporting platform for healthcare payer analytics. |
| **OpenAPI 3.x** | A standard format for documenting REST APIs (formerly known as Swagger). |
| **PA / Pre-Auth** | Prior Approval / Pre-Authorisation — insurer's permission required before certain treatments proceed. |
| **PREM** | Patient-Reported Experience Measure — standardized survey of a patient's experience of care. |
| **PROM** | Patient-Reported Outcome Measure — standardized survey of a patient's health outcomes after treatment. |
| **RBAC** | Role-Based Access Control — restricting system access based on each user's assigned role. |
| **RBNZ** | Reserve Bank of New Zealand — prudential regulator for insurers. |
| **REST API** | Representational State Transfer Application Programming Interface — the standard pattern for modern web-based system integrations. |
| **RPO** | Recovery Point Objective — the maximum acceptable amount of data loss measured in time (e.g., RPO of 1 hour means the system must be backed up at least hourly). |
| **RTO** | Recovery Time Objective — the maximum acceptable time to restore a system after failure (e.g., RTO of 4 hours means the system must be back online within 4 hours of an outage). |
| **Rules Engine** | A software component that executes configurable business rules without requiring code changes. Used here for complex pricing logic. |
| **SAML 2.0** | Security Assertion Markup Language 2.0 — a standard for Single Sign-On (SSO) authentication. |
| **SSO** | Single Sign-On — allows users to authenticate once and access multiple systems without logging in again. |
| **TMB** | Transaction Management and Billing — IQVIA's module for claims intake, processing, and billing. |
| **VBC** | Value-Based Contracting — payment models linking provider reimbursement to quality and outcomes, not just volume. |
| **Version Control** | The practice of saving every change to a document/contract with a timestamp, author, and reason — so any historical version can be retrieved. |
| **WCAG 2.1 Level AA** | Web Content Accessibility Guidelines 2.1, Level AA — international standard for web accessibility. |

---

## 17. Success Criteria — How We Know It's Working

| Goal | How Measured | Target |
|---|---|---|
| All contracts in the system | % of active provider contracts managed in CLM | 100% within 12 months of go-live |
| Faster contracting | Average time from initiation to signed contract | Reduce by 40%+ vs. current baseline |
| Accurate claims pricing | % of claims auto-matched to contracted rates without manual correction | ≥ 98% |
| PA turnaround | % of prior approval requests resolved within 2 business hours | ≥ 95% |
| FHIR compliance | NZ FHIR R4 Base IG compliance for HPI/NHI integration | Full compliance at go-live |
| Regulatory readiness | Zero compliance findings related to contract governance in FMA/RBNZ reviews | Maintained through Year 1 |
| Internal user adoption | Active monthly users as % of licensed users | ≥ 85% within 6 months |
| Provider self-service | % of provider queries resolved via portal without human intervention | ≥ 70% within 12 months |

---

*Document prepared by Damco / Achieva — WeAreHashira engagement context. Internal use only. Last updated: May 2026.*
*Source: CLM_BRD_NewZealand_V1.docx — IQVIA Opportunity 2, AMESA Insurance Practice.*
