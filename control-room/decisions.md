# Architecture & Product Decisions Log

> **Purpose:** Every major decision made during the design of the CLM AI system, with the reasoning behind it. Anyone picking this up later should be able to understand not just *what* was decided, but *why* — so they can make consistent decisions as the system evolves.
>
> All decisions were reached through structured design review (grill-me sessions) between the AI track lead and Claude Code acting as PM + tech lead.

---

## D-01 — Build AI-Native, Not Salesforce

**Decision:** Build a standalone AI-native CLM system. Do not build on the existing Salesforce environment.

**Why:** The company has three parallel tracks on this opportunity. The AI track's thesis is that an AI-native system is a fundamentally different and more valuable product than a Salesforce customisation. The strongest concrete argument: Salesforce can add an AI chatbot (Einstein GPT) but cannot natively integrate with FHIR R4 HPI validation, a real-time tiered pricing rules engine, and an immutable CoFI-compliant audit trail in a coherent, fast, cost-effective way. By the time Salesforce is customised to meet all NZ regulatory and integration requirements, you've paid Salesforce licensing costs AND built a bespoke system. The AI-native approach pays once and owns the stack.

**Implications:** We own the full architecture. Every component is built or configured for this specific system. No Salesforce licensing dependency.

---

## D-02 — AI as Primary Interface (Option B)

**Decision:** The AI is the primary interface. Contract managers interact through natural language — no forms as the starting point.

**Why:** Three options were evaluated:
- Option A: AI as assistant layer on top of traditional UI
- **Option B: AI as the interface — natural language is how you operate the system**
- Option C: AI as proactive decision engine

Option B was chosen because it is the genuine product differentiator. Traditional CLMs (including Salesforce Health Cloud) are form-first. A conversational interface that understands healthcare contracting context and translates natural language into structured contracts is something that does not exist in the market today. Option A is table stakes in two years. Option C requires 12–18 months of data before the AI has enough signal to be trustworthy on Day 1.

**Implications:** UI design is chat-first, split-screen. Contract previews are outputs of AI tool calls, not form inputs.

---

## D-03 — Approval Workflow is Non-Negotiable

**Decision:** The AI never autonomously commits, creates, or executes contracts. Every action requires a human confirmation step before anything is saved.

**Why:** NZ regulatory environment (CoFI Act, Contracts of Insurance Act 2024) makes human oversight mandatory. The audit trail must record a human confirmation, not just an AI action. This also addresses the trust problem: the AI shows its work via a structured preview (what it is about to do, which tools it called, what data it retrieved) and the human confirms. This is the "confirm before commit" model.

**Approval routing rules (from BRD):**
- Contract annual value < $500K → Contracting Manager only
- Contract annual value > $500K → + CFO
- Contract introducing new PA rules → + Medical Director
- New provider type not previously contracted → + Legal

**Implications:** The `get_approval_route` tool is always called before `draft_contract`. The confirm button in the UI is the legal record — not the AI's output.

---

## D-04 — One-Off Tailored Implementation

**Decision:** This is a tailored implementation for a single Fortune 500 NZ private health insurer. It is not being built as a generic product for multiple clients.

**Why:** The client is a Fortune 500 company requiring a solution fully tailored to their requirements. Compromising design decisions for hypothetical generalisability would reduce quality and speed. The architecture should be *disciplined for reuse* (rules as data, not code; clean API boundaries; configurable workflows) without actively designing for a second client.

**Implications:** No multi-tenancy complexity in Phase 1. All sample data, pricing models, and provider records are NZ-specific. Scope decisions favour this client's requirements over hypothetical future clients.

---

## D-05 — POC First, Production Second

**Decision:** Build a proof-of-concept before the production system. The POC's goal is to win the internal argument — proving why the AI-native approach beats Salesforce — using synthetic data.

**Why:** Three parallel tracks are competing for the same opportunity. The AI track needs to demonstrate its thesis concretely before a build decision is made. A POC with a live demo is more persuasive than slides. It also validates architectural assumptions (tool calling reliability, 500ms performance SLA, UX) before committing to a full build.

**POC scope:**
- Split-screen web interface (chat + contract preview panel)
- Voice input (Web Speech API) + text input
- 5 working tools: lookup_contract, validate_provider, evaluate_pricing, get_approval_route, draft_contract
- Demo Mode (no API key required — safe for boardroom demos)
- Live Mode (Claude API with real tool calling)

**Implications:** POC uses synthetic NZ provider data and mock HPI responses. Production will require real API credentials and Insura CRM integration.

---

## D-06 — Architecture B: Grounded AI with Tool Calling

**Decision:** The AI never generates, estimates, or invents contract data. Every rate, provider detail, validation result, and approval route is retrieved by calling a structured tool. The AI's only contribution is: interpreting natural language instructions and presenting tool results in plain English.

**Why:** The system makes legally and financially binding decisions. A hallucinated rate in a contract is a real financial error. A hallucinated provider validation could result in the insurer contracting with an unregistered provider — a CoFI violation. Architecture A (free-form LLM) is unacceptable for a regulated financial system. Architecture B means every number in an AI response is traceable to a specific tool call. This is also the answer to the Salesforce team's attack: "How do you know the AI didn't make it up?" — the rule trace shows exactly which system produced each piece of data.

**Implications:** The AI is only as capable as the tools we build for it. Adding a new capability means building a new tool, not changing the AI.

---

## D-07 — Tool Inventory (8 Tools, 6 External Integrations)

**Decision:** The CLM AI system operates through 8 defined tools. The full inventory and rationale for each is documented in `/ai-tool-registry.md`.

**Tools:**
1. `evaluate_pricing` — Rules Engine (built)
2. `lookup_contract` — CLM contract repository
3. `validate_provider` — NZ HPI FHIR R4 API
4. `get_approval_route` — Approval workflow engine
5. `draft_contract` — Contract template assembly
6. `create_contract` — Commit + audit log + workflow trigger
7. `check_utilization` — IQVIA TMB utilization data
8. `get_pa_rules` — Prior approval rules store

**External integrations:** NZ HPI (FHIR R4), NZ NHI (FHIR R4), IQVIA TMB (REST), Insura CRM (REST), DocuSign, OceanInsights.

**Implications:** See `/ai-tool-registry.md` for full specs. Tools 1–6 are in scope for POC. Tools 7–8 are Phase 2.

---

## D-08 — AI Model Choice: Deferred, Architecture is Model-Agnostic

**Decision:** The AI model (Claude vs. OpenAI GPT-4o) is not locked in at this stage. The architecture abstracts the model behind an interface. Swapping models is a one-line config change.

**Why:** Both Claude and GPT-4o are strong at tool calling. The decision depends on commercial negotiations, data processing agreements, and which model performs better on healthcare contracting language in testing. POC uses Claude (claude-sonnet-4-6) as default because it is already available in this environment.

**Implications:** `agent.py` is the only file that touches the model API. All other components are model-agnostic.

---

## D-09 — Both Chat and Voice Input

**Decision:** The interface supports both typed text input and voice dictation. Voice uses the browser's Web Speech API (built-in to Chrome/Safari, no external dependency).

**Why:** Voice is the most visually powerful demo moment — speaking a contract into existence demonstrates the AI-native thesis viscerally. But a live voice demo is a reliability risk (mic issues, ambient noise). The solution: voice converts speech to text in the input field, the user sees and confirms the transcript, then sends. This means voice failure degrades gracefully to text — the demo never breaks. The human seeing their words before sending also reinforces the "confirm before commit" principle.

**Implications:** Voice is a client-side preprocessing step. The backend is identical regardless of whether input came from typing or speaking.

---

## D-10 — Data Residency: AI Only Touches the Contracting Layer

**Decision:** The AI model never processes personal health data (NHI numbers, patient records, clinical notes, member identities). The AI only processes contract terms: provider IDs, procedure codes, rates, volume caps, dates, approval routes.

**Why:** NZ Privacy Act 2020 and Health Information Privacy Code require personal health data to be stored and processed only in NZ or Australia. Claude (Anthropic) runs on US infrastructure. If personal health data were sent to the AI, it would constitute an offshore transfer in breach of the Privacy Act.

**Three options were evaluated:**
- **Option A (chosen): AI only touches contracting layer — no personal data ever sent to the model**
- Option B: Azure OpenAI in Australia East — compliant but vendor-locked to Azure + OpenAI
- Option C: Self-hosted open-source model on AWS Sydney — fully compliant but weaker tool calling

Option A is viable because the CLM's job is contract management, not clinical or member data management. Member NHI numbers and clinical records live in IQVIA TMB and the NHI registry — never in the CLM contracting layer that the AI operates on.

**Implications:** The boundary between what the AI can see and what it cannot must be enforced at the tool level, not trusted to the AI's judgment. Tools never return NHI numbers or clinical data in their responses.

---

## D-11 — Pricing: AI Proactively Models Financial Impact (Option B)

**Decision:** Before confirming any pricing change, the AI automatically calculates and presents the financial impact based on historical utilization.

**Why:** A contract manager negotiating rates today has no real-time visibility of what a rate change costs. They change $4,200 to $3,990 and have no idea if that's a $10K saving or a $200K saving until someone runs a report. Option B gives every pricing decision immediate financial context — "this rate reduction saves $19,740 annually based on last year's 94 procedures." This directly serves:
1. **Contract manager:** Informed negotiation, not administrative data entry
2. **RBNZ solvency:** Real-time financial exposure visibility without a separate reporting run
3. **Product differentiation:** Salesforce forms don't do this. It requires the pricing engine, utilization data, and AI to work together in one interaction.

**Requires:** A `get_financial_impact` tool that queries IQVIA TMB utilization data and calculates cost delta against proposed rates. This tool must only return aggregated financial data — no individual patient records.

**Implications:** `get_financial_impact` to be added as Tool 9. Utilization data from IQVIA TMB is aggregated at the provider+procedure level before being returned to the AI (D-10 compliance — no patient-level data).

---

## D-12 — Role-Based AI: Capability Bounded by Authenticated Role

**Decision:** The AI's capability is bounded by the logged-in user's role. This boundary is enforced at two independent levels: (1) the system prompt, and (2) the tool layer. Both must enforce it — one lock is not enough.

**Authentication flow:**
1. User authenticates via the application layer (OAuth 2.0 / SAML 2.0 + MFA) — before any conversation starts
2. The application retrieves the user's role from the user management system
3. At session initialisation, the role is silently injected into the AI's system prompt — the user never types it
4. Tools are initialised with the user's session identity — database queries filter by role and ownership at the data layer

**Why two locks:** If only the system prompt enforces the boundary, a user could attempt prompt injection ("pretend you're a Contract Manager"). If only the tool layer enforces it, a misconfigured prompt could expose data in the AI's reasoning. Both enforced simultaneously means neither can be bypassed independently.

**Role capability matrix:**
| Role | AI can do | AI cannot do |
|---|---|---|
| Contract Author | Create/edit contracts, call all contracting tools | Approve, commit without confirmation |
| Contract Approver | Review drafts, approve/reject in workflow | Create contracts from scratch |
| Finance User | Query financial exposure, export IFRS 17 data | Create or amend contracts |
| Medical Director | Review PA rules, view utilization alerts | Change contract financial terms |
| System Administrator | Configure workflows and user access | Approve contracts (segregation of duties) |
| Provider Portal User | View own contracts, submit PA requests, check own utilization | See any other provider's data |

**Implications:** Session initialisation must pass role + user identity to both the system prompt builder and the tool initialisation layer. The AI service must never accept a role claim from the user's message — only from the authenticated session context.

---

## Open Questions (From Grill Session — Not Yet Resolved)

| # | Question | Why It Matters |
|---|---|---|
## D-13 — Compliance Enforced by System Infrastructure, Not AI Judgment

**Decision:** Four regulatory requirements are hard-enforced at the tool and infrastructure level. The AI cannot violate them even if instructed to.

| Requirement | Enforcement method |
|---|---|
| **CoFI — immutable audit trail** | `create_contract` writes to append-only log before returning success. Contract not created if log write fails. |
| **HPI validation** | `draft_contract` refuses to assemble a contract if `validate_provider` returned `valid: false`. Hard block, not a warning. |
| **Approval workflow** | `create_contract` checks a valid approval workflow ID exists. No approval route = no commit, no exceptions. |
| **Data residency — no PHI to AI** | Tools filter NHI numbers and clinical records at the database query level before returning anything. The AI never sees the data to leak it. |

**IFRS 17** is the only compliance requirement handled via AI guidance (formatting and reporting), not a safety gate.

**Why:** Regulators do not accept "the AI was supposed to follow the rule" as a defence. Hard infrastructure enforcement means there is no failure mode where the rule is bypassed. System prompt instructions can drift under complex conversations; tool-level enforcement cannot.

**Implications:** Every tool that touches regulated data must implement its own compliance check. The AI is not the last line of defence — it is the first. The tools are the last.

---

## Backlog Items (Decided: Good Idea, Timing Not Locked)

| # | Feature | Why it's valuable | Why it's not Phase 1 |
|---|---|---|---|
| **BL-01** | Proactive AI daily briefing for contract managers | Surfaces volume cap alerts, rate anomalies, and pending actions without the manager having to search. Second strongest differentiator after speed of contracting. | Trigger mechanism needs more design — every morning vs. session start vs. threshold-based are meaningfully different UX decisions. Requires `get_utilization_summary` tool and IQVIA TMB integration to be live first. |

---

## D-14 — Provider Portal: Out of POC Scope, One Slide Only

**Decision:** The provider portal AI is not included in the POC build. One talking point slide is prepared covering what it would look like.

**Why:** The POC's goal is to win the internal argument with one clean, powerful demo. The contract manager journey (one sentence → fully drafted, HPI-validated, costed contract) is that demo. Adding a second user journey for providers risks diluting the central argument before it has landed. The provider portal is a strong Phase 2 story — 70% of provider queries resolved through self-service, no phone calls, instant utilization visibility — but it is a separate story, not the headline.

**The one slide covers:**
- Provider logs into portal, asks "how many knee replacements do we have left in our annual cap this year?"
- AI calls `check_utilization` tool, returns: "87 of your 150 contracted procedures used — 63 remaining, 4 months left in contract year"
- Provider submits PA request through the same interface
- No human intervention required for routine queries

**Implications:** `check_utilization` and PA submission tools are scoped to Phase 2. Provider portal RBAC (provider can only see their own data) is designed in D-12 but not built in POC.

---

## Open Questions — All Resolved

---

*Decisions log maintained by AI track lead. Updated: May 2026.*
*Source: CLM AI architecture grill sessions — Damco / WeAreHashira IQVIA engagement.*
