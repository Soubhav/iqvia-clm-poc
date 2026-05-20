const API_BASE = "http://localhost:8001";
const SESSION_ID = "demo-" + Math.random().toString(36).slice(2, 8);

// LiveKit voice state
let livekitRoom = null;
let lkVoiceActive = false;
let currentDraft = null;
let selectedContractId = null;
let selectedNegotiationId = null;
let expandedClauseId = null;
let selectedTemplateId = null;
let selectedProviderId = null;
let clauseCategory = "All";
let contractStatusFilter = "All";
let templateCategory = "All";
let networkFilter = "All";
let previousScreen = "dashboard";
let currentScreen = "dashboard";
let contractSearch = "";
let contractModel = "";
let providerRegistrySearch = "";
let adminSection = "users";
let wizardStep = 1;
let wizardData = {};
const COLLAB_EDITOR_URL = "http://localhost:3000";

// ─── Synthetic data ───────────────────────────────────────────────────────────

const CONTRACTS = [
  { id:"CTR-001", provider:"Auckland Surgical Centre",     city:"Auckland",      contractType:"Surgical — Elective", contractSubType:"surgical-elective", procedure:"Total Knee Replacement", hpiOrgId:"G00001-K", procedureCode:"NZACS-1471", accCode:"SA11106", model:"TIERED",    rateRange:"$3,600–$4,200", cap:150, status:"EXPIRING",     effectiveDate:"2025-08-01", expiry:"2026-07-31", ytd:94,  networkTier:"preferred", relationshipOwner:"Sarah Mitchell",
    tiers:[{from:1,to:50,rate:4200},{from:51,to:100,rate:3900},{from:101,to:null,rate:3600}] },
  { id:"CTR-002", provider:"Wellington Orthopaedics",      city:"Wellington",    contractType:"Surgical — Elective", contractSubType:"surgical-elective", procedure:"Total Knee Replacement", hpiOrgId:"G00012-M", procedureCode:"NZACS-1471", accCode:"SA11106", model:"FFS",       rateRange:"$4,050",         cap:80,  status:"ACTIVE",       effectiveDate:"2025-09-01", expiry:"2026-08-31", ytd:61,  networkTier:"preferred", relationshipOwner:"James Okonkwo",
    rate:4050 },
  { id:"CTR-003", provider:"Christchurch Surgical Centre", city:"Christchurch",  contractType:"Surgical — Elective", contractSubType:"surgical-elective", procedure:"Knee Arthroscopy",       hpiOrgId:"G00023-P", procedureCode:"NZACS-1422", accCode:"SA11104", model:"FFS",       rateRange:"$2,800",         cap:100, status:"ACTIVE",       effectiveDate:"2025-10-01", expiry:"2026-09-30", ytd:43,  networkTier:"preferred", relationshipOwner:"Sarah Mitchell",
    rate:2800 },
  { id:"CTR-004", provider:"Auckland Surgical Centre",     city:"Auckland",      contractType:"Surgical — Elective", contractSubType:"individual-pricing", procedure:"Knee Arthroscopy",       hpiOrgId:"G00001-K", procedureCode:"NZACS-1422", accCode:"SA11104", model:"TIERED",    rateRange:"$2,400–$2,900",  cap:200, status:"ACTIVE",       effectiveDate:"2025-01-01", expiry:"2026-12-31", ytd:112, networkTier:"preferred", relationshipOwner:"Sarah Mitchell",
    tiers:[{from:1,to:75,rate:2900},{from:76,to:150,rate:2600},{from:151,to:null,rate:2400}] },
  { id:"CTR-005", provider:"Wellington Regional Hospital", city:"Wellington",    contractType:"Surgical — Elective", contractSubType:"government",         procedure:"Total Knee Replacement", hpiOrgId:"G00045-R", procedureCode:"NZACS-1471", accCode:"SA11106", model:"MATRIX",    rateRange:"$2,800–$5,000",  cap:120, status:"ACTIVE",       effectiveDate:"2026-07-01", expiry:"2027-06-30", ytd:38,  networkTier:"preferred", relationshipOwner:"James Okonkwo",
    matrix:{"A:high":5000,"A:low":3500,"B:high":4200,"B:low":2800} },
  { id:"CTR-006", provider:"Auckland Surgical Centre",     city:"Auckland",      contractType:"Surgical — Elective", contractSubType:"surgical-elective", procedure:"Total Hip Replacement",  hpiOrgId:"G00001-K", procedureCode:"NZACS-1502", accCode:"SA11109", model:"STAIRCASE", rateRange:"$4,900–$5,800",  cap:120, status:"ACTIVE",       effectiveDate:"2026-07-01", expiry:"2027-06-30", ytd:107, networkTier:"preferred", relationshipOwner:"Sarah Mitchell",
    threshold:100, rateBefore:5800, rateAfter:4900 },
  { id:"CTR-007", provider:"Dunedin Surgical Group",       city:"Dunedin",       contractType:"Surgical — Elective", contractSubType:"individual-pricing", procedure:"Knee Arthroscopy",       hpiOrgId:"G00067-T", procedureCode:"NZACS-1422", accCode:"SA11104", model:"FFS",       rateRange:"$2,400",         cap:60,  status:"NEGOTIATION",  effectiveDate:"2027-04-01", expiry:"2027-03-31", ytd:0,   networkTier:"standard",   relationshipOwner:"Sarah Mitchell",
    rate:2400 },
  { id:"CTR-DRAFT", provider:"Christchurch Surgical Centre",city:"Christchurch", contractType:"Surgical — Elective", contractSubType:"surgical-elective", procedure:"Total Knee Replacement", hpiOrgId:"G00023-P", procedureCode:"NZACS-1471", accCode:"SA11106", model:"TIERED",    rateRange:"$3,420–$3,990",  cap:120, status:"NEGOTIATION",   effectiveDate:"2026-07-01", expiry:"2027-06-30", ytd:0,   networkTier:"preferred", relationshipOwner:"Sarah Mitchell",
    tiers:[{from:1,to:40,rate:3990},{from:41,to:80,rate:3705},{from:81,to:null,rate:3420}] },
];

const APPROVALS = [
  {
    id: "APP-001", contractId: "CTR-DRAFT-CHC-001", type: "New Contract",
    provider: "Christchurch Surgical Centre", procedure: "Total Knee Replacement",
    model: "TIERED", annualValue: 479400, submittedBy: "AI Studio (Sarah Mitchell)",
    submittedAt: "11 May 2026, 09:23",
    approvers: ["Contracting Manager", "CFO"], currentStep: 0, status: "PENDING",
    summary: "Tiered pricing — $3,990 / $3,705 / $3,420 · Cap: 120 · Term: 1 Jul 2026 – 30 Jun 2027",
  },
  {
    id: "APP-002", contractId: "AMD-CTR-001-001", type: "Amendment",
    provider: "Auckland Surgical Centre", procedure: "Total Knee Replacement",
    model: "TIERED", annualValue: 430620, submittedBy: "AI Studio (Sarah Mitchell)",
    submittedAt: "11 May 2026, 10:45",
    approvers: ["Contracting Manager"], currentStep: 0, status: "PENDING",
    summary: "5% tier reduction across all bands · Effective: 25 May 2026 · Annual saving: ~$22,600",
  },
];

const ACTIVITY = [
  { text: "Amendment drafted — CTR-001 Auckland Surgical (−5% tier reduction, annual saving $22,600)", time: "10:45", dot: "blue" },
  { text: "Utilization checked — Auckland Surgical Centre (3 contracts, 1 alert at 89.2%)", time: "10:12", dot: "blue" },
  { text: "New contract drafted — CTR-DRAFT-CHC-001 Christchurch Surgical Centre (knee replacement, tiered)", time: "09:23", dot: "blue" },
  { text: "Provider validated — CHC-SURGICAL-001 HPI Active, expires 31 Dec 2026", time: "09:22", dot: "green" },
  { text: "Pricing evaluated — AKL-SURGICAL-001 · NZACS-14711 · Tier 1 → $4,200 NZD", time: "09:21", dot: "green" },
];

const CLAUSES = [
  { id: "CL-001", category: "Indemnity", title: "Standard Indemnity — Bilateral", status: "approved", version: "v3.2", lastReviewed: "Feb 2026", tags: ["indemnity", "risk", "bilateral"],
    body: "Each party (\"Indemnifying Party\") shall indemnify, defend and hold harmless the other party and its officers, directors, employees and agents from and against any and all claims, damages, losses, costs and expenses (including reasonable legal fees) arising out of or resulting from the Indemnifying Party's breach of this Agreement or negligent acts or omissions in connection with the performance of its obligations hereunder." },
  { id: "CL-002", category: "Termination", title: "Termination for Convenience — 90 Days", status: "approved", version: "v2.1", lastReviewed: "Jan 2026", tags: ["termination", "notice", "90-day"],
    body: "Either party may terminate this Agreement without cause upon ninety (90) days' written notice to the other party. In the event of termination, the Health Insurer shall pay the Provider for all Services properly rendered prior to the effective date of termination in accordance with the rates set out in Schedule 1." },
  { id: "CL-003", category: "Confidentiality", title: "Patient Data — NZ Privacy Act 2020", status: "approved", version: "v4.0", lastReviewed: "Mar 2026", tags: ["privacy", "data", "compliance", "NZ"],
    body: "The Provider shall maintain the confidentiality of all patient health information in accordance with the New Zealand Privacy Act 2020 and the Health Information Privacy Code 2020. Patient data shall not be disclosed to any third party without prior written consent from the Health Insurer, except as required by law or for the direct provision of health services to the patient." },
  { id: "CL-004", category: "Performance", title: "Wait Time SLA — Elective Procedures", status: "approved", version: "v1.8", lastReviewed: "Feb 2026", tags: ["SLA", "wait-time", "elective"],
    body: "The Provider shall ensure that patients referred for elective procedures are offered a first specialist assessment appointment within 60 calendar days of referral acceptance. The Provider shall report monthly on compliance with this standard using the agreed reporting template submitted within 10 business days of month end." },
  { id: "CL-005", category: "Dispute Resolution", title: "Dispute Resolution — Mediation First", status: "approved", version: "v2.0", lastReviewed: "Dec 2025", tags: ["dispute", "mediation", "arbitration"],
    body: "Any dispute arising under this Agreement shall first be referred to good-faith mediation between the parties' senior representatives within 15 business days of written notice of dispute. If mediation does not resolve the dispute within 30 days, either party may refer the matter to arbitration under the Arbitration Act 1996 (NZ)." },
  { id: "CL-006", category: "Indemnity", title: "Clinical Negligence Exclusion", status: "under-review", version: "v1.0", lastReviewed: "Apr 2026", tags: ["indemnity", "clinical", "exclusion"],
    body: "Nothing in this Agreement shall be construed to require the Health Insurer to indemnify the Provider against claims arising from the Provider's own clinical negligence, errors or omissions. The Provider shall maintain appropriate professional indemnity insurance of no less than $5,000,000 NZD per claim at all times during the Term." },
  { id: "CL-007", category: "Pricing", title: "Rate Adjustment — CPI Indexation", status: "approved", version: "v2.3", lastReviewed: "Jan 2026", tags: ["pricing", "CPI", "indexation"],
    body: "Contract rates shall be subject to annual review on the anniversary of the Commencement Date. The Health Insurer may adjust rates by up to the CPI movement for the preceding 12 months as published by Statistics New Zealand, without requiring formal contract amendment. Adjustments shall take effect 30 days after written notification." },
  { id: "CL-008", category: "Reporting", title: "Monthly Claims Reporting Obligation", status: "approved", version: "v3.1", lastReviewed: "Mar 2026", tags: ["reporting", "claims", "monthly"],
    body: "The Provider shall submit a monthly claims report to the Health Insurer within 10 business days of the end of each calendar month. Reports shall be submitted in the agreed electronic format compatible with the IQVIA TMB claims platform and shall include procedure codes, dates of service, NHI numbers, provider identifiers, and total charges billed." },
];

const PROVIDERS = [
  {
    id:"PRV-001", name:"Auckland Surgical Centre", city:"Auckland",
    street:"210 Remuera Road", postcode:"1050", region:"Auckland",
    type:"Surgical Centre", tier:"gold", status:"contracted",
    contracts:3, hpiOrgId:"G00001-K", hpiFacilityCode:"F00034",
    nzbn:"9429041000001", specialty:"Orthopaedics",
    onboardingDate:"2019-03-15", relationshipOwner:"Sarah Mitchell",
    annualVolume:312, ytdSpend:1284600, hpiStatus:"Active", hpiExpiry:"2027-06-30",
    contact:"Michael Thompson", contactEmail:"m.thompson@aucklandsurgical.co.nz", contactPhone:"+64 9 555 0100",
    contacts: [
      { name:"Michael Thompson", role:"CEO",               email:"m.thompson@aucklandsurgical.co.nz", phone:"+64 9 555 0100", primary:true  },
      { name:"Dr. Karen Hughes", role:"Medical Director",  email:"k.hughes@aucklandsurgical.co.nz",   phone:"+64 9 555 0101", primary:false },
      { name:"Lisa Martin",      role:"Contracts Manager", email:"l.martin@aucklandsurgical.co.nz",   phone:"+64 9 555 0102", primary:false },
    ],
    complianceDocs: [
      { name:"Indemnity Insurance Certificate",  required:true,  status:"received",    expiry:"2027-03-31" },
      { name:"Facility Accreditation (HDSS)",    required:true,  status:"expiring",    expiry:"2026-09-30" },
      { name:"MedSafe Compliance Certificate",   required:true,  status:"received",    expiry:"2027-06-30" },
      { name:"ACC Provider Registration",        required:true,  status:"received",    expiry:"2027-06-30" },
      { name:"IRD Registration (NZBN verified)", required:true,  status:"received",    expiry:null         },
      { name:"Privacy Act 2020 Acknowledgement", required:true,  status:"received",    expiry:null         },
      { name:"Health & Safety Policy",           required:false, status:"outstanding", expiry:null         },
    ],
    activityLog: [
      { type:"system",  date:"10 Mar 2026", user:"System",           description:"Provider added to pipeline as Lead via HPI lookup" },
      { type:"email",   date:"14 Mar 2026", user:"Sarah Mitchell",   description:"Initial outreach email sent — service capability overview and volume data requested" },
      { type:"meeting", date:"02 Apr 2026", user:"Sarah Mitchell",   description:"Discovery meeting — discussed orthopaedic volume (312 procedures/yr), theatre capacity, and ACC rate alignment" },
      { type:"email",   date:"10 Apr 2026", user:"Michael Thompson", description:"Provider submitted capability statement, surgical outcome data, and 2025 procedure volume report" },
      { type:"call",    date:"22 Apr 2026", user:"Sarah Mitchell",   description:"Follow-up call — confirmed FHIR R4 reporting readiness and IQVIA TMB integration timeline" },
      { type:"system",  date:"25 Apr 2026", user:"System",           description:"HPI validation confirmed — G00001-K Active, facility accreditation verified" },
      { type:"note",    date:"01 May 2026", user:"Sarah Mitchell",   description:"Strong candidate — high surgical volume, excellent outcomes data. Priority for onboarding this quarter." },
      { type:"meeting", date:"15 May 2026", user:"Sarah Mitchell",   description:"Contract terms introduction meeting — tiered pricing model and MSA framework presented to provider team" },
    ],
  },
  {
    id:"PRV-002", name:"Wellington Orthopaedics", city:"Wellington",
    street:"50 Manners Street", postcode:"6011", region:"Wellington",
    type:"Specialist Clinic", tier:"gold", status:"contracted",
    contracts:1, hpiOrgId:"G00012-M", hpiFacilityCode:"F00089",
    nzbn:"9429041000002", specialty:"Orthopaedics",
    onboardingDate:"2020-08-20", relationshipOwner:"James Okonkwo",
    annualVolume:88, ytdSpend:356400, hpiStatus:"Active", hpiExpiry:"2027-03-31",
    contact:"Dr. Sarah Lee", contactEmail:"s.lee@wellingtonortho.co.nz", contactPhone:"+64 4 555 0200",
    contacts: [
      { name:"Dr. Sarah Lee", role:"Medical Director",       email:"s.lee@wellingtonortho.co.nz",   phone:"+64 4 555 0200", primary:true  },
      { name:"Tom Nguyen",    role:"Finance Manager",        email:"t.nguyen@wellingtonortho.co.nz",phone:"+64 4 555 0201", primary:false },
      { name:"Rachel Kim",    role:"Compliance Coordinator", email:"r.kim@wellingtonortho.co.nz",   phone:"+64 4 555 0202", primary:false },
    ],
    complianceDocs: [
      { name:"Indemnity Insurance Certificate",  required:true,  status:"received", expiry:"2027-08-31" },
      { name:"Facility Accreditation (HDSS)",    required:true,  status:"received", expiry:"2027-12-31" },
      { name:"MedSafe Compliance Certificate",   required:true,  status:"received", expiry:"2027-09-30" },
      { name:"ACC Provider Registration",        required:true,  status:"received", expiry:"2027-03-31" },
      { name:"IRD Registration (NZBN verified)", required:true,  status:"received", expiry:null         },
      { name:"Privacy Act 2020 Acknowledgement", required:true,  status:"received", expiry:null         },
      { name:"Health & Safety Policy",           required:false, status:"received", expiry:"2027-06-30" },
    ],
    activityLog: [
      { type:"system",  date:"01 Sep 2025", user:"System",         description:"Contract CTR-002 activated — FFS pricing, Total Knee Replacement, term 1 Sep 2025 – 31 Aug 2026" },
      { type:"email",   date:"03 Sep 2025", user:"James Okonkwo",  description:"Welcome pack sent — IQVIA TMB onboarding guide and claims submission portal credentials" },
      { type:"system",  date:"15 Sep 2025", user:"System",         description:"First claims submission received via IQVIA TMB — 3 procedures processed successfully" },
      { type:"call",    date:"10 Feb 2026", user:"James Okonkwo",  description:"Quarterly performance review — 61 procedures YTD, on track for 88 annual projection" },
      { type:"email",   date:"05 May 2026", user:"James Okonkwo",  description:"CPI rate adjustment notice sent — 2.1% increase effective 1 Sep 2026 per clause CL-007" },
      { type:"system",  date:"18 May 2026", user:"System",         description:"Annual renewal review initiated — contract CTR-002 expiry 31 Aug 2026 flagged for renewal" },
    ],
  },
  {
    id:"PRV-003", name:"Christchurch Surgical Centre", city:"Christchurch",
    street:"76 Riccarton Road", postcode:"8041", region:"Canterbury",
    type:"Surgical Centre", tier:"silver", status:"negotiating",
    contracts:0, hpiOrgId:"G00023-P", hpiFacilityCode:"F00112",
    nzbn:"9429041000003", specialty:"Orthopaedics",
    onboardingDate:"2022-11-01", relationshipOwner:"Sarah Mitchell",
    annualVolume:0, ytdSpend:0, hpiStatus:"Active", hpiExpiry:"2026-12-31",
    contact:"Dr. James Chen", contactEmail:"j.chen@chcsurgical.co.nz", contactPhone:"+64 3 555 0300",
    contacts: [
      { name:"Dr. James Chen", role:"Medical Director", email:"j.chen@chcsurgical.co.nz",   phone:"+64 3 555 0300", primary:true  },
      { name:"Anna Roberts",   role:"CEO",              email:"a.roberts@chcsurgical.co.nz", phone:"+64 3 555 0301", primary:false },
      { name:"Mark Wilson",    role:"Finance Manager",  email:"m.wilson@chcsurgical.co.nz",  phone:"+64 3 555 0302", primary:false },
    ],
    complianceDocs: [
      { name:"Indemnity Insurance Certificate",  required:true,  status:"expiring",    expiry:"2026-07-31" },
      { name:"Facility Accreditation (HDSS)",    required:true,  status:"expiring",    expiry:"2026-12-31" },
      { name:"MedSafe Compliance Certificate",   required:true,  status:"outstanding", expiry:null         },
      { name:"ACC Provider Registration",        required:true,  status:"received",    expiry:"2027-06-30" },
      { name:"IRD Registration (NZBN verified)", required:true,  status:"received",    expiry:null         },
      { name:"Privacy Act 2020 Acknowledgement", required:true,  status:"received",    expiry:null         },
      { name:"Health & Safety Policy",           required:false, status:"received",    expiry:"2027-03-31" },
    ],
    activityLog: [
      { type:"system",  date:"01 Nov 2022", user:"System",          description:"Provider onboarded to pipeline — HPI validated, initial compliance review initiated" },
      { type:"meeting", date:"15 Jan 2026", user:"Sarah Mitchell",  description:"Initial contract terms meeting — tiered pricing model proposed for Total Knee Replacement, cap 120/yr" },
      { type:"system",  date:"10 Feb 2026", user:"System",          description:"Draft contract CTR-DRAFT-CHC-001 created — tiered pricing: $3,990 / $3,705 / $3,420" },
      { type:"email",   date:"12 Feb 2026", user:"Sarah Mitchell",  description:"Draft contract CTR-DRAFT-CHC-001 sent to provider for review — 10 business day response window" },
      { type:"note",    date:"01 Mar 2026", user:"Dr. James Chen",  description:"Provider requests Tier 1 rate of $4,100 — cites alignment with Auckland Surgical rates (logged as CH-001)" },
      { type:"meeting", date:"20 Apr 2026", user:"Sarah Mitchell",  description:"Negotiation Round 2 — Tier 1 rate and annual volume cap discussed. 90-day termination clause accepted (CH-002)." },
      { type:"system",  date:"11 May 2026", user:"System",          description:"Contract submitted for approval — APP-001 pending Contracting Manager and CFO sign-off" },
    ],
  },
  {
    id:"PRV-004", name:"Wellington Regional Hospital", city:"Wellington",
    street:"49 Riddiford Street", postcode:"6021", region:"Wellington",
    type:"Hospital", tier:"platinum", status:"contracted",
    contracts:1, hpiOrgId:"G00045-R", hpiFacilityCode:"F00156",
    nzbn:"9429041000004", specialty:"Multi-Specialty",
    onboardingDate:"2018-06-15", relationshipOwner:"James Okonkwo",
    annualVolume:156, ytdSpend:780000, hpiStatus:"Active", hpiExpiry:"2028-01-31",
    contact:"Helen Park", contactEmail:"h.park@wrh.health.nz", contactPhone:"+64 4 555 0400",
    contacts: [
      { name:"Helen Park",      role:"Hospital Director",      email:"h.park@wrh.health.nz",  phone:"+64 4 555 0400", primary:true  },
      { name:"Dr. David Walsh", role:"Clinical Director",      email:"d.walsh@wrh.health.nz", phone:"+64 4 555 0401", primary:false },
      { name:"Jessica Brown",   role:"Contracts & Compliance", email:"j.brown@wrh.health.nz", phone:"+64 4 555 0402", primary:false },
    ],
    complianceDocs: [
      { name:"Indemnity Insurance Certificate",  required:true,  status:"received", expiry:"2028-01-31" },
      { name:"Facility Accreditation (HDSS)",    required:true,  status:"received", expiry:"2028-06-30" },
      { name:"MedSafe Compliance Certificate",   required:true,  status:"received", expiry:"2028-01-31" },
      { name:"ACC Provider Registration",        required:true,  status:"received", expiry:"2028-01-31" },
      { name:"IRD Registration (NZBN verified)", required:true,  status:"received", expiry:null         },
      { name:"Privacy Act 2020 Acknowledgement", required:true,  status:"received", expiry:null         },
      { name:"Health & Safety Policy",           required:false, status:"received", expiry:"2028-06-30" },
    ],
    activityLog: [
      { type:"system",  date:"01 Jul 2026", user:"System",         description:"Contract CTR-005 activated — matrix pricing, Total Knee Replacement, term 1 Jul 2026 – 30 Jun 2027" },
      { type:"email",   date:"03 Jul 2026", user:"James Okonkwo",  description:"Welcome pack and IQVIA TMB integration guide distributed to Helen Park and clinical team" },
      { type:"system",  date:"10 Jul 2026", user:"System",         description:"IQVIA TMB data feed active — claims submission live, first batch of procedures received" },
      { type:"meeting", date:"05 Oct 2026", user:"James Okonkwo",  description:"Quarterly performance review — 38 procedures YTD against 120 cap, volume ramp expected H2" },
      { type:"call",    date:"10 May 2026", user:"James Okonkwo",  description:"Exploratory discussion re: matrix rate renegotiation for 2027/28 term — provider raised A:High complexity rate" },
      { type:"note",    date:"12 May 2026", user:"James Okonkwo",  description:"Renewal negotiation initiated for CTR-005 — targeting 4% reduction on A:High matrix rate ($5,000 → $4,800)" },
    ],
  },
  {
    id:"PRV-005", name:"Dunedin Surgical Group", city:"Dunedin",
    street:"83 Stuart Street", postcode:"9016", region:"Otago",
    type:"Surgical Centre", tier:"standard", status:"contracting",
    contracts:0, hpiOrgId:"G00067-T", hpiFacilityCode:"F00198",
    nzbn:"9429041000005", specialty:"Orthopaedics",
    onboardingDate:"2024-02-28", relationshipOwner:"Sarah Mitchell",
    annualVolume:0, ytdSpend:0, hpiStatus:"Active", hpiExpiry:"2027-09-30",
    contact:"Dr. Andrew Wu", contactEmail:"a.wu@dunedinsurgical.co.nz", contactPhone:"+64 3 555 0500",
    contacts: [
      { name:"Dr. Andrew Wu",  role:"Director / Surgeon", email:"a.wu@dunedinsurgical.co.nz",    phone:"+64 3 555 0500", primary:true  },
      { name:"Sophie Turner",  role:"Practice Manager",   email:"s.turner@dunedinsurgical.co.nz", phone:"+64 3 555 0501", primary:false },
    ],
    complianceDocs: [
      { name:"Indemnity Insurance Certificate",  required:true,  status:"received",    expiry:"2027-09-30" },
      { name:"Facility Accreditation (HDSS)",    required:true,  status:"received",    expiry:"2027-06-30" },
      { name:"MedSafe Compliance Certificate",   required:true,  status:"received",    expiry:"2027-09-30" },
      { name:"ACC Provider Registration",        required:true,  status:"received",    expiry:"2027-09-30" },
      { name:"IRD Registration (NZBN verified)", required:true,  status:"received",    expiry:null         },
      { name:"Privacy Act 2020 Acknowledgement", required:true,  status:"outstanding", expiry:null         },
      { name:"Health & Safety Policy",           required:false, status:"received",    expiry:"2027-06-30" },
    ],
    activityLog: [
      { type:"system",  date:"28 Feb 2024", user:"System",         description:"Provider onboarded — HPI validated G00067-T, facility accreditation confirmed" },
      { type:"meeting", date:"10 Jun 2024", user:"Sarah Mitchell", description:"Initial scoping meeting — Knee Arthroscopy FFS pricing model discussed, standard tier rate $2,400" },
      { type:"email",   date:"01 Aug 2024", user:"Sarah Mitchell", description:"Contract framework document sent for provider review — standard tier FFS schedule" },
      { type:"note",    date:"15 Sep 2024", user:"Sarah Mitchell", description:"Provider accepted FFS rate $2,400 — volume cap 60/yr agreed in principle" },
      { type:"system",  date:"07 Nov 2024", user:"System",         description:"Draft contract CTR-007 created — FFS Knee Arthroscopy, cap 60/yr, effective 1 Apr 2027" },
      { type:"email",   date:"12 Nov 2024", user:"Dr. Andrew Wu",  description:"Provider countersigned draft terms — final legal review underway by provider's solicitor" },
      { type:"system",  date:"19 May 2026", user:"System",         description:"Final contract version cleared by legal — ready for DocuSign execution" },
    ],
  },
  {
    id:"PRV-006", name:"Hamilton Health Partners", city:"Hamilton",
    street:"14 Ward Street", postcode:"3204", region:"Waikato",
    type:"Specialist Clinic", tier:"standard", status:"under-review",
    contracts:0, hpiOrgId:"G00089-W", hpiFacilityCode:"F00234",
    nzbn:"9429041000006", specialty:"Specialist Outpatient",
    onboardingDate:null, relationshipOwner:"James Okonkwo",
    annualVolume:0, ytdSpend:0, hpiStatus:"Pending", hpiExpiry:null,
    contact:"Dr. Maria Santos", contactEmail:"m.santos@hamiltonhealth.co.nz", contactPhone:"+64 7 555 0600",
    contacts: [
      { name:"Dr. Maria Santos", role:"Medical Director", email:"m.santos@hamiltonhealth.co.nz", phone:"+64 7 555 0600", primary:true  },
      { name:"Carlos Rivera",    role:"CEO",              email:"c.rivera@hamiltonhealth.co.nz", phone:"+64 7 555 0601", primary:false },
    ],
    complianceDocs: [
      { name:"Indemnity Insurance Certificate",  required:true,  status:"received",    expiry:"2027-06-30" },
      { name:"Facility Accreditation (HDSS)",    required:true,  status:"outstanding", expiry:null         },
      { name:"MedSafe Compliance Certificate",   required:true,  status:"outstanding", expiry:null         },
      { name:"ACC Provider Registration",        required:true,  status:"received",    expiry:"2027-06-30" },
      { name:"IRD Registration (NZBN verified)", required:true,  status:"outstanding", expiry:null         },
      { name:"Privacy Act 2020 Acknowledgement", required:true,  status:"received",    expiry:null         },
      { name:"Health & Safety Policy",           required:false, status:"outstanding", expiry:null         },
    ],
    activityLog: [
      { type:"system",  date:"01 Feb 2026", user:"System",         description:"Provider submitted expression of interest — added to pipeline as Lead" },
      { type:"email",   date:"05 Feb 2026", user:"James Okonkwo",  description:"Acknowledgement sent — information pack and compliance document checklist provided" },
      { type:"call",    date:"20 Feb 2026", user:"James Okonkwo",  description:"Introductory call with Dr. Santos and CEO — discussed specialist outpatient volumes and FSA demand in Waikato" },
      { type:"system",  date:"10 Mar 2026", user:"System",         description:"HPI validation submitted — G00089-W pending Ministry of Health confirmation" },
      { type:"note",    date:"15 Mar 2026", user:"James Okonkwo",  description:"Provider moved to Under Review — awaiting HPI validation and 3 outstanding compliance documents" },
      { type:"email",   date:"19 May 2026", user:"James Okonkwo",  description:"Compliance document reminder sent — HDSS accreditation and IRD NZBN verification still outstanding" },
    ],
  },
];

const PRICING_SCHEDULES = [
  { code:"NZACS-1471", system:"NZACS", name:"Total Knee Replacement",                        category:"Orthopaedics",         baseRate:4200, unit:"per procedure",   accCode:"SA11106" },
  { code:"NZACS-1502", system:"NZACS", name:"Total Hip Replacement",                          category:"Orthopaedics",         baseRate:5200, unit:"per procedure",   accCode:"SA11109" },
  { code:"NZACS-1422", system:"NZACS", name:"Knee Arthroscopy",                               category:"Orthopaedics",         baseRate:2800, unit:"per procedure",   accCode:"SA11104" },
  { code:"NZACS-1385", system:"NZACS", name:"Shoulder Arthroscopy",                           category:"Orthopaedics",         baseRate:3100, unit:"per procedure",   accCode:"SA11102" },
  { code:"NZACS-1455", system:"NZACS", name:"Spinal Decompression",                           category:"Orthopaedics",         baseRate:6800, unit:"per procedure",   accCode:"SA12001" },
  { code:"NZACS-2210", system:"NZACS", name:"Laparoscopic Cholecystectomy",                   category:"General Surgery",      baseRate:3400, unit:"per procedure",   accCode:"SA21001" },
  { code:"NZACS-2180", system:"NZACS", name:"Inguinal Hernia Repair",                         category:"General Surgery",      baseRate:2600, unit:"per procedure",   accCode:"SA21003" },
  { code:"NZACS-2350", system:"NZACS", name:"Appendectomy",                                   category:"General Surgery",      baseRate:3800, unit:"per procedure",   accCode:"SA22001" },
  { code:"CPT-99213",  system:"CPT",   name:"Office Visit — Established Patient (Level 3)",   category:"Specialist Outpatient",baseRate:320,  unit:"per consultation", accCode:null      },
  { code:"CPT-99214",  system:"CPT",   name:"Office Visit — Established Patient (Level 4)",   category:"Specialist Outpatient",baseRate:420,  unit:"per consultation", accCode:null      },
  { code:"CPT-99243",  system:"CPT",   name:"First Specialist Assessment — Moderate",          category:"Specialist Outpatient",baseRate:480,  unit:"per FSA",          accCode:null      },
  { code:"CPT-99244",  system:"CPT",   name:"First Specialist Assessment — Moderate-High",     category:"Specialist Outpatient",baseRate:580,  unit:"per FSA",          accCode:null      },
  { code:"CPT-73721",  system:"CPT",   name:"MRI — Knee (without contrast)",                   category:"Radiology",            baseRate:620,  unit:"per scan",         accCode:null      },
  { code:"CPT-73223",  system:"CPT",   name:"MRI — Shoulder (with/without contrast)",          category:"Radiology",            baseRate:680,  unit:"per scan",         accCode:null      },
  { code:"CPT-71250",  system:"CPT",   name:"CT — Thorax",                                    category:"Radiology",            baseRate:520,  unit:"per scan",         accCode:null      },
  { code:"CPT-70553",  system:"CPT",   name:"MRI — Brain (with/without contrast)",             category:"Radiology",            baseRate:780,  unit:"per scan",         accCode:null      },
  { code:"CPT-97110",  system:"CPT",   name:"Therapeutic Exercise (30 min)",                   category:"Physiotherapy",        baseRate:120,  unit:"per session",      accCode:null      },
  { code:"CPT-97530",  system:"CPT",   name:"Therapeutic Activities (30 min)",                 category:"Physiotherapy",        baseRate:130,  unit:"per session",      accCode:null      },
  { code:"CPT-97140",  system:"CPT",   name:"Manual Therapy Techniques (30 min)",              category:"Physiotherapy",        baseRate:115,  unit:"per session",      accCode:null      },
  { code:"CPT-90837",  system:"CPT",   name:"Psychotherapy (60 min)",                          category:"Psychology",           baseRate:200,  unit:"per session",      accCode:null      },
  { code:"CPT-90834",  system:"CPT",   name:"Psychotherapy (45 min)",                          category:"Psychology",           baseRate:160,  unit:"per session",      accCode:null      },
  { code:"CPT-90792",  system:"CPT",   name:"Psychiatric Evaluation with Medical Services",    category:"Psychiatry",           baseRate:420,  unit:"per assessment",   accCode:null      },
];

const NEGOTIATIONS = [
  { id:"NEG-001", contractId:"CTR-DRAFT-CHC-001", provider:"Christchurch Surgical Centre", contractType:"Surgical — Elective", hpiOrgId:"G00023-P", procedure:"Total Knee Replacement", round:2, status:"in-progress", lastActivity:"13 May 2026",
    collaborators:[
      { name:"Sarah Mitchell", role:"Contract Manager",        initials:"SM", online:true,  color:"#1e40af" },
      { name:"James Okonkwo",  role:"Senior Contract Manager", initials:"JO", online:false, color:"#1e40af" },
    ],
    votes:{ approve:1, reject:0, pending:1 },
    changes:[
      { id:"CH-001", type:"rate-change",   field:"Tier 1 Rate (Claims 1–40)",  from:"$3,990",             to:"$4,100",               proposedBy:"Provider (G00023-P)",     proposerType:"provider", status:"pending",  note:"Provider requests Tier 1 alignment with Auckland Surgical rates" },
      { id:"CH-002", type:"clause-change", field:"Termination Notice Period",   from:"60 days written notice", to:"90 days written notice", proposedBy:"Provider (G00023-P)", proposerType:"provider", status:"accepted", note:"Accepted — aligns with standard clause CL-002" },
      { id:"CH-003", type:"cap-change",    field:"Annual Volume Cap",           from:"120 procedures/year",to:"140 procedures/year",  proposedBy:"Sarah Mitchell (Insurer)", proposerType:"insurer",  status:"rejected", note:"Provider rejects — cites OR capacity constraints for 2026/27" },
    ]
  },
  { id:"NEG-002", contractId:"CTR-005", provider:"Wellington Regional Hospital", contractType:"Surgical — Elective", hpiOrgId:"G00045-R", procedure:"Total Knee Replacement", round:1, status:"awaiting-response", lastActivity:"10 May 2026",
    collaborators:[
      { name:"James Okonkwo", role:"Senior Contract Manager", initials:"JO", online:true, color:"#1e40af" },
    ],
    votes:{ approve:0, reject:0, pending:1 },
    changes:[
      { id:"CH-004", type:"rate-change",   field:"Matrix Rate A:High · NZACS-1471", from:"$5,000", to:"$4,800", proposedBy:"James Okonkwo (Insurer)", proposerType:"insurer", status:"pending", note:"5-year volume growth justifies 4% rate reduction on highest complexity tier" },
      { id:"CH-005", type:"clause-change", field:"Claims Reporting Frequency",       from:"Quarterly",  to:"Monthly",  proposedBy:"James Okonkwo (Insurer)", proposerType:"insurer", status:"pending", note:"Required for IQVIA TMB real-time integration in Phase 2" },
    ]
  },
];

const TEMPLATES = [
  { id:"TPL-001", name:"Surgical — Elective", category:"Surgical",
    description:"Standard elective surgical procedures for contracted surgical centres and hospitals.",
    tags:["elective","volume-cap","tiered","ACC-funded","NZACS","orthopaedics"],
    model:"TIERED", baseRate:4000, clauses:8, lastUpdated:"Mar 2026", usedIn:4,
    applicableTo:"Surgical Centres, Hospitals",
    pricingNote:"Base rate × network tier multiplier. Platinum 1.2× · Gold 1.1× · Silver 1.05× · Standard 1.0×",
    clauseList:["Standard Indemnity — Bilateral","Termination for Convenience — 90 Days","Patient Data — NZ Privacy Act 2020","Wait Time SLA — Elective Procedures","Monthly Claims Reporting Obligation","Rate Adjustment — CPI Indexation","Dispute Resolution — Mediation First","Clinical Negligence Exclusion"] },
  { id:"TPL-002", name:"Surgical — Acute / Emergency", category:"Surgical",
    description:"Acute and emergency surgical procedures including after-hours and ED components.",
    tags:["acute","emergency","staircase","after-hours","hospital","ACC"],
    model:"STAIRCASE", baseRate:5000, clauses:9, lastUpdated:"Jan 2026", usedIn:1,
    applicableTo:"Hospitals, Level 3+ Facilities",
    pricingNote:"Staircase — pre-threshold $5,000 · post-threshold $4,200. After-hours surcharge 15%.",
    clauseList:["Standard Indemnity — Bilateral","Termination for Convenience — 90 Days","Patient Data — NZ Privacy Act 2020","After-Hours Surcharge Clause","Wait Time SLA — Emergency Triage","Monthly Claims Reporting Obligation","Rate Adjustment — CPI Indexation","Dispute Resolution — Mediation First","Clinical Negligence Exclusion"] },
  { id:"TPL-003", name:"Specialist Outpatient", category:"Specialist",
    description:"First specialist assessments (FSA) and ongoing specialist consultations.",
    tags:["outpatient","FFS","FSA","specialist-consultation","referral"],
    model:"FFS", baseRate:350, clauses:7, lastUpdated:"Feb 2026", usedIn:2,
    applicableTo:"Specialist Clinics, Private Hospitals",
    pricingNote:"Flat FFS per consultation. FSA $350 · Follow-up $280 · Procedure add-on rates in Schedule 1.",
    clauseList:["Standard Indemnity — Bilateral","Termination for Convenience — 90 Days","Patient Data — NZ Privacy Act 2020","FSA Wait Time SLA","Monthly Claims Reporting Obligation","Rate Adjustment — CPI Indexation","Dispute Resolution — Mediation First"] },
  { id:"TPL-004", name:"Radiology & Diagnostics", category:"Diagnostics",
    description:"Imaging, radiology, and diagnostic procedure contracts.",
    tags:["radiology","imaging","matrix","IQVIA-TMB","diagnostics","MRI","CT"],
    model:"MATRIX", baseRate:280, clauses:7, lastUpdated:"Apr 2026", usedIn:1,
    applicableTo:"Radiology Practices, Imaging Centres",
    pricingNote:"Matrix pricing by modality (X-ray / CT / MRI / PET) × complexity. See Schedule 1.",
    clauseList:["Standard Indemnity — Bilateral","Termination for Convenience — 90 Days","Patient Data — NZ Privacy Act 2020","Equipment Calibration and Quality Standards","Monthly Claims Reporting Obligation","Rate Adjustment — CPI Indexation","Dispute Resolution — Mediation First"] },
  { id:"TPL-005", name:"Allied Health", category:"Allied Health",
    description:"Physiotherapy, occupational therapy, speech language therapy and related services.",
    tags:["allied-health","physiotherapy","ACC","FFS","session-cap","OT","SLT"],
    model:"FFS", baseRate:120, clauses:6, lastUpdated:"Feb 2026", usedIn:3,
    applicableTo:"Allied Health Providers, Community Clinics",
    pricingNote:"FFS per session. Standard $120 · Extended $180 · Group $60/head. ACC surcharge applies.",
    clauseList:["Standard Indemnity — Bilateral","Termination for Convenience — 90 Days","Patient Data — NZ Privacy Act 2020","ACC Co-Payment Compliance","Monthly Claims Reporting Obligation","Dispute Resolution — Mediation First"] },
  { id:"TPL-006", name:"Mental Health & Wellbeing", category:"Mental Health",
    description:"Psychology, psychiatry, counselling, and mental health and addictions services.",
    tags:["mental-health","psychology","FFS","session-cap","psychiatry","counselling"],
    model:"FFS", baseRate:200, clauses:8, lastUpdated:"Mar 2026", usedIn:2,
    applicableTo:"Psychology Practices, Mental Health Clinics",
    pricingNote:"FFS per session. Psychology $200 · Psychiatry $380. Annual session cap per member applies.",
    clauseList:["Standard Indemnity — Bilateral","Termination for Convenience — 90 Days","Patient Data — NZ Privacy Act 2020","Session Cap — Annual Benefit Limit","Crisis Response Protocol","Monthly Claims Reporting Obligation","Rate Adjustment — CPI Indexation","Dispute Resolution — Mediation First"] },
];

const USERS = [
  { id:"USR-001", name:"Sarah Mitchell", email:"s.mitchell@healthinsurer.co.nz", role:"contract_manager",        roleLabel:"Contract Manager",        status:"active",   lastLogin:"18 May 2026, 09:14", initials:"SM", avatarColor:"#1e40af" },
  { id:"USR-002", name:"James Okonkwo",  email:"j.okonkwo@healthinsurer.co.nz",  role:"senior_contract_manager", roleLabel:"Senior Contract Manager", status:"active",   lastLogin:"18 May 2026, 08:47", initials:"JO", avatarColor:"#1e40af" },
  { id:"USR-003", name:"Lisa Chen",      email:"l.chen@healthinsurer.co.nz",      role:"admin",                   roleLabel:"Administrator",           status:"active",   lastLogin:"17 May 2026, 16:33", initials:"LC", avatarColor:"#7c3aed" },
  { id:"USR-004", name:"David Park",     email:"d.park@healthinsurer.co.nz",      role:"viewer",                  roleLabel:"Viewer",                  status:"active",   lastLogin:"16 May 2026, 11:20", initials:"DP", avatarColor:"#71717a" },
  { id:"USR-005", name:"Emma Walsh",     email:"e.walsh@healthinsurer.co.nz",     role:"contract_manager",        roleLabel:"Contract Manager",        status:"inactive", lastLogin:"02 Apr 2026, 14:05", initials:"EW", avatarColor:"#1e40af" },
];

const ROLES = [
  { id:"admin",                   name:"Administrator",           color:"#7c3aed", userCount:1,
    permissions:[{name:"Create Contracts",allowed:true},{name:"Approve Contracts",allowed:true},{name:"Manage Users & Roles",allowed:true},{name:"System Configuration",allowed:true},{name:"View All Data",allowed:true},{name:"Delete Records",allowed:true}] },
  { id:"senior_contract_manager", name:"Senior Contract Manager", color:"#2563eb", userCount:1,
    permissions:[{name:"Create Contracts",allowed:true},{name:"Approve Contracts",allowed:true},{name:"Manage Users & Roles",allowed:false},{name:"System Configuration",allowed:false},{name:"View All Data",allowed:true},{name:"Delete Records",allowed:false}] },
  { id:"contract_manager",        name:"Contract Manager",        color:"#0891b2", userCount:2,
    permissions:[{name:"Create Contracts",allowed:true},{name:"Approve Contracts",allowed:false},{name:"Manage Users & Roles",allowed:false},{name:"System Configuration",allowed:false},{name:"View All Data",allowed:false},{name:"Delete Records",allowed:false}] },
  { id:"viewer",                  name:"Viewer",                  color:"#71717a", userCount:1,
    permissions:[{name:"Create Contracts",allowed:false},{name:"Approve Contracts",allowed:false},{name:"Manage Users & Roles",allowed:false},{name:"System Configuration",allowed:false},{name:"View All Data",allowed:false},{name:"Delete Records",allowed:false}] },
];

const INTEGRATIONS = [
  { id:"INT-001", name:"DocuSign",     category:"E-Signature",       status:"connected",    description:"Electronic signature for all executed contracts",                    lastSync:"18 May 2026" },
  { id:"INT-002", name:"IQVIA TMB",    category:"Claims Data",       status:"connected",    description:"Real-time claims data feed for utilization and adjudication",        lastSync:"18 May 2026" },
  { id:"INT-003", name:"NZ HPI",       category:"Provider Validation",status:"connected",   description:"Health Provider Index — validates provider registration status",      lastSync:"18 May 2026" },
  { id:"INT-004", name:"Salesforce CRM",    category:"CRM",              status:"disconnected", description:"Customer relationship data sync for provider management",                            lastSync:"Never" },
  { id:"INT-005", name:"Microsoft Outlook", category:"Email & Calendar", status:"connected",    description:"Automatic email logging and activity tracking for provider communications",         lastSync:"19 May 2026" },
];

// ─── Screen switching ─────────────────────────────────────────────────────────

const renderedScreens = new Set(["studio"]);

function showScreen(name) {
  previousScreen = currentScreen;
  currentScreen = name;
  document.querySelectorAll(".screen").forEach(s => {
    s.classList.remove("active");
    s.style.display = "none";
  });
  document.querySelectorAll(".nav-item").forEach(t => t.classList.remove("active"));
  const target = document.getElementById(`screen-${name}`);
  if (!target) return;
  target.classList.add("active");
  target.style.display = "flex";
  document.querySelector(`.nav-item[data-screen="${name}"]`)?.classList.add("active");

  if (!renderedScreens.has(name)) {
    renderedScreens.add(name);
    const renderers = {
      dashboard:          renderDashboard,
      contracts:          renderContracts,
      approvals:          renderApprovals,
      network:            renderNetworkList,
      "provider-profile": renderProviderProfile,
      "pricing-config":   renderPricingConfig,
      clauses:            renderClauseLibrary,
      negotiation:        renderNegotiation,
      templates:          renderTemplateRepository,
      integrations:       renderIntegrations,
      admin:              renderAdmin,
    };
    renderers[name]?.();
  }
}

function goBack() {
  showScreen(previousScreen || "dashboard");
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const res = await fetch(`${API_BASE}/api/health`).catch(() => null);
  const badge = document.getElementById("modeBadge");
  if (res?.ok) {
    const data = await res.json();
    badge.textContent = data.mode === "live" ? "Live AI" : "Demo Mode";
    badge.className = "mode-badge " + (data.mode === "live" ? "live" : "mock");
  } else {
    badge.textContent = "Offline";
    badge.className = "mode-badge mock";
  }
  renderDashboard();
  showScreen("dashboard");
  setupVoice();
  initTooltips();
}

// ─── Tooltip system ───────────────────────────────────────────────────────────

function initTooltips() {
  const tip = document.getElementById("infoTooltip");
  let hideTimer = null;

  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest("[data-tip-title]");
    if (!el) return;
    clearTimeout(hideTimer);
    document.getElementById("tipTitle").textContent = el.dataset.tipTitle || "";
    document.getElementById("tipPhase").textContent = el.dataset.tipPhase || "";
    document.getElementById("tipDesc").textContent = el.dataset.tipDesc || "";
    tip.style.display = "block";

    const rect = el.getBoundingClientRect();
    let left = rect.right + 14;
    let top = rect.top;

    setTimeout(() => {
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      if (left + tw > window.innerWidth - 8) left = rect.left - tw - 14;
      if (top + th > window.innerHeight - 8) top = window.innerHeight - th - 8;
      tip.style.left = Math.max(8, left) + "px";
      tip.style.top  = Math.max(8, top)  + "px";
    }, 0);
  });

  document.addEventListener("mouseout", (e) => {
    const el = e.target.closest("[data-tip-title]");
    if (!el) return;
    hideTimer = setTimeout(() => { tip.style.display = "none"; }, 80);
  });
}

// ─── Screen 1: Dashboard ──────────────────────────────────────────────────────

function renderDashboard() {
  const alertContracts = CONTRACTS.map(c => ({ ...c, pct: Math.round((c.ytd / c.cap) * 100) }))
    .filter(c => c.pct >= 75).sort((a, b) => b.pct - a.pct);
  const expiring = CONTRACTS.filter(c => c.status === "EXPIRING")
    .concat(CONTRACTS.filter(c => c.status === "ACTIVE" && new Date(c.expiry) < new Date("2026-09-01")))
    .slice(0, 3);
  const pendingApprovals = APPROVALS.filter(a => a.status === "PENDING");
  const activeCount = CONTRACTS.filter(c => c.status === "ACTIVE").length;
  const contractedCount = PROVIDERS.filter(p => p.status === "contracted").length;
  const pipelineCount = PROVIDERS.filter(p => p.status !== "contracted").length;
  const totalYTDSpend = PROVIDERS.reduce((sum, p) => sum + (p.ytdSpend || 0), 0);

  const pipelineStages = [
    { key:"lead",          label:"Lead",          count: PROVIDERS.filter(p=>p.status==="lead").length },
    { key:"under-review",  label:"Under Review",  count: PROVIDERS.filter(p=>p.status==="under-review").length },
    { key:"negotiating",   label:"Negotiating",   count: PROVIDERS.filter(p=>p.status==="negotiating").length },
    { key:"contracting",   label:"Contracting",   count: PROVIDERS.filter(p=>p.status==="contracting").length },
    { key:"contracted",    label:"Contracted",    count: PROVIDERS.filter(p=>p.status==="contracted").length },
  ];

  const hero = PROVIDERS.find(p => p.id === "PRV-001");
  const heroStageIndex = pipelineStages.findIndex(s => s.key === hero?.status);

  const pipelineTrackerHtml = `
    <div style="display:flex;align-items:center;gap:0;margin:16px 0 8px">
      ${pipelineStages.map((s, i) => {
        const isCurrent = i === heroStageIndex;
        const isDone = i < heroStageIndex;
        const isLast = i === pipelineStages.length - 1;
        const bg = isCurrent ? "var(--blue)" : isDone ? "var(--green)" : "var(--surface-hover)";
        const fg = (isCurrent || isDone) ? "#fff" : "var(--text-muted)";
        const border = isCurrent ? "2px solid var(--blue)" : isDone ? "2px solid var(--green)" : "2px solid var(--border)";
        return `<div style="display:flex;align-items:center;flex:1;min-width:0">
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <div style="width:28px;height:28px;border-radius:50%;background:${bg};border:${border};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${fg};flex-shrink:0">
              ${isDone ? "✓" : i+1}
            </div>
            <div style="font-size:10.5px;font-weight:${isCurrent?700:500};color:${isCurrent?"var(--blue)":isDone?"var(--green)":"var(--text-muted)"};text-align:center;white-space:nowrap">${s.label}</div>
          </div>
          ${!isLast ? `<div style="height:2px;flex:1;background:${isDone?"var(--green)":"var(--border)"};margin-bottom:20px"></div>` : ""}
        </div>`;
      }).join("")}
    </div>
    <div style="background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--blue);line-height:1.5;margin-top:4px">
      <strong>Auckland Surgical Centre</strong> — HPI: G00001-K · <strong>Contracted</strong> · 3 active contracts · YTD spend $1.28M NZD · Relationship owner: Sarah Mitchell
    </div>`;

  document.getElementById("screen-dashboard").innerHTML = `
    <div class="screen-header">
      <div class="screen-header-top">
        <div>
          <div class="screen-title">Good morning, Sarah.</div>
          <div class="screen-sub">Monday, 18 May 2026 · Here is your contract portfolio at a glance.</div>
        </div>
        <div class="screen-actions">
          <button class="btn-sm outline" onclick="showScreen('network')">+ New Provider</button>
          <button class="btn-sm primary" onclick="showScreen('studio')">+ New Contract</button>
        </div>
      </div>
    </div>
    <div class="screen-body">
      <div class="stat-row">
        <div class="stat-card clickable" onclick="setContractStatusFilter('Active');showScreen('contracts')">
          <div class="stat-label">Active Contracts</div><div class="stat-value blue">${activeCount}</div><div class="stat-sub">Across ${contractedCount} contracted providers</div>
        </div>
        <div class="stat-card clickable" onclick="showScreen('approvals')">
          <div class="stat-label">Pending Approval</div><div class="stat-value amber">${pendingApprovals.length}</div><div class="stat-sub">Awaiting your action · click to review</div>
        </div>
        <div class="stat-card clickable" onclick="setContractStatusFilter('All');showScreen('contracts')">
          <div class="stat-label">Utilization Alerts</div><div class="stat-value red">${alertContracts.length}</div><div class="stat-sub">Above 75% of cap · click to view</div>
        </div>
        <div class="stat-card clickable" onclick="showScreen('network')">
          <div class="stat-label">In Pipeline</div><div class="stat-value blue">${pipelineCount}</div><div class="stat-sub">Providers being onboarded</div>
        </div>
      </div>
      <div class="dashboard-grid">
        <div>
          <div class="section-card">
            <div class="section-card-header"><span class="section-card-title">Utilization Alerts</span><span class="section-card-count">${alertContracts.length} contracts above 75%</span></div>
            ${alertContracts.map(c => {
              const level = c.pct >= 90 ? "critical" : "warning";
              const weeksLeft = Math.round(((c.cap - c.ytd) / (c.ytd / 10)) * 4.33);
              return `<div class="alert-row"><div class="alert-info"><div class="alert-title">${c.provider}</div><div class="alert-sub">${c.id} · ${c.hpiOrgId} · ${c.model}</div><div class="alert-bar-wrap"><div class="alert-bar ${level}" style="width:${c.pct}%"></div></div></div><div class="alert-meta"><div class="alert-pct ${level}">${c.pct}%</div><div class="alert-days">${c.ytd}/${c.cap} · ~${weeksLeft}w left</div><button class="btn-sm outline" style="margin-top:6px" onclick="showScreen('contracts')">View</button></div></div>`;
            }).join("")}
          </div>
          <div class="section-card">
            <div class="section-card-header"><span class="section-card-title">Expiring Contracts</span><span class="section-card-count">within 90 days</span></div>
            ${expiring.map(c => {
              const days = Math.round((new Date(c.expiry) - new Date("2026-05-18")) / 86400000);
              const urgency = days <= 30 ? "critical" : days <= 60 ? "warning" : "ok";
              return `<div class="alert-row"><div class="alert-info"><div class="alert-title">${c.provider}</div><div class="alert-sub">${c.id} · ${c.hpiOrgId} · Expires ${c.expiry}</div></div><div class="alert-meta"><div class="alert-pct ${urgency}">${days}d</div><div class="alert-days">remaining</div><button class="btn-sm outline" style="margin-top:6px" onclick="showScreen('studio')">Renew</button></div></div>`;
            }).join("")}
          </div>
        </div>
        <div>
          <div class="section-card">
            <div class="section-card-header"><span class="section-card-title">Pending Approvals</span><span class="section-card-count">${pendingApprovals.length} awaiting action</span></div>
            ${pendingApprovals.map(a => `<div class="approval-row"><div style="flex-shrink:0"><span class="status-pill ${a.type==="New Contract"?"draft":"pending"}">${a.type}</span></div><div class="approval-info"><div class="approval-title">${a.provider}</div><div class="approval-sub">${a.contractId} · $${a.annualValue.toLocaleString()} est. annual</div></div><button class="btn-sm primary" style="flex-shrink:0" onclick="showScreen('approvals')">Review</button></div>`).join("")}
          </div>
          <div class="section-card">
            <div class="section-card-header">
              <span class="section-card-title">Provider Pipeline</span>
              <button class="btn-sm outline" style="font-size:11px;padding:3px 10px" onclick="showScreen('network')">Open Pipeline →</button>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
              ${pipelineStages.map(s => `<div style="flex:1;min-width:70px;text-align:center;padding:8px 6px;background:var(--surface-hover);border-radius:8px;border:1px solid var(--border)">
                <div style="font-size:18px;font-weight:700;color:var(--blue)">${s.count}</div>
                <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${s.label}</div>
              </div>`).join("")}
            </div>
            <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Hero Provider Journey</div>
            ${pipelineTrackerHtml}
          </div>
        </div>
      </div>
      <div class="dashboard-bottom">
        <div class="section-card">
          <div class="section-card-header"><span class="section-card-title">Recent Activity</span><span class="section-card-count">Today · AI Studio</span></div>
          ${ACTIVITY.map(a => `<div class="activity-row"><div class="activity-dot" style="background:var(--${a.dot})"></div><div class="activity-body"><div class="activity-text">${a.text}</div><div class="activity-time">${a.time} · AI Studio</div></div></div>`).join("")}
        </div>
        <div class="section-card">
          <div class="section-card-header"><span class="section-card-title">Network Overview</span><span class="section-card-count">${PROVIDERS.length} providers total</span></div>
          ${PROVIDERS.map(p => {
            const stageColors = { lead:"var(--blue)", "under-review":"var(--amber)", negotiating:"var(--amber)", contracting:"#7c3aed", contracted:"var(--green)" };
            const stageLabels = { lead:"Lead", "under-review":"Under Review", negotiating:"Negotiating", contracting:"Contracting", contracted:"Contracted" };
            return `<div class="alert-row" style="cursor:pointer" onclick="${p.status!=="contracted"?`openProviderProfile('${p.id}')`:`setContractStatusFilter('All');showScreen('contracts')`}">
              <div class="alert-info">
                <div class="alert-title">${p.name}</div>
                <div class="alert-sub">${p.city} · ${p.specialty} · HPI: ${p.hpiOrgId}</div>
              </div>
              <div class="alert-meta" style="align-items:flex-end">
                <span style="font-size:10.5px;padding:2px 8px;border-radius:12px;background:${stageColors[p.status]}22;color:${stageColors[p.status]};font-weight:600;border:1px solid ${stageColors[p.status]}44;white-space:nowrap">${stageLabels[p.status]||p.status}</span>
                <div class="alert-days" style="margin-top:3px">${p.ytdSpend?`$${(p.ytdSpend/1000).toFixed(0)}k YTD`:"Not yet contracted"}</div>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>
    </div>`;
}

// ─── Screen 3: Contract Registry ──────────────────────────────────────────────

function renderContracts() {
  const statusCounts = {
    All: CONTRACTS.length,
    Active: CONTRACTS.filter(c=>c.status==="ACTIVE").length,
    Expiring: CONTRACTS.filter(c=>c.status==="EXPIRING").length,
    Negotiation: CONTRACTS.filter(c=>c.status==="NEGOTIATION").length,
  };
  const tabsHtml = ["All","Active","Expiring","Negotiation"].map(s =>
    `<button class="status-tab ${contractStatusFilter===s?"active":""}" data-filter="${s}" onclick="setContractStatusFilter('${s}')">${s} <span class="status-tab-count">${statusCounts[s]}</span></button>`
  ).join("");
  const modelOpts = ["","TIERED","FFS","MATRIX","STAIRCASE"];
  const modelLabels = {"":"All models","TIERED":"Tiered","FFS":"FFS","MATRIX":"Matrix","STAIRCASE":"Staircase"};
  const modelSelectHtml = modelOpts.map(v => `<option value="${v}" ${contractModel===v?"selected":""}>${modelLabels[v]}</option>`).join("");
  document.getElementById("screen-contracts").innerHTML = `
    <div class="screen-header">
      <div class="screen-header-top">
        <div><div class="screen-title">Contract Registry</div><div class="screen-sub">${CONTRACTS.length} contracts — click a row to view details and manage</div></div>
        <button class="btn-sm primary" onclick="showContractWizard()">+ New Contract</button>
      </div>
    </div>
    <div class="status-tabs">${tabsHtml}</div>
    <div class="filter-bar">
      <div class="search-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="contractSearchInput" value="${contractSearch}" placeholder="Search by provider, HPI code, or contract ID..." oninput="filterContracts(this.value)" /></div>
      <select class="filter-select" onchange="filterContracts(undefined,this.value)">${modelSelectHtml}</select>
    </div>
    <div class="screen-body" style="padding-top:0">
      <div class="registry-layout">
        <div class="registry-left">
          <div class="contracts-table">
            <div class="table-header">
              <div class="th">ID</div>
              <div class="th">Provider</div>
              <div class="th">HPI Code</div>
              <div class="th">Contract Type</div>
              <div class="th">Effective</div>
              <div class="th">Expiry</div>
              <div class="th">Status</div>
            </div>
            <div id="contractRows">${renderContractRows(CONTRACTS)}</div>
          </div>
        </div>
        <div class="registry-right" id="contractDetail"><div class="section-card" style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Select a contract to view details</div></div>
      </div>
    </div>`;
  filterContracts();
}

function renderContractRows(list) {
  return list.map(c => `
    <div class="table-row ${c.id===selectedContractId?"selected":""}" onclick="selectContract('${c.id}')">
      <div class="td mono">${c.id}</div>
      <div class="td" style="font-weight:500">${c.provider.replace(" Centre","").replace(" Hospital","").replace(" Surgical","")}</div>
      <div class="td mono" style="color:var(--text-muted);font-size:11px">${c.hpiOrgId}</div>
      <div class="td muted">${c.contractType}</div>
      <div class="td muted">${c.effectiveDate}</div>
      <div class="td muted">${c.expiry}</div>
      <div class="td"><span class="status-pill ${c.status.toLowerCase()}">${c.status}</span></div>
    </div>`).join("");
}

function filterContracts(search, model) {
  if (search !== undefined) contractSearch = search;
  if (model !== undefined) contractModel = model;
  const s = contractSearch.toLowerCase();
  const m = contractModel;
  const filtered = CONTRACTS.filter(c => {
    const matchesStatus = contractStatusFilter === "All"
      || (contractStatusFilter === "Active"      && c.status === "ACTIVE")
      || (contractStatusFilter === "Expiring"    && c.status === "EXPIRING")
      || (contractStatusFilter === "Negotiation" && c.status === "NEGOTIATION");
    return matchesStatus &&
      (!s || c.id.toLowerCase().includes(s) || c.provider.toLowerCase().includes(s) || c.hpiOrgId.toLowerCase().includes(s) || c.contractType.toLowerCase().includes(s)) &&
      (!m || c.model === m);
  });
  const rows = document.getElementById("contractRows");
  if (rows) rows.innerHTML = renderContractRows(filtered);
}

function setContractStatusFilter(filter) {
  contractStatusFilter = filter;
  document.querySelectorAll(".status-tab").forEach(t => {
    t.classList.toggle("active", t.dataset.filter === filter);
  });
  filterContracts();
}

function selectContract(id) {
  selectedContractId = id;
  const c = CONTRACTS.find(x => x.id === id);
  if (!c) return;
  document.querySelectorAll(".table-row").forEach(r => {
    r.classList.toggle("selected", r.getAttribute("onclick")?.includes(`'${id}'`));
  });
  const pct = Math.round((c.ytd / c.cap) * 100);
  const level = pct >= 90 ? "critical" : pct >= 75 ? "warning" : "ok";
  const days = Math.round((new Date(c.expiry) - new Date("2026-05-18")) / 86400000);
  let rateDetail = "";
  if (c.model === "TIERED") {
    rateDetail = c.tiers.map((t,i) => `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px"><span style="color:var(--text-muted)">Tier ${i+1}: ${t.from}–${t.to??"∞"}</span><strong>$${t.rate.toLocaleString()} NZD</strong></div>`).join("");
  } else if (c.model === "FFS") {
    rateDetail = `<div style="font-size:14px;font-weight:700">$${c.rate.toLocaleString()} NZD <span style="font-size:12px;font-weight:400;color:var(--text-muted)">flat fee-for-service</span></div>`;
  } else if (c.model === "STAIRCASE") {
    rateDetail = `<div style="font-size:12.5px;display:flex;flex-direction:column;gap:5px"><div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">Claims 1–${c.threshold}</span><span style="${c.ytd>=c.threshold?"text-decoration:line-through;color:var(--text-muted)":"font-weight:700"}">$${c.rateBefore.toLocaleString()}</span></div><div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:var(--text-muted)">Claims ${c.threshold+1}+</span><span style="${c.ytd>=c.threshold?"font-weight:700;color:var(--amber)":""}">$${c.rateAfter.toLocaleString()}</span></div>${c.ytd>=c.threshold?`<div style="font-size:11px;color:var(--amber);margin-top:3px;padding:3px 6px;background:var(--amber-bg);border-radius:4px">⚡ Threshold crossed at ${c.ytd} procedures</div>`:""}</div>`;
  } else if (c.model === "MATRIX") {
    rateDetail = Object.entries(c.matrix).map(([k,v]) => { const [f,cx]=k.split(":"); return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:12.5px"><span style="color:var(--text-muted)">Facility ${f} · ${cx} complexity</span><strong>$${v.toLocaleString()}</strong></div>`; }).join("");
  }
  const canSign = c.status === "NEGOTIATION";
  const signBtn = canSign
    ? `<button class="btn-sm success" onclick="sendForSignature('${c.id}')">Send for Signature</button>`
    : `<button class="btn-sm disabled" title="Already signed — contract is ${c.status}">Send for Signature</button>`;

  document.getElementById("contractDetail").innerHTML = `
    <div class="detail-panel" style="height:100%;overflow-y:auto">
      <div class="detail-header">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div>
            <div class="detail-title">${c.provider}</div>
            <div class="detail-sub">${c.id} · ${c.city}</div>
          </div>
          <span class="status-pill ${c.status.toLowerCase()}">${c.status}</span>
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-label">Identifiers</div>
        <div style="display:flex;flex-direction:column;gap:4px;font-size:12.5px">
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">HPI Org ID</span><span style="font-family:var(--font-mono);font-weight:600;color:var(--blue)">${c.hpiOrgId}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Procedure Code</span><span style="font-family:var(--font-mono);font-weight:600">${c.procedureCode}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">ACC Code</span><span style="font-family:var(--font-mono);font-weight:600">${c.accCode}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Contract Type</span><span>${c.contractType}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Relationship Owner</span><span>${c.relationshipOwner}</span></div>
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-label">Pricing · <span style="font-weight:400">${c.model}</span></div>
        ${rateDetail}
      </div>
      <div class="detail-section">
        <div class="detail-label">YTD Utilization</div>
        <div class="util-bar-wrap" style="margin-bottom:6px"><div class="util-bar" style="width:${pct}%;background:var(--${level==="ok"?"green":level==="warning"?"amber":"red"})"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:12px">
          <span style="font-weight:600">${c.ytd} of ${c.cap} procedures (${pct}%)</span>
          <span class="util-alert-badge ${level}">${level.toUpperCase()}</span>
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-label">Contract Period</div>
        <div style="font-size:12.5px;display:flex;flex-direction:column;gap:3px">
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Effective</span><span>${c.effectiveDate}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Expiry</span><strong>${c.expiry} · ${days}d remaining</strong></div>
        </div>
      </div>
      <div class="detail-section" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-sm primary" onclick="viewContractDocument('${c.id}')">View Contract</button>
        ${c.status === "ACTIVE"
          ? (true /* cosmetic — always show override for demo */
              ? `<button class="btn-sm outline" onclick="confirmOverrideEdit('${c.id}')">Override &amp; Edit</button>`
              : `<button class="btn-sm disabled" title="This contract is active and locked. Only Administrators and Senior Contract Managers can edit.">Edit Contract</button>`)
          : `<button class="btn-sm outline" onclick="openCollabEditor('${c.id}')">Edit Contract</button>`}
        <button class="btn-sm outline" onclick="showScreen('studio')">Amend in AI Studio</button>
        <button class="btn-sm outline" onclick="showSaveAsTemplateModal('${c.id}')">Save as Template</button>
        ${signBtn}
      </div>
      <div class="detail-section">
        <div class="detail-label">Version History</div>
        ${(() => {
          const vs = c.versions && c.versions.length > 0
            ? c.versions
            : [{ v: "v1.0", date: c.effectiveDate, user: c.relationshipOwner || "System", note: "Initial contract" }];
          return vs.slice().reverse().map((ver, i) => `
            <div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;${i < vs.length-1 ? "border-bottom:1px solid var(--border);" : ""}font-size:12px">
              <span style="font-family:var(--font-mono);font-weight:700;color:var(--blue);flex-shrink:0;min-width:32px">${ver.v}</span>
              <div style="flex:1;min-width:0">
                <div style="font-weight:500">${ver.note}</div>
                <div style="color:var(--text-muted);margin-top:1px">${ver.date} · ${ver.user}</div>
              </div>
            </div>`).join("");
        })()}
      </div>
    </div>`;
}

function sendForSignature(id) {
  const c = CONTRACTS.find(x => x.id === id);
  if (!c) return;
  const toast = document.createElement("div");
  toast.style.cssText = "position:fixed;bottom:24px;right:24px;background:#047857;color:white;padding:12px 18px;border-radius:10px;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.2);z-index:9999;animation:fadeUp 0.3s ease";
  toast.textContent = `✓ Sent via DocuSign — ${c.provider} will receive the signing request`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ─── Contract Document View ───────────────────────────────────────────────────

function viewContractDocument(contractId) {
  const c = CONTRACTS.find(x => x.id === contractId);
  if (!c) return;

  const existing = document.getElementById("contractDocOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "contractDocOverlay";
  overlay.className = "doc-overlay";
  overlay.innerHTML = `
    <div class="doc-modal">
      <div class="doc-modal-header">
        <div>
          <div class="doc-modal-title">${c.provider} — ${c.procedure}</div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">${c.id} · ${c.contractType} · <span class="status-pill ${c.status.toLowerCase()}" style="font-size:10px">${c.status}</span></div>
        </div>
        <div class="doc-modal-actions">
          <button class="btn-sm outline" onclick="openContractEditor('${c.id}');document.getElementById('contractDocOverlay').remove()">Edit Contract</button>
          <button class="btn-sm outline" onclick="exportContractPDF('${c.id}')">Download PDF</button>
          <button class="btn-sm ghost" style="font-size:18px;padding:2px 8px" onclick="document.getElementById('contractDocOverlay').remove()">×</button>
        </div>
      </div>
      <div class="doc-modal-body">${getContractFullText(c)}</div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

function getContractFullText(c) {
  const tier = { preferred:"Gold", platinum:"Platinum", standard:"Standard" }[c.networkTier] || c.networkTier;
  const multiplier = c.networkTier === "platinum" ? "1.2×" : c.networkTier === "preferred" ? "1.1×" : "1.0×";

  let rateScheduleHtml = "";
  if (c.model === "TIERED" && c.tiers) {
    rateScheduleHtml = `<table class="doc-rate-table"><thead><tr><th>Tier</th><th>Volume Band (procedures)</th><th>Rate (NZD)</th></tr></thead><tbody>
      ${c.tiers.map((t,i) => `<tr><td>Tier ${i+1}</td><td>${t.from}–${t.to ?? "∞"}</td><td><strong>$${t.rate.toLocaleString()}</strong></td></tr>`).join("")}
    </tbody></table>`;
  } else if (c.model === "FFS" && c.rate) {
    rateScheduleHtml = `<table class="doc-rate-table"><thead><tr><th>Model</th><th>Rate (NZD)</th></tr></thead><tbody><tr><td>Fee-for-Service (Flat Rate)</td><td><strong>$${c.rate.toLocaleString()}</strong></td></tr></tbody></table>`;
  } else if (c.model === "STAIRCASE") {
    rateScheduleHtml = `<table class="doc-rate-table"><thead><tr><th>Band</th><th>Volume</th><th>Rate (NZD)</th></tr></thead><tbody>
      <tr><td>Pre-threshold</td><td>Claims 1–${c.threshold}</td><td><strong>$${c.rateBefore.toLocaleString()}</strong></td></tr>
      <tr><td>Post-threshold</td><td>Claims ${c.threshold+1}+</td><td><strong>$${c.rateAfter.toLocaleString()}</strong></td></tr>
    </tbody></table>`;
  } else if (c.model === "MATRIX" && c.matrix) {
    rateScheduleHtml = `<table class="doc-rate-table"><thead><tr><th>Facility Class</th><th>Complexity</th><th>Rate (NZD)</th></tr></thead><tbody>
      ${Object.entries(c.matrix).map(([k,v]) => { const [f,cx]=k.split(":"); return `<tr><td>Class ${f}</td><td>${cx.charAt(0).toUpperCase()+cx.slice(1)}</td><td><strong>$${v.toLocaleString()}</strong></td></tr>`; }).join("")}
    </tbody></table>`;
  }

  const subType = c.contractSubType || "surgical-elective";

  const governingLaw = `<h2>12. Governing Law and Jurisdiction</h2>
    <p>This Agreement is governed by and construed in accordance with the laws of New Zealand. The parties submit to the exclusive jurisdiction of the New Zealand courts.</p>`;

  const privacyClause = `<h2>8. Privacy and Data Protection</h2>
    <p>Each party shall comply with the New Zealand Privacy Act 2020 and the Health Information Privacy Code 2020 in respect of all personal information (including health information) collected, held, used, or disclosed in connection with this Agreement. The Provider shall not disclose patient health information to any third party without the prior written consent of the Health Insurer, except as required by law or for the direct provision of health services.</p>
    <p>All claims data transmitted to the Health Insurer shall use FHIR R4 (NZ Base Implementation Guide) as the data exchange standard. Patient identifiers shall be transmitted using the National Health Index (NHI) number.</p>`;

  const disputeClause = `<h2>11. Dispute Resolution</h2>
    <p>Any dispute arising from or in connection with this Agreement shall first be referred to senior representatives of both parties for good-faith negotiation within 15 Business Days of written notice of dispute. If the dispute is not resolved within 30 days of such referral, either party may refer the matter to mediation, and if mediation fails, to arbitration under the Arbitration Act 1996 (NZ).</p>`;

  const complianceTags = `<div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:5px">
    <span class="tag">CoFI Act ✓</span><span class="tag">NZ Privacy Act 2020 ✓</span><span class="tag">FHIR R4 ✓</span><span class="tag">ACC Provider Registration ✓</span><span class="tag">AWS Sydney ✓</span>
  </div>`;

  const sigBlock = `<div class="doc-sig-block">
    <div>
      <div class="doc-sig-line">Signed for and on behalf of<br><strong>Health Insurer NZ</strong></div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:10px">Name: ____________________<br>Title: ____________________<br>Date: ____________________</div>
    </div>
    <div>
      <div class="doc-sig-line">Signed for and on behalf of<br><strong>${c.provider}</strong></div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:10px">Name: ____________________<br>Title: ____________________<br>Date: ____________________</div>
    </div>
  </div>`;

  if (subType === "surgical-elective") {
    return `
      <h1>Surgical Elective Services Contract</h1>
      <div style="text-align:center;color:var(--text-muted);font-size:12.5px;margin-bottom:24px">Contract Reference: ${c.id} · Version 1.0 · Effective ${c.effectiveDate}</div>
      <div class="doc-parties">
        <strong>PARTIES</strong><br>
        <strong>Health Insurer:</strong> NZ Private Health Insurer Limited, a company registered in New Zealand (NZBN: 9429000000001)<br>
        <strong>Provider:</strong> ${c.provider}, HPI Org ID: ${c.hpiOrgId}, Facility Code: ${c.hpiFacilityCode}<br>
        <strong>Procedure Code:</strong> ${c.procedureCode} · <strong>ACC Code:</strong> ${c.accCode} · <strong>Network Tier:</strong> ${tier} (${multiplier} multiplier)
      </div>
      <h2>1. Definitions</h2>
      <p><strong>"Agreement"</strong> means this Surgical Elective Services Contract, including all Schedules.<br>
      <strong>"Elective Procedure"</strong> means a planned surgical procedure performed in accordance with the procedure codes listed in Schedule 1.<br>
      <strong>"Annual Volume Cap"</strong> means the maximum number of procedures claimable per contract year, being <strong>${c.cap} procedures</strong>.<br>
      <strong>"ACC"</strong> means the Accident Compensation Corporation of New Zealand.<br>
      <strong>"NZACS"</strong> means the New Zealand Ambulatory Care Statistics procedure coding system.</p>
      <h2>2. Scope of Services</h2>
      <p>The Provider shall perform ${c.procedure} (${c.procedureCode}) and related post-operative care for patients referred by the Health Insurer. All procedures must be performed by credentialled surgeons at the Provider's HDSS-accredited facility (${c.hpiFacilityCode}).</p>
      <h2>3. Term</h2>
      <p>This Agreement commences on <strong>${c.effectiveDate}</strong> and expires on <strong>${c.expiry}</strong>, unless terminated earlier in accordance with Clause 9.</p>
      <h2>4. Rate Schedule — ${c.model} Model</h2>
      ${rateScheduleHtml}
      <p style="margin-top:10px;font-size:12.5px;color:var(--text-muted)">Rates are in NZD (inclusive of GST where applicable). Network tier multiplier <strong>${multiplier}</strong> is embedded in the rates above.</p>
      <h2>5. Volume Cap and Utilization</h2>
      <p>The Health Insurer's liability is capped at <strong>${c.cap} procedures per contract year</strong>. Claims submitted in excess of this cap will not be reimbursed unless a written cap increase is executed by both parties. The Health Insurer will provide utilization alerts when the Provider reaches 75% and 90% of the annual cap.</p>
      <h2>6. Claims Submission and Payment</h2>
      <p>The Provider shall submit all claims within 30 calendar days of the procedure date using the IQVIA TMB claims platform, with data formatted to FHIR R4 (NZ Base IG). The Health Insurer shall process valid claims within 20 Business Days of receipt. Claims must include the NHI number, procedure code, date of service, and attending surgeon's HPI CPN.</p>
      <h2>7. Quality Standards and KPIs</h2>
      <p>The Provider shall maintain: (a) a 30-day unplanned readmission rate of ≤ 2.5%; (b) surgical site infection rate aligned to the National Surgical Quality Improvement Programme (NSQIP) benchmarks; (c) patient-reported outcome measure (PROM) scores submitted quarterly using the Oxford Knee/Hip Score. Failure to meet KPIs for two consecutive quarters may trigger a Performance Improvement Plan under Clause 10.</p>
      ${privacyClause}
      <h2>9. Termination</h2>
      <p>Either party may terminate this Agreement without cause upon <strong>90 days' written notice</strong>. Either party may terminate immediately upon written notice if the other party commits a material breach that remains unremedied for 30 days after written notice, becomes insolvent, or loses its required regulatory registrations.</p>
      <h2>10. Indemnity</h2>
      <p>Each party shall indemnify, defend, and hold harmless the other party from claims arising from the indemnifying party's negligence, breach of this Agreement, or wilful misconduct. The Provider shall maintain professional indemnity insurance of no less than <strong>$5,000,000 NZD per claim</strong> throughout the Term.</p>
      ${disputeClause}
      ${governingLaw}
      ${complianceTags}
      ${sigBlock}`;
  }

  if (subType === "individual-pricing") {
    return `
      <h1>Individual Pricing Contract</h1>
      <div style="text-align:center;color:var(--text-muted);font-size:12.5px;margin-bottom:24px">Contract Reference: ${c.id} · Effective ${c.effectiveDate} · Expires ${c.expiry}</div>
      <div class="doc-parties">
        <strong>PARTIES</strong><br>
        <strong>Health Insurer:</strong> NZ Private Health Insurer Limited<br>
        <strong>Provider:</strong> ${c.provider} (HPI: ${c.hpiOrgId})<br>
        <strong>Procedure:</strong> ${c.procedure} · Code: ${c.procedureCode} · ACC: ${c.accCode}
      </div>
      <h2>1. Service Schedule</h2>
      <p>This contract governs the pricing and terms for <strong>${c.procedure}</strong> services delivered by ${c.provider} to Health Insurer members. The procedure is classified under NZACS code <strong>${c.procedureCode}</strong> and ACC funding code <strong>${c.accCode}</strong>.</p>
      <h2>2. Pricing Model — ${c.model}</h2>
      ${rateScheduleHtml}
      <h2>3. Volume Cap</h2>
      <p>The annual volume cap for this contract is <strong>${c.cap} procedures</strong>. Volume caps may be renegotiated annually subject to mutual agreement. The Health Insurer will provide utilization reporting via the IQVIA TMB portal.</p>
      <h2>4. Adjustment Mechanisms</h2>
      <p>Rates shall be subject to annual CPI adjustment based on Statistics New Zealand Consumer Price Index movements for the preceding 12-month period. CPI adjustments will take effect on the anniversary of the Commencement Date upon 30 days' written notice.</p>
      <h2>5. Network Tier</h2>
      <p>The Provider is classified as <strong>${tier} Network</strong>. The applicable multiplier of <strong>${multiplier}</strong> is reflected in the rate schedule above.</p>
      ${privacyClause}
      <h2>9. Term and Termination</h2>
      <p>Term: <strong>${c.effectiveDate}</strong> to <strong>${c.expiry}</strong>. Termination for convenience: 60 days' written notice.</p>
      ${disputeClause}
      ${governingLaw}
      ${complianceTags}
      ${sigBlock}`;
  }

  if (subType === "government") {
    return `
      <h1>Government-Funded Services Contract</h1>
      <div style="text-align:center;color:var(--text-muted);font-size:12.5px;margin-bottom:24px">Contract Reference: ${c.id} · MOH/ACC Aligned · Effective ${c.effectiveDate}</div>
      <div class="doc-parties">
        <strong>PARTIES</strong><br>
        <strong>Health Insurer:</strong> NZ Private Health Insurer Limited<br>
        <strong>Provider:</strong> ${c.provider} (HPI: ${c.hpiOrgId}) — <strong>Designated Hospital Facility</strong>
      </div>
      <h2>1. Regulatory Framework</h2>
      <p>This Agreement operates within the New Zealand public health regulatory framework, including the Pae Ora (Healthy Futures) Act 2022, the Health and Disability Commissioner Act 1994, and applicable Ministry of Health (MOH) service specifications. Where this Agreement references ACC-funded services, the applicable ACC Purchase Agreement terms apply.</p>
      <h2>2. Funding Schedule</h2>
      <p>Reimbursement for ${c.procedure} (${c.procedureCode}) is structured as a <strong>${c.model} pricing model</strong>, reflecting the complexity-adjusted funding schedule agreed with MOH for public hospital facilities.</p>
      ${rateScheduleHtml}
      <h2>3. Volume Cap and DHB Alignment</h2>
      <p>Annual cap: <strong>${c.cap} procedures</strong>. The Provider's elective surgery capacity allocation is coordinated with Te Whatu Ora Health New Zealand to avoid duplication of publicly-funded services. The Health Insurer will not fund procedures where the patient is already on a public waiting list.</p>
      <h2>4. Reporting Obligations</h2>
      <p>The Provider shall submit monthly performance reports within 10 Business Days of month end, including: (a) procedure volumes by code; (b) average length of stay; (c) unplanned readmission rates; (d) patient-reported outcomes; (e) surgical site infection rates. Reports must be submitted via IQVIA TMB in FHIR R4 format.</p>
      <h2>5. Audit Rights</h2>
      <p>The Health Insurer reserves the right to conduct or commission clinical and financial audits of the Provider's performance under this Agreement, with 10 Business Days' notice. The Provider shall maintain all clinical records for a minimum of 10 years from the date of service, consistent with the Health (Retention of Health Information) Regulations 1996.</p>
      ${privacyClause}
      <h2>9. Compliance</h2>
      <p>The Provider must maintain accreditation under the Health and Disability Services Standards (NZS 8134) throughout the Term. Loss of accreditation is grounds for immediate suspension pending review.</p>
      ${disputeClause}
      ${governingLaw}
      ${complianceTags}
      ${sigBlock}`;
  }

  return `<h1>${c.contractType}</h1><p>${c.id} · ${c.provider} · ${c.effectiveDate} – ${c.expiry}</p>${rateScheduleHtml}${sigBlock}`;
}

function exportContractPDF(contractId) {
  showToast("Generating PDF export… (DocuSign-ready version)");
}

// ─── Screen 4: Approval Queue ─────────────────────────────────────────────────

let approvalsState = APPROVALS.map(a => ({ ...a }));

function renderApprovals() {
  const pending = approvalsState.filter(a => a.status === "PENDING");
  const completed = approvalsState.filter(a => a.status !== "PENDING");
  document.getElementById("screen-approvals").innerHTML = `
    <div class="screen-header"><div class="screen-header-top"><div><div class="screen-title">Approval Queue</div><div class="screen-sub">${pending.length} item${pending.length!==1?"s":""} awaiting your review and decision</div></div></div></div>
    <div class="screen-body">
      <div class="approvals-layout">
        <div>
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:12px">Awaiting Decision (${pending.length})</div>
          ${pending.length===0?`<div class="section-card" style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">All caught up — no pending approvals.</div>`:""}
          ${pending.map(a => renderApprovalCard(a)).join("")}
          ${completed.length>0?`<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin:24px 0 12px">Completed Today (${completed.length})</div>${completed.map(a=>renderApprovalCard(a)).join("")}`:""}
        </div>
        <div>
          <div class="section-card" style="margin-bottom:16px">
            <div class="section-card-header"><span class="section-card-title">Compliance Audit Log</span></div>
            <div class="audit-log-entry"><div class="audit-icon blue"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="audit-body"><div class="audit-text">APP-002 submitted — AMD-CTR-001-001 amendment</div><div class="audit-ts">11 May 2026, 10:45 · Sarah Mitchell</div></div></div>
            <div class="audit-log-entry"><div class="audit-icon blue"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="audit-body"><div class="audit-text">APP-001 submitted — CTR-DRAFT-CHC-001 new contract</div><div class="audit-ts">11 May 2026, 09:23 · Sarah Mitchell</div></div></div>
            <div class="audit-log-entry"><div class="audit-icon green"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="audit-body"><div class="audit-text">CTR-004 renewal confirmed — Auckland Surgical</div><div class="audit-ts">28 Apr 2026, 14:12 · James Okonkwo</div></div></div>
          </div>
          <div class="section-card">
            <div class="section-card-header"><span class="section-card-title">CoFI Compliance</span></div>
            <div style="padding:14px 20px;font-size:12.5px;color:var(--text);line-height:1.6">Every approval decision is <strong>immutably logged</strong> with timestamp, approver identity, and full contract terms. Approval chain cannot be bypassed. The AI never commits — it only drafts.</div>
            <div style="padding:0 20px 14px;display:flex;gap:6px;flex-wrap:wrap"><span class="tag">CoFI Act ✓</span><span class="tag">7-year retention ✓</span><span class="tag">Human sign-off ✓</span><span class="tag">Immutable log ✓</span></div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderApprovalCard(a) {
  const isDone = a.status !== "PENDING";
  const chainHtml = a.approvers.map((role,i) => {
    const stepDone = isDone || i < a.currentStep;
    const isCurrent = !isDone && i === a.currentStep;
    return `${i>0?'<div class="chain-arrow"></div>':""}<div class="chain-step ${stepDone?"done":isCurrent?"current":""}"><div class="chain-dot ${stepDone?"done":isCurrent?"current":"pending"}"></div>${role}</div>`;
  }).join("");
  return `
    <div class="approval-card ${isDone?"done":""}" id="card-${a.id}">
      <div class="approval-card-header"><div><div style="display:flex;align-items:center;gap:8px"><span class="status-pill ${a.type==="New Contract"?"draft":"pending"}">${a.type}</span><span style="font-size:12px;color:var(--text-muted);font-family:monospace">${a.contractId}</span></div><div class="approval-card-title" style="margin-top:6px">${a.provider}</div><div class="approval-card-sub">${a.procedure}</div></div><span class="status-pill ${a.status==="PENDING"?"pending":a.status==="APPROVED"?"approved":"rejected"}">${a.status}</span></div>
      <div class="approval-card-body"><div class="approval-field"><div class="approval-field-label">Annual Value</div><div class="approval-field-value">$${a.annualValue.toLocaleString()}</div></div><div class="approval-field"><div class="approval-field-label">Model</div><div class="approval-field-value">${a.model}</div></div><div class="approval-field"><div class="approval-field-label">Submitted</div><div class="approval-field-value" style="font-size:12px">${a.submittedAt}</div></div><div class="approval-field"><div class="approval-field-label">Submitted By</div><div class="approval-field-value" style="font-size:12px">${a.submittedBy}</div></div></div>
      <div style="padding:0 20px 12px;font-size:12.5px;color:var(--text-muted)">${a.summary}</div>
      <div class="approval-chain-visual">${chainHtml}</div>
      <div class="approval-actions"><button class="btn-sm outline" onclick="showScreen('studio')">View in AI Studio</button><div class="spacer"></div>${!isDone?`<button class="btn-sm danger" onclick="rejectApproval('${a.id}')">Reject</button><button class="btn-sm success" onclick="approveApproval('${a.id}')">Approve</button>`:""}</div>
    </div>`;
}

function approveApproval(id) {
  const a = approvalsState.find(x => x.id === id);
  if (!a) return;
  if (a.currentStep < a.approvers.length - 1) { a.currentStep++; }
  else { a.status = "APPROVED"; updateApprovalBadge(); }
  renderApprovals();
}

function rejectApproval(id) {
  const a = approvalsState.find(x => x.id === id);
  if (a) { a.status = "REJECTED"; updateApprovalBadge(); }
  renderApprovals();
}

function updateApprovalBadge() {
  const pending = approvalsState.filter(a => a.status === "PENDING").length;
  const badge = document.getElementById("badgeApprovals");
  if (badge) { badge.textContent = pending; badge.style.display = pending === 0 ? "none" : ""; }
}

// ─── Screen: Network Kanban ───────────────────────────────────────────────────

function renderNetworkList() {
  const lead        = PROVIDERS.filter(p => p.status === "lead");
  const underReview = PROVIDERS.filter(p => p.status === "under-review");
  const negotiating = PROVIDERS.filter(p => p.status === "negotiating");
  const contracting = PROVIDERS.filter(p => p.status === "contracting");
  const contracted  = PROVIDERS.filter(p => p.status === "contracted");

  const cols = [
    { key:"lead",         label:"Lead",         color:"var(--blue)",   providers: lead        },
    { key:"under-review", label:"Under Review",  color:"var(--amber)",  providers: underReview },
    { key:"negotiating",  label:"Negotiating",   color:"var(--purple)", providers: negotiating },
    { key:"contracting",  label:"Contracting",   color:"var(--cyan)",   providers: contracting },
  ];

  const kanbanHtml = cols.map(col => `
    <div class="kanban-col">
      <div class="kanban-col-header">
        <span class="kanban-col-title" style="color:${col.color}">${col.label}</span>
        <span class="kanban-col-count">${col.providers.length}</span>
      </div>
      <div class="kanban-cards">
        ${col.providers.length === 0
          ? `<div class="kanban-empty">No providers at this stage</div>`
          : col.providers.map(p => `
              <div class="kanban-card" onclick="openProviderProfile('${p.id}')">
                <div class="kanban-card-name">${p.name}</div>
                <div class="kanban-card-meta">${p.specialty}</div>
                <div class="kanban-card-address">${[p.street, p.city, p.postcode].filter(Boolean).join(", ")}</div>
                <div class="kanban-card-footer">
                  <span class="tier-badge tier-${p.tier}">${p.tier.charAt(0).toUpperCase()+p.tier.slice(1)}</span>
                  <span class="kanban-card-owner">${p.relationshipOwner}</span>
                </div>
              </div>`).join("")}
      </div>
    </div>`).join("");

  const contractedCardsHtml = contracted.map(p => {
    const pContracts = CONTRACTS.filter(c => c.provider === p.name);
    const activeCount = pContracts.filter(c => c.status === "ACTIVE" || c.status === "EXPIRING").length;
    return `
      <div class="kanban-card" onclick="openProviderProfile('${p.id}')" style="cursor:pointer">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
          <div class="kanban-card-name" style="flex:1">${p.name}</div>
          <span class="status-pill contracted" style="font-size:10px;flex-shrink:0">Contracted</span>
        </div>
        <div class="kanban-card-meta">${p.city} · ${p.specialty}</div>
        <div style="font-size:11.5px;color:var(--text-muted);margin:5px 0 6px">${pContracts.length} contract${pContracts.length !== 1 ? "s" : ""} · ${activeCount} active</div>
        <div class="kanban-card-footer">
          <span class="tier-badge tier-${p.tier}">${p.tier.charAt(0).toUpperCase()+p.tier.slice(1)}</span>
          <span class="kanban-card-owner">${p.relationshipOwner}</span>
        </div>
      </div>`;
  }).join("");

  document.getElementById("screen-network").innerHTML = `
    <div class="screen-header">
      <div class="screen-header-top">
        <div>
          <div class="screen-title">Provider Network</div>
          <div class="screen-sub">${lead.length + underReview.length + negotiating.length + contracting.length} in pipeline · ${contracted.length} contracted · ${PROVIDERS.length} total providers</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn-sm primary" onclick="showAddProviderModal()">+ Add Provider</button>
        </div>
      </div>
    </div>
    <div class="stat-row" style="padding:16px 24px 0;margin:0">
      <div class="stat-card"><div class="stat-label">Lead</div><div class="stat-value blue">${lead.length}</div><div class="stat-sub">Initial pipeline</div></div>
      <div class="stat-card"><div class="stat-label">Under Review</div><div class="stat-value amber">${underReview.length}</div><div class="stat-sub">HPI + compliance check</div></div>
      <div class="stat-card"><div class="stat-label">Negotiating</div><div class="stat-value purple">${negotiating.length}</div><div class="stat-sub">Terms in discussion</div></div>
      <div class="stat-card"><div class="stat-label" style="color:var(--cyan)">Contracting</div><div class="stat-value" style="color:var(--cyan)">${contracting.length}</div><div class="stat-sub">Final sign-off</div></div>
      <div class="stat-card"><div class="stat-label" style="color:var(--green)">Contracted</div><div class="stat-value" style="color:var(--green)">${contracted.length}</div><div class="stat-sub">Active providers</div></div>
    </div>
    <div class="screen-body" style="padding-top:16px">
      <div class="kanban-board">${kanbanHtml}</div>
      ${contracted.length > 0 ? `
      <div style="margin-top:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--green)">Contracted Providers (${contracted.length})</div>
          <div class="search-box" style="width:220px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="providerRegistrySearchInput" value="${providerRegistrySearch}" placeholder="Search contracted providers..." oninput="filterProviderRegistry(this.value)" /></div>
        </div>
        <div id="contractedProviderGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">${contractedCardsHtml}</div>
      </div>` : ""}
    </div>`;
}

function showAddProviderModal() {
  const existing = document.getElementById("addProviderModal");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "addProviderModal";
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box" style="width:520px">
      <div class="modal-header">
        <div class="modal-title">Add New Provider</div>
        <span class="modal-close" onclick="document.getElementById('addProviderModal').remove()">×</span>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="grid-column:1/-1">
            <label class="form-label">Provider Type <span style="color:var(--red)">*</span></label>
            <select id="apType" class="form-input">
              <option value="">Select type...</option>
              <option>Hospital</option><option>Specialist Clinic</option><option>Allied Health</option><option>GP Practice</option><option>Diagnostic Centre</option><option>Aged Care</option><option>Surgical Centre</option>
            </select>
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">Provider Name <span style="color:var(--red)">*</span></label>
            <input id="apName" class="form-input" type="text" placeholder="e.g. North Shore Surgical Centre" />
          </div>
          <div>
            <label class="form-label">Specialty <span style="color:var(--red)">*</span></label>
            <select id="apSpecialty" class="form-input">
              <option value="">Select...</option>
              <option>Orthopaedics</option><option>Cardiology</option><option>General Surgery</option><option>Oncology</option><option>Multi-Specialty</option><option>Allied Health</option><option>Mental Health</option><option>Diagnostics</option>
            </select>
          </div>
          <div>
            <label class="form-label">Relationship Owner</label>
            <select id="apOwner" class="form-input">
              ${USERS.filter(u=>u.role!=="viewer").map(u=>`<option value="${u.name}">${u.name}</option>`).join("")}
            </select>
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">Street Address</label>
            <input id="apStreet" class="form-input" type="text" placeholder="e.g. 123 Shortland Street" />
          </div>
          <div>
            <label class="form-label">City <span style="color:var(--red)">*</span></label>
            <input id="apCity" class="form-input" type="text" placeholder="Auckland" />
          </div>
          <div>
            <label class="form-label">Postcode</label>
            <input id="apPostcode" class="form-input" type="text" placeholder="1010" maxlength="4" />
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">Region</label>
            <select id="apRegion" class="form-input">
              <option value="">Select region...</option>
              <option>Auckland</option><option>Wellington</option><option>Canterbury</option><option>Waikato</option><option>Bay of Plenty</option><option>Otago</option><option>Southland</option><option>Northland</option><option>Hawke's Bay</option><option>Nelson / Marlborough</option>
            </select>
          </div>
        </div>
        <div style="background:var(--surface-hover);border:1px solid var(--border);border-radius:6px;padding:10px 12px;font-size:12px;color:var(--text-muted)">
          <strong style="color:var(--text)">HPI Validation:</strong> The provider will be validated against the NZ Health Provider Index on save. A simulated HPI lookup will run automatically.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm outline" style="margin-right:auto" onclick="showBulkUploadTooltip(this)" title="Phase 2 — CSV bulk upload coming">⬆ Bulk Upload</button>
        <button class="btn-sm outline" onclick="document.getElementById('addProviderModal').remove()">Cancel</button>
        <button class="btn-sm outline" onclick="submitAddProvider(true)">Save & Add Another</button>
        <button class="btn-sm primary" onclick="submitAddProvider(false)">Save Provider</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function showBulkUploadTooltip(btn) {
  showToast("Bulk Upload (CSV) — Phase 2 coming soon", "#6366f1");
}

function submitAddProvider(addAnother) {
  const type     = document.getElementById("apType")?.value;
  const name     = document.getElementById("apName")?.value?.trim();
  const specialty= document.getElementById("apSpecialty")?.value;
  const owner    = document.getElementById("apOwner")?.value;
  const street   = document.getElementById("apStreet")?.value?.trim();
  const city     = document.getElementById("apCity")?.value?.trim();
  const postcode = document.getElementById("apPostcode")?.value?.trim();
  const region   = document.getElementById("apRegion")?.value;

  if (!type)     { showToast("Provider Type is required", "#ef4444"); return; }
  if (!name)     { showToast("Provider Name is required", "#ef4444"); return; }
  if (!specialty){ showToast("Specialty is required", "#ef4444"); return; }
  if (!city)     { showToast("City is required", "#ef4444"); return; }

  const newId = "PRV-" + String(PROVIDERS.length + 1).padStart(3, "0");
  const hpiId = "G" + String(Math.floor(Math.random()*99900)+100).padStart(5,"0") + "-" + String.fromCharCode(65+Math.floor(Math.random()*26));
  PROVIDERS.push({
    id: newId, name, city, type, tier: "standard", status: "lead",
    contracts: 0, hpiOrgId: hpiId, hpiFacilityCode: "F" + String(Math.floor(Math.random()*99900)+100).padStart(5,"0"),
    nzbn: "9429041" + String(Math.floor(Math.random()*1000000)).padStart(6,"0"),
    specialty, onboardingDate: new Date().toISOString().slice(0,10),
    relationshipOwner: owner,
    street, postcode, region,
    annualVolume: 0, ytdSpend: 0, hpiStatus: "Active",
    hpiExpiry: "2027-12-31",
    contact: "", contactEmail: "", contactPhone: "",
    contacts: [], complianceDocs: [], activityLog: [
      { type:"system", date: new Date().toLocaleDateString("en-NZ",{day:"2-digit",month:"short",year:"numeric"}), user:"System", description:`Provider added via manual entry — HPI simulated: ${hpiId} Active` }
    ]
  });

  renderedScreens.delete("network");
  showToast(`✓ ${name} added to pipeline as Lead`);
  if (addAnother) {
    document.getElementById("addProviderModal").remove();
    showAddProviderModal();
  } else {
    document.getElementById("addProviderModal").remove();
    showScreen("network");
  }
}

function filterProviderRegistry(search) {
  providerRegistrySearch = search || "";
  const s = providerRegistrySearch.toLowerCase();
  const contracted = PROVIDERS.filter(p => p.status === "contracted");
  const filtered = s
    ? contracted.filter(p => p.name.toLowerCase().includes(s) || p.city.toLowerCase().includes(s) || (p.specialty||"").toLowerCase().includes(s))
    : contracted;
  const grid = document.getElementById("contractedProviderGrid");
  if (!grid) return;
  grid.innerHTML = filtered.map(p => {
    const pContracts = CONTRACTS.filter(c => c.provider === p.name);
    const activeCount = pContracts.filter(c => c.status === "ACTIVE" || c.status === "EXPIRING").length;
    return `
      <div class="kanban-card" onclick="openProviderProfile('${p.id}')" style="cursor:pointer">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
          <div class="kanban-card-name" style="flex:1">${p.name}</div>
          <span class="status-pill contracted" style="font-size:10px;flex-shrink:0">Contracted</span>
        </div>
        <div class="kanban-card-meta">${p.city} · ${p.specialty}</div>
        <div style="font-size:11.5px;color:var(--text-muted);margin:5px 0 6px">${pContracts.length} contract${pContracts.length !== 1 ? "s" : ""} · ${activeCount} active</div>
        <div class="kanban-card-footer">
          <span class="tier-badge tier-${p.tier}">${p.tier.charAt(0).toUpperCase()+p.tier.slice(1)}</span>
          <span class="kanban-card-owner">${p.relationshipOwner}</span>
        </div>
      </div>`;
  }).join("") || `<div style="grid-column:1/-1;color:var(--text-muted);font-size:13px;padding:12px 0">No providers match "${providerRegistrySearch}"</div>`;
}

// ─── Screen: Provider Profile (full-page) ────────────────────────────────────

function renderProviderProfile() {
  const p = PROVIDERS.find(x => x.id === selectedProviderId);
  if (!p) { showScreen("network"); return; }

  const stageLabels = { "lead":"Lead","under-review":"Under Review","negotiating":"Negotiating","contracting":"Contracting","contracted":"Contracted" };
  const stageClasses = { "lead":"lead","under-review":"pending","negotiating":"in-negotiation","contracting":"negotiation","contracted":"contracted" };
  const stageLabel = stageLabels[p.status] || p.status;
  const stageClass = stageClasses[p.status] || "lead";
  const hpiColor = p.hpiStatus === "Active" ? "var(--green)" : p.hpiStatus === "Pending" ? "var(--amber)" : "var(--red)";
  const relatedContracts = CONTRACTS.filter(c => c.provider === p.name);
  const ytdSpendFmt = p.ytdSpend > 0 ? `$${(p.ytdSpend/1000).toFixed(0)}k NZD` : "—";
  const annualProjected = p.ytdSpend > 0 ? `$${Math.round(p.ytdSpend * 12 / 5 / 1000)}k NZD` : "—";
  const canCreateContract = p.status === "contracted";

  const contactsHtml = (p.contacts || []).map(c => `
    <tr>
      <td style="font-weight:600">${c.name}</td>
      <td style="color:var(--text-muted)">${c.role}</td>
      <td><a href="mailto:${c.email}" class="contact-email">${c.email}</a></td>
      <td style="color:var(--text-muted)">${c.phone}</td>
      <td style="text-align:center">${c.primary ? '<span class="contact-primary">★ Primary</span>' : ''}</td>
    </tr>`).join("");

  const complianceHtml = (p.complianceDocs || []).map(doc => {
    const icon = doc.status === "received" ? "✓" : doc.status === "expiring" ? "⚠" : "✗";
    const label = doc.status.charAt(0).toUpperCase() + doc.status.slice(1);
    const reqHtml = doc.required
      ? '<span style="font-size:10px;color:var(--red);font-weight:600">Required</span>'
      : '<span style="font-size:10px;color:var(--text-subtle)">Optional</span>';
    return `<tr>
      <td style="font-weight:500">${doc.name}</td>
      <td>${reqHtml}</td>
      <td><span class="doc-status-${doc.status}">${icon} ${label}</span></td>
      <td style="font-size:12px;color:var(--text-muted)">${doc.expiry || "—"}</td>
    </tr>`;
  }).join("");

  const contractsHtml = relatedContracts.length > 0
    ? relatedContracts.map(c => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12.5px">
          <div style="flex:1;min-width:0">
            <span style="font-family:var(--font-mono);color:var(--blue);font-weight:600">${c.id}</span>
            <span style="color:var(--text-muted);margin-left:8px">${c.procedure || c.contractType}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            <span class="status-pill ${c.status.toLowerCase()}" style="font-size:10px">${c.status}</span>
            <button class="btn-sm outline" style="font-size:11px;padding:3px 8px" onclick="viewContractDocument('${c.id}')">View</button>
          </div>
        </div>`).join("")
    : `<div style="font-size:12.5px;color:var(--text-muted);padding:8px 0">No contracts yet.</div>`;

  const createBtnHtml = canCreateContract
    ? `<button class="btn-sm primary" onclick="showContractWizard('${p.id}')">+ Create New Contract</button>`
    : `<button class="btn-sm disabled" title="Contract creation available after provider onboarding is complete">+ Create New Contract</button>`;

  const activityIcons = { call:"📞", email:"✉️", meeting:"🤝", note:"📝", system:"⚙️" };
  const activityHtml = [...(p.activityLog || [])].reverse().map(entry => `
    <div class="activity-entry">
      <div class="activity-icon ${entry.type}">${activityIcons[entry.type] || "·"}</div>
      <div class="activity-content">
        <div class="activity-desc">${entry.description}</div>
        <div class="activity-meta">${entry.date} · ${entry.user}</div>
      </div>
    </div>`).join("") || `<div style="padding:20px 0;text-align:center;color:var(--text-muted);font-size:12.5px">No activity logged yet.</div>`;

  document.getElementById("screen-provider-profile").innerHTML = `
    <div class="screen-header">
      <div class="screen-header-top">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn-sm outline" onclick="showScreen('network')">← Provider Network</button>
          <div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Provider Network → ${p.name}</div>
            <div class="screen-title">${p.name}</div>
            <div class="screen-sub">${p.type} · ${p.specialty}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${[p.street, p.city, p.postcode, p.region].filter(Boolean).join(", ") || p.city}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="status-pill ${stageClass}" style="font-size:11px">${stageLabel}</span>
          <span class="tier-badge tier-${p.tier}">${p.tier.charAt(0).toUpperCase()+p.tier.slice(1)} Network</span>
        </div>
      </div>
    </div>
    <div class="profile-layout">

      <div class="profile-left">

        <div class="section-card">
          <div class="section-card-header"><span class="section-card-title">HPI Registration</span><span style="font-size:11.5px;font-weight:600;color:${hpiColor}">${p.hpiStatus}${p.hpiExpiry ? " · expires "+p.hpiExpiry : ""}</span></div>
          <div style="padding:12px 18px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12.5px">
            <div><div style="color:var(--text-muted);margin-bottom:2px">HPI Org ID</div><div style="font-family:var(--font-mono);font-weight:700;color:var(--blue)">${p.hpiOrgId}</div></div>
            <div><div style="color:var(--text-muted);margin-bottom:2px">Facility Code</div><div style="font-family:var(--font-mono);font-weight:600">${p.hpiFacilityCode}</div></div>
            <div><div style="color:var(--text-muted);margin-bottom:2px">NZBN</div><div style="font-family:var(--font-mono);font-weight:600">${p.nzbn}</div></div>
            <div><div style="color:var(--text-muted);margin-bottom:2px">Relationship Owner</div><div style="font-weight:600">${p.relationshipOwner}</div></div>
            <div style="grid-column:1/-1"><div style="color:var(--text-muted);margin-bottom:2px">Address</div><div style="font-weight:600">${[p.street, p.city, p.postcode, p.region].filter(Boolean).join(", ") || "—"}</div></div>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-header">
            <span class="section-card-title">Contacts (${(p.contacts||[]).length})</span>
            <button class="btn-sm outline" style="font-size:11px;padding:3px 8px" onclick="alert('Add Contact — available in Phase 2')">+ Add Contact</button>
          </div>
          <div style="overflow-x:auto">
            <table class="contacts-table">
              <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th><th></th></tr></thead>
              <tbody>${contactsHtml}</tbody>
            </table>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-header"><span class="section-card-title">Compliance & Documents</span></div>
          <div style="overflow-x:auto">
            <table class="compliance-table">
              <thead><tr><th>Document</th><th>Required</th><th>Status</th><th>Expiry</th></tr></thead>
              <tbody>${complianceHtml}</tbody>
            </table>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-header"><span class="section-card-title">Financial Summary</span></div>
          <div style="padding:14px 18px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;font-size:12.5px">
            <div><div style="color:var(--text-muted);margin-bottom:4px">YTD Spend</div><div style="font-size:18px;font-weight:700">${ytdSpendFmt}</div></div>
            <div><div style="color:var(--text-muted);margin-bottom:4px">Annual (projected)</div><div style="font-size:18px;font-weight:700">${annualProjected}</div></div>
            <div><div style="color:var(--text-muted);margin-bottom:4px">Annual Volume</div><div style="font-size:18px;font-weight:700">${p.annualVolume > 0 ? p.annualVolume + " procedures" : "—"}</div></div>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-header">
            <span class="section-card-title">Contracts (${relatedContracts.length})</span>
            ${createBtnHtml}
          </div>
          <div style="padding:0 18px">${contractsHtml}</div>
        </div>

      </div>

      <div class="profile-right">
        <div class="section-card" style="flex:1">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
            <span class="outlook-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>
              Outlook Connected
            </span>
            <button class="btn-sm outline" style="font-size:11.5px" onclick="sendEmailToProvider('${p.id}')">Send Email</button>
          </div>
          <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:12.5px;font-weight:600">Activity Log</span>
            <button class="btn-sm primary" style="font-size:11.5px" onclick="showLogActivityModal('${p.id}')">+ Log Activity</button>
          </div>
          <div style="padding:0 16px">${activityHtml}</div>
        </div>
      </div>

    </div>`;
}

function openProviderProfile(id) {
  selectedProviderId = id;
  renderedScreens.delete("provider-profile");
  showScreen("provider-profile");
}

function sendEmailToProvider(providerId) {
  const p = PROVIDERS.find(x => x.id === providerId);
  if (!p) return;
  const primary = (p.contacts || []).find(c => c.primary) || p.contacts?.[0];
  const email = primary?.email || p.contactEmail;
  const name = primary?.name?.split(" ")[0] || "Team";
  window.location.href = `mailto:${email}?subject=Contract Edge — ${p.name}&body=Dear ${name},%0D%0A%0D%0A`;
}

function showLogActivityModal(providerId) {
  const existing = document.getElementById("logActivityModal");
  if (existing) existing.remove();
  const modal = document.createElement("div");
  modal.id = "logActivityModal";
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title">Log Activity</span>
        <span class="modal-close" onclick="document.getElementById('logActivityModal').remove()">×</span>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Activity Type</label>
          <select class="form-select" id="logActivityType">
            <option value="call">📞 Call</option>
            <option value="email">✉️ Email</option>
            <option value="meeting">🤝 Meeting</option>
            <option value="note">📝 Note</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-textarea" id="logActivityDesc" placeholder="What happened? Be specific — this goes into the immutable audit log."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm outline" onclick="document.getElementById('logActivityModal').remove()">Cancel</button>
        <button class="btn-sm primary" onclick="submitLogActivity('${providerId}')">Save Activity</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById("logActivityDesc")?.focus(), 100);
}

function submitLogActivity(providerId) {
  const p = PROVIDERS.find(x => x.id === providerId);
  if (!p) return;
  const type = document.getElementById("logActivityType")?.value || "note";
  const desc = document.getElementById("logActivityDesc")?.value.trim();
  if (!desc) { document.getElementById("logActivityDesc")?.focus(); return; }
  const today = new Date().toLocaleDateString("en-NZ", { day:"2-digit", month:"short", year:"numeric" });
  p.activityLog.push({ type, date: today, user: "Sarah Mitchell", description: desc });
  document.getElementById("logActivityModal")?.remove();
  renderedScreens.delete("provider-profile");
  renderProviderProfile();
  renderedScreens.add("provider-profile");
  showToast("Activity logged to audit trail");
}

function showToast(msg, color) {
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;bottom:24px;right:24px;background:${color||"#047857"};color:white;padding:12px 18px;border-radius:10px;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.2);z-index:9999;animation:fadeUp 0.3s ease`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// ─── Contract Editor Overlay (Chunk 6) ───────────────────────────────────────

function openContractEditor(contractId) {
  const c = CONTRACTS.find(x => x.id === contractId);
  if (!c) return;

  const existing = document.getElementById("contractEditorOverlay");
  if (existing) existing.remove();

  const linkedClauses = ["Standard Indemnity — Bilateral", "Patient Data — NZ Privacy Act 2020", "Termination for Convenience — 90 Days", "Monthly Claims Reporting Obligation"];

  const overlay = document.createElement("div");
  overlay.id = "contractEditorOverlay";
  overlay.className = "editor-overlay";

  const fullText = getContractFullText(c);

  overlay.innerHTML = `
    <div class="editor-topbar">
      <button class="btn-sm outline" onclick="document.getElementById('contractEditorOverlay').remove();showScreen('contracts')">← Contract Registry</button>
      <span class="editor-topbar-title">${c.provider} — ${c.id} · ${c.contractType}</span>
      <div style="display:flex;gap:7px">
        <button class="btn-sm outline" onclick="editorFindReplace()">Find & Replace</button>
        <button class="btn-sm outline" onclick="editorInviteCollaborate('${c.id}')">Invite to Collaborate</button>
        <button class="btn-sm primary" onclick="saveContractEditor('${c.id}')">Save</button>
      </div>
    </div>
    <div class="editor-layout">
      <div class="editor-main">
        <div class="editor-toolbar">
          <button class="editor-btn" onclick="document.execCommand('bold')" title="Bold"><strong>B</strong></button>
          <button class="editor-btn" onclick="document.execCommand('italic')" title="Italic"><em>I</em></button>
          <button class="editor-btn" onclick="document.execCommand('underline')" title="Underline"><u>U</u></button>
          <div class="editor-divider"></div>
          <button class="editor-btn" onclick="document.execCommand('insertUnorderedList')" title="List">≡ List</button>
          <button class="editor-btn" onclick="document.execCommand('formatBlock','',null,'<h2>')" title="Heading">H2</button>
          <div class="editor-divider"></div>
          <button class="editor-btn" onclick="insertClauseFromEditor()" title="Insert clause from library">+ Insert Clause</button>
          <button class="editor-btn" onclick="insertPriceTable('${c.id}')" title="Insert pricing table">+ Price Table</button>
          <div class="editor-divider"></div>
          <button class="editor-btn active" onclick="showAIAssist('${c.id}')" title="AI clause suggestions">✦ AI Assist</button>
        </div>
        <div class="editor-canvas" id="editorCanvas" contenteditable="true">${fullText}</div>
      </div>
      <div class="editor-context">
        <div class="editor-context-section" style="background:var(--surface-hover);padding:12px 16px;border-bottom:1px solid var(--border)">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px">Contract Context</div>
          <div class="editor-context-label">Contract ID</div><div class="editor-context-value" style="margin-bottom:8px;font-family:var(--font-mono);color:var(--blue)">${c.id}</div>
          <div class="editor-context-label">Provider</div><div class="editor-context-value" style="margin-bottom:8px">${c.provider}</div>
          <div class="editor-context-label">Type</div><div class="editor-context-value" style="margin-bottom:8px">${c.contractType}</div>
          <div class="editor-context-label">Term</div><div class="editor-context-value" style="margin-bottom:8px">${c.effectiveDate} → ${c.expiry}</div>
          <div class="editor-context-label">Status</div><div style="margin-bottom:0"><span class="status-pill ${c.status.toLowerCase()}" style="font-size:10px">${c.status}</span></div>
        </div>
        <div class="editor-context-section">
          <div class="editor-context-label" style="margin-bottom:8px">Linked Clauses</div>
          ${linkedClauses.map(cl => `<span class="linked-clause-chip">${cl}</span>`).join("")}
        </div>
        <div class="editor-context-section">
          <div class="editor-context-label" style="margin-bottom:8px">Approval Status</div>
          <div class="editor-context-value">${c.status === "NEGOTIATION" ? "🔄 In negotiation" : "✓ " + c.status}</div>
        </div>
        <div style="padding:12px 16px">
          <div id="aiAssistPanel" style="display:none">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--blue);margin-bottom:8px">✦ AI Suggestions</div>
            <div style="font-size:12px;color:var(--text);line-height:1.6;background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:6px;padding:10px 12px;margin-bottom:8px">
              <strong>Missing section detected:</strong> No Force Majeure clause found. Consider adding to Section 12.
            </div>
            <div style="font-size:12px;color:var(--text);line-height:1.6;background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:6px;padding:10px 12px;margin-bottom:8px">
              <strong>Rate suggestion:</strong> Current Tier 1 rate ($${c.tiers?.[0]?.rate?.toLocaleString() || c.rate?.toLocaleString() || "—"}) is 3.2% below peer average. Review against benchmarks.
            </div>
            <div style="font-size:12px;color:var(--text);line-height:1.6;background:var(--green-bg);border:1px solid rgba(22,163,74,0.2);border-radius:6px;padding:10px 12px">
              <strong>✓ Compliance:</strong> Privacy Act 2020 clause detected and current. FHIR R4 reference confirmed.
            </div>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

// ─── Collab Editor launcher ───────────────────────────────────────────────────

function openCollabEditor(contractId) {
  const c = CONTRACTS.find(x => x.id === contractId);
  if (!c) return;
  const seededIds = ["CTR-001","CTR-002","CTR-003","CTR-004","CTR-005","CTR-006","CTR-007","CTR-DRAFT"];
  if (seededIds.includes(contractId)) {
    window.open(`${COLLAB_EDITOR_URL}/contract/${contractId}`, "_blank");
  } else {
    const payload = { id:c.id, provider:c.provider, city:c.city||"", hpiOrgId:c.hpiOrgId||"", contractType:c.contractType, procedure:c.procedure||"General Services", procedureCode:c.procedureCode||"", model:c.model||"FFS", rateRange:c.rateRange||"", cap:c.cap||100, status:c.status, effectiveDate:c.effectiveDate, expiry:c.expiry, relationshipOwner:c.relationshipOwner };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    window.open(`${COLLAB_EDITOR_URL}/contract/${contractId}?data=${encodeURIComponent(encoded)}`, "_blank");
  }
}

function confirmOverrideEdit(contractId) {
  if (confirm("This contract is active and locked. Editing will be logged. Continue?")) {
    openCollabEditor(contractId);
  }
}

// ─── Contract Creation Wizard ─────────────────────────────────────────────────

function showContractWizard(prefilledProviderId) {
  const existing = document.getElementById("contractWizardModal");
  if (existing) existing.remove();
  wizardStep = 1;
  wizardData = { prefilledProviderId: prefilledProviderId || null };
  renderWizardStep();
}

function renderWizardStep() {
  const existing = document.getElementById("contractWizardModal");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "contractWizardModal";
  overlay.className = "modal-overlay";

  const steps = ["Definition","Starting Point","Review & Create"];
  const stepsHtml = steps.map((s,i) => `
    <div class="wizard-step ${wizardStep===i+1?"active":wizardStep>i+1?"done":""}">
      <div class="wizard-step-num">${wizardStep>i+1?"✓":i+1}</div>
      <div class="wizard-step-label">${s}</div>
    </div>`).join('<div class="wizard-step-line"></div>');

  let bodyHtml = "";
  if (wizardStep === 1) {
    const contractedProviders = PROVIDERS.filter(p => p.status === "contracted");
    const prefilled = wizardData.prefilledProviderId;
    bodyHtml = `
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="grid-column:1/-1">
            <label class="form-label">Provider <span style="color:var(--red)">*</span></label>
            <select id="wProvider" class="form-input" ${prefilled?"disabled":""}>
              <option value="">Select contracted provider...</option>
              ${contractedProviders.map(p => `<option value="${p.id}" ${p.id===prefilled?"selected":""}>${p.name} · ${p.city}</option>`).join("")}
            </select>
            ${prefilled?`<input type="hidden" id="wProviderHidden" value="${prefilled}" />`:""}
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">Contract Type <span style="color:var(--red)">*</span></label>
            <select id="wType" class="form-input">
              <option value="">Select type...</option>
              <option value="Master Service Agreement (MSA)">Master Service Agreement (MSA)</option>
              <option value="Individual Pricing Contract">Individual Pricing Contract</option>
              <option value="Surgical — Elective">Surgical — Elective</option>
              <option value="Government Contract">Government Contract</option>
            </select>
          </div>
          <div>
            <label class="form-label">Effective Date <span style="color:var(--red)">*</span></label>
            <input id="wEffective" class="form-input" type="date" value="${new Date().toISOString().slice(0,10)}" />
          </div>
          <div>
            <label class="form-label">Expiry Date <span style="color:var(--red)">*</span></label>
            <input id="wExpiry" class="form-input" type="date" value="${new Date(Date.now()+365*86400000).toISOString().slice(0,10)}" />
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">Relationship Owner</label>
            <select id="wOwner" class="form-input">
              ${USERS.filter(u=>u.role!=="viewer").map(u=>`<option value="${u.name}" ${u.name==="Sarah Mitchell"?"selected":""}>${u.name} — ${u.roleLabel}</option>`).join("")}
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm outline" onclick="document.getElementById('contractWizardModal').remove()">Cancel</button>
        <button class="btn-sm primary" onclick="wizardNext()">Next →</button>
      </div>`;
  } else if (wizardStep === 2) {
    bodyHtml = `
      <div class="modal-body">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px">Choose a starting point for this contract.</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <label class="wizard-option ${wizardData.startMode==="scratch"?"selected":""}" onclick="wizardSelectStart('scratch')">
            <input type="radio" name="startMode" value="scratch" ${wizardData.startMode==="scratch"?"checked":""} style="display:none">
            <div style="display:flex;gap:12px;align-items:flex-start">
              <div style="font-size:20px;flex-shrink:0">📄</div>
              <div><div style="font-size:13px;font-weight:700">Start from scratch</div><div style="font-size:12px;color:var(--text-muted)">Open a blank contract in the editor — you write the content.</div></div>
            </div>
          </label>
          ${TEMPLATES.map(t => `
          <label class="wizard-option ${wizardData.startMode==="tpl-"+t.id?"selected":""}" onclick="wizardSelectStart('tpl-${t.id}')">
            <input type="radio" name="startMode" value="tpl-${t.id}" ${wizardData.startMode==="tpl-"+t.id?"checked":""} style="display:none">
            <div style="display:flex;gap:12px;align-items:flex-start">
              <div style="font-size:20px;flex-shrink:0">📋</div>
              <div>
                <div style="display:flex;align-items:center;gap:7px;margin-bottom:2px"><div style="font-size:13px;font-weight:700">${t.name}</div><span class="model-chip ${t.model.toLowerCase()}" style="font-size:9px">${t.model}</span></div>
                <div style="font-size:12px;color:var(--text-muted)">${t.description}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${t.clauses} clauses · Used in ${t.usedIn} contracts</div>
              </div>
            </div>
          </label>`).join("")}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm outline" onclick="wizardPrev()">← Back</button>
        <button class="btn-sm outline" onclick="document.getElementById('contractWizardModal').remove()">Cancel</button>
        <button class="btn-sm primary" onclick="wizardNext()">Next →</button>
      </div>`;
  } else if (wizardStep === 3) {
    const prov = PROVIDERS.find(p => p.id === (wizardData.prefilledProviderId || document.getElementById("wProvider")?.value)) || PROVIDERS.find(p => p.id === wizardData.providerId);
    const startLabel = wizardData.startMode === "scratch" ? "Blank contract" : TEMPLATES.find(t=>"tpl-"+t.id===wizardData.startMode)?.name || wizardData.startMode;
    bodyHtml = `
      <div class="modal-body">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:12px">Review your new contract before creating it.</div>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:12.5px">
          <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">Provider</span><strong>${prov?.name || wizardData.providerName || "—"}</strong></div>
          <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">Contract Type</span><strong>${wizardData.contractType}</strong></div>
          <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">Term</span><strong>${wizardData.effectiveDate} → ${wizardData.expiry}</strong></div>
          <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">Relationship Owner</span><strong>${wizardData.owner}</strong></div>
          <div style="display:flex;justify-content:space-between;padding:7px 0"><span style="color:var(--text-muted)">Starting Point</span><strong>${startLabel}</strong></div>
        </div>
        <div style="background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:6px;padding:10px 12px;font-size:12px;color:var(--text);margin-top:12px">
          The contract will be saved as <strong>Draft</strong> and opened in the collaborative editor. You can fill in pricing and clauses from there.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm outline" onclick="wizardPrev()">← Back</button>
        <button class="btn-sm outline" onclick="document.getElementById('contractWizardModal').remove()">Cancel</button>
        <button class="btn-sm primary" onclick="submitContractWizard()">Create Contract &amp; Open Editor →</button>
      </div>`;
  }

  overlay.innerHTML = `
    <div class="modal-box" style="width:560px;max-height:90vh;overflow-y:auto">
      <div class="modal-header">
        <div class="modal-title">New Contract</div>
        <span class="modal-close" onclick="document.getElementById('contractWizardModal').remove()">×</span>
      </div>
      <div class="wizard-steps">${stepsHtml}</div>
      ${bodyHtml}
    </div>`;
  document.body.appendChild(overlay);
}

function wizardSelectStart(mode) {
  wizardData.startMode = mode;
  document.querySelectorAll(".wizard-option").forEach(el => {
    el.classList.toggle("selected", el.getAttribute("onclick")?.includes(`'${mode}'`));
  });
}

function wizardNext() {
  if (wizardStep === 1) {
    const providerId = document.getElementById("wProviderHidden")?.value || document.getElementById("wProvider")?.value;
    const contractType = document.getElementById("wType")?.value;
    const effectiveDate = document.getElementById("wEffective")?.value;
    const expiry = document.getElementById("wExpiry")?.value;
    const owner = document.getElementById("wOwner")?.value;
    if (!providerId) { showToast("Please select a provider", "#ef4444"); return; }
    if (!contractType) { showToast("Please select a contract type", "#ef4444"); return; }
    if (!effectiveDate || !expiry) { showToast("Effective and expiry dates are required", "#ef4444"); return; }
    const prov = PROVIDERS.find(p => p.id === providerId);
    Object.assign(wizardData, { providerId, providerName: prov?.name, contractType, effectiveDate, expiry, owner });
  }
  if (wizardStep === 2) {
    if (!wizardData.startMode) { showToast("Please select a starting point", "#ef4444"); return; }
  }
  wizardStep++;
  renderWizardStep();
}

function wizardPrev() {
  wizardStep = Math.max(1, wizardStep - 1);
  renderWizardStep();
}

function submitContractWizard() {
  const newId = "CTR-" + String(CONTRACTS.length + 1).padStart(3, "0");
  const prov = PROVIDERS.find(p => p.id === wizardData.providerId);
  const chosenTemplate = wizardData.startMode && wizardData.startMode !== "scratch"
    ? TEMPLATES.find(t => "tpl-" + t.id === wizardData.startMode) : null;

  const newContract = {
    id: newId,
    provider: prov?.name || wizardData.providerName,
    city: prov?.city || "",
    contractType: wizardData.contractType,
    contractSubType: "individual-pricing",
    procedure: chosenTemplate ? chosenTemplate.name : "General Services",
    hpiOrgId: prov?.hpiOrgId || "",
    procedureCode: "",
    accCode: "",
    model: chosenTemplate?.model || "FFS",
    rateRange: chosenTemplate ? `$${chosenTemplate.baseRate.toLocaleString()} base` : "TBD",
    cap: 100,
    status: "NEGOTIATION",
    effectiveDate: wizardData.effectiveDate,
    expiry: wizardData.expiry,
    ytd: 0,
    networkTier: prov?.tier || "standard",
    relationshipOwner: wizardData.owner,
    rate: chosenTemplate?.baseRate || 0,
    _fromTemplate: chosenTemplate?.name || null,
    _templateClauses: chosenTemplate?.clauseList || [],
  };
  CONTRACTS.push(newContract);
  renderedScreens.delete("contracts");
  document.getElementById("contractWizardModal").remove();
  showToast(`✓ ${newId} created as Draft — opening editor...`);
  showScreen("contracts");
  setTimeout(() => openContractEditorFromWizard(newId), 400);
}

function openContractEditorFromWizard(contractId) {
  const c = CONTRACTS.find(x => x.id === contractId);
  if (!c) return;

  const existing = document.getElementById("contractEditorOverlay");
  if (existing) existing.remove();

  const linkedClauses = c._templateClauses && c._templateClauses.length
    ? c._templateClauses
    : ["Standard Indemnity — Bilateral", "Patient Data — NZ Privacy Act 2020", "Termination for Convenience — 90 Days"];

  const overlay = document.createElement("div");
  overlay.id = "contractEditorOverlay";
  overlay.className = "editor-overlay";

  let editorContent = "";
  if (c._fromTemplate) {
    editorContent = getContractFullText(c) +
      `<h2>Applicable Clauses (from template: ${c._fromTemplate})</h2>` +
      linkedClauses.map(cl => {
        const found = CLAUSES.find(x => x.title === cl);
        return found
          ? `<h3>${found.title}</h3><p>${found.body}</p>`
          : `<h3>${cl}</h3><p><em>Clause content to be populated.</em></p>`;
      }).join("");
  } else {
    editorContent = `<h1>HEALTH SERVICES AGREEMENT</h1>
<p>Contract ID: ${c.id} &nbsp;·&nbsp; Provider: ${c.provider} &nbsp;·&nbsp; Type: ${c.contractType}</p>
<p>&nbsp;</p>
<h2>1. Parties</h2><p>This Agreement is entered into between <strong>NZ Private Health Insurer Limited</strong> and <strong>${c.provider}</strong> (HPI: ${c.hpiOrgId || "TBC"}).</p>
<h2>2. Term</h2><p>Commencement: ${c.effectiveDate} &nbsp;·&nbsp; Expiry: ${c.expiry}</p>
<h2>3. Services</h2><p><em>Describe the services to be provided under this agreement.</em></p>
<h2>4. Pricing &amp; Rates</h2><p><em>Insert rate schedule or pricing model here.</em></p>
<h2>5. Compliance &amp; Accreditation</h2><p><em>Insert compliance requirements here.</em></p>
<h2>6. Reporting &amp; Claims</h2><p><em>Insert reporting obligations here.</em></p>
<h2>7. Termination</h2><p><em>Insert termination provisions here.</em></p>`;
  }

  overlay.innerHTML = `
    <div class="editor-topbar">
      <button class="btn-sm outline" onclick="document.getElementById('contractEditorOverlay').remove();showScreen('contracts')">← Contract Registry</button>
      <span class="editor-topbar-title">${c.provider} — ${c.id} · ${c.contractType}</span>
      <div style="display:flex;gap:7px">
        <button class="btn-sm outline" onclick="editorFindReplace()">Find &amp; Replace</button>
        <button class="btn-sm outline" onclick="editorInviteCollaborate('${c.id}')">Invite to Collaborate</button>
        <button class="btn-sm primary" onclick="saveContractEditor('${c.id}')">Save</button>
      </div>
    </div>
    <div class="editor-layout">
      <div class="editor-main">
        <div class="editor-toolbar">
          <button class="editor-btn" onclick="document.execCommand('bold')" title="Bold"><strong>B</strong></button>
          <button class="editor-btn" onclick="document.execCommand('italic')" title="Italic"><em>I</em></button>
          <button class="editor-btn" onclick="document.execCommand('underline')" title="Underline"><u>U</u></button>
          <div class="editor-divider"></div>
          <button class="editor-btn" onclick="document.execCommand('insertUnorderedList')" title="List">≡ List</button>
          <button class="editor-btn" onclick="document.execCommand('formatBlock','',null,'<h2>')" title="Heading">H2</button>
          <div class="editor-divider"></div>
          <button class="editor-btn" onclick="insertClauseFromEditor()" title="Insert clause from library">+ Insert Clause</button>
          <button class="editor-btn" onclick="insertPriceTable('${c.id}')" title="Insert pricing table">+ Price Table</button>
          <div class="editor-divider"></div>
          <button class="editor-btn active" onclick="showAIAssist('${c.id}')" title="AI clause suggestions">✦ AI Assist</button>
        </div>
        <div class="editor-canvas" id="editorCanvas" contenteditable="true">${editorContent}</div>
      </div>
      <div class="editor-context">
        <div class="editor-context-section" style="background:var(--surface-hover);padding:12px 16px;border-bottom:1px solid var(--border)">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px">Contract Context</div>
          <div class="editor-context-label">Contract ID</div><div class="editor-context-value" style="margin-bottom:8px;font-family:var(--font-mono);color:var(--blue)">${c.id}</div>
          <div class="editor-context-label">Provider</div><div class="editor-context-value" style="margin-bottom:8px">${c.provider}</div>
          <div class="editor-context-label">Type</div><div class="editor-context-value" style="margin-bottom:8px">${c.contractType}</div>
          <div class="editor-context-label">Term</div><div class="editor-context-value" style="margin-bottom:8px">${c.effectiveDate} → ${c.expiry}</div>
          <div class="editor-context-label">Status</div><div style="margin-bottom:0"><span class="status-pill negotiation" style="font-size:10px">DRAFT</span></div>
        </div>
        <div class="editor-context-section">
          <div class="editor-context-label" style="margin-bottom:8px">${c._fromTemplate ? "Template Clauses" : "Linked Clauses"}</div>
          ${linkedClauses.map(cl => `<span class="linked-clause-chip">${cl}</span>`).join("")}
        </div>
        <div class="editor-context-section">
          <div class="editor-context-label" style="margin-bottom:4px">Starting Point</div>
          <div class="editor-context-value">${c._fromTemplate ? `📋 ${c._fromTemplate}` : "📄 Blank contract"}</div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

// ─── Insert Clause Search Panel ───────────────────────────────────────────────

function insertClauseFromEditor() {
  showInsertClausePanel();
}

function showInsertClausePanel() {
  const existing = document.getElementById("clauseSearchPanel");
  if (existing) { existing.remove(); return; }
  const panel = document.createElement("div");
  panel.id = "clauseSearchPanel";
  panel.className = "modal-overlay";
  panel.innerHTML = `
    <div class="modal-box" style="width:580px;max-height:80vh;display:flex;flex-direction:column">
      <div class="modal-header">
        <div class="modal-title">Insert Clause</div>
        <span class="modal-close" onclick="document.getElementById('clauseSearchPanel').remove()">×</span>
      </div>
      <div style="padding:12px 18px;border-bottom:1px solid var(--border)">
        <div class="search-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="clausePanelSearch" placeholder="Search clauses by title, category, or tag..." oninput="filterClausePanel(this.value)" autofocus />
        </div>
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
          <button class="status-tab active" data-cat="All" onclick="filterClausePanel('',this)" style="font-size:11.5px;padding:3px 10px">All</button>
          ${[...new Set(CLAUSES.map(c=>c.category))].map(cat=>`<button class="status-tab" data-cat="${cat}" onclick="filterClausePanel('',this)" style="font-size:11.5px;padding:3px 10px">${cat}</button>`).join("")}
        </div>
      </div>
      <div id="clausePanelList" style="flex:1;overflow-y:auto;padding:12px 18px;display:flex;flex-direction:column;gap:8px">
        ${renderClausePanelItems(CLAUSES)}
      </div>
    </div>`;
  document.body.appendChild(panel);
}

function renderClausePanelItems(list) {
  if (!list.length) return `<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">No clauses match your search.</div>`;
  return list.map(cl => `
    <div class="clause-panel-item" onclick="insertClauseSelected('${cl.id}')">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div style="font-size:13px;font-weight:700">${cl.title}</div>
        <span class="status-pill ${cl.status==="approved"?"active":"pending"}" style="font-size:10px;flex-shrink:0">${cl.status}</span>
      </div>
      <div style="font-size:11.5px;color:var(--text-muted);margin-bottom:5px">${cl.category} · ${cl.version} · Reviewed ${cl.lastReviewed}</div>
      <div style="font-size:12px;color:var(--text);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${cl.body}</div>
      <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">${cl.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div>
    </div>`).join("");
}

let clausePanelCategoryFilter = "All";
function filterClausePanel(search, btn) {
  if (btn) {
    clausePanelCategoryFilter = btn.dataset.cat;
    document.querySelectorAll("#clauseSearchPanel .status-tab").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("clausePanelSearch").value = "";
    search = "";
  }
  const s = (search || document.getElementById("clausePanelSearch")?.value || "").toLowerCase();
  const filtered = CLAUSES.filter(cl => {
    const matchCat = clausePanelCategoryFilter === "All" || cl.category === clausePanelCategoryFilter;
    const matchSearch = !s || cl.title.toLowerCase().includes(s) || cl.category.toLowerCase().includes(s) || cl.tags.some(t=>t.includes(s));
    return matchCat && matchSearch;
  });
  const list = document.getElementById("clausePanelList");
  if (list) list.innerHTML = renderClausePanelItems(filtered);
}

function insertClauseSelected(clauseId) {
  const cl = CLAUSES.find(c => c.id === clauseId);
  if (!cl) return;
  const canvas = document.getElementById("editorCanvas");
  if (canvas) {
    canvas.focus();
    document.execCommand("insertHTML", false, `<h2>${cl.title}</h2><p>${cl.body}</p>`);
  }
  document.getElementById("clauseSearchPanel")?.remove();
  showToast("Clause inserted: " + cl.title);
}

// ─── Save as Template ─────────────────────────────────────────────────────────

function showSaveAsTemplateModal(contractId) {
  const c = CONTRACTS.find(x => x.id === contractId);
  if (!c) return;
  const existing = document.getElementById("saveTemplateModal");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "saveTemplateModal";
  overlay.className = "modal-overlay";
  const suggestedName = `${c.contractType} — ${c.provider}`;
  overlay.innerHTML = `
    <div class="modal-box" style="width:480px">
      <div class="modal-header">
        <div class="modal-title">Save as Template</div>
        <span class="modal-close" onclick="document.getElementById('saveTemplateModal').remove()">×</span>
      </div>
      <div class="modal-body">
        <div>
          <label class="form-label">Template Name <span style="color:var(--red)">*</span></label>
          <input id="tplName" class="form-input" type="text" value="${suggestedName}" placeholder="e.g. Surgical Elective — Standard Tiered" />
        </div>
        <div>
          <label class="form-label">Category <span style="color:var(--red)">*</span></label>
          <select id="tplCategory" class="form-input">
            <option value="Surgical" ${c.contractType?.includes("Surgical")?"selected":""}>Surgical</option>
            <option value="Specialist">Specialist</option>
            <option value="Government" ${c.contractType?.includes("Government")?"selected":""}>Government</option>
            <option value="Allied Health">Allied Health</option>
            <option value="Mental Health">Mental Health</option>
            <option value="Diagnostics">Diagnostics</option>
          </select>
        </div>
        <div>
          <label class="form-label">Short Description</label>
          <textarea id="tplDesc" class="form-input" rows="2" placeholder="Optional — describe when to use this template..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm outline" onclick="document.getElementById('saveTemplateModal').remove()">Cancel</button>
        <button class="btn-sm primary" onclick="submitSaveAsTemplate('${contractId}')">Save Template</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function submitSaveAsTemplate(contractId) {
  const name     = document.getElementById("tplName")?.value?.trim();
  const category = document.getElementById("tplCategory")?.value;
  const desc     = document.getElementById("tplDesc")?.value?.trim();
  if (!name) { showToast("Template name is required", "#ef4444"); return; }
  const c = CONTRACTS.find(x => x.id === contractId);
  const newTpl = {
    id: "TPL-" + String(TEMPLATES.length + 1).padStart(3, "0"),
    name, category,
    description: desc || `Contract template based on ${c?.provider || contractId}.`,
    tags: [category.toLowerCase().replace(/ /g,"-"), c?.model?.toLowerCase() || "ffs"],
    model: c?.model || "FFS",
    baseRate: c?.rate || (c?.tiers?.[0]?.rate) || 0,
    clauses: 6, lastUpdated: new Date().toLocaleDateString("en-NZ",{month:"short",year:"numeric"}), usedIn: 1,
    applicableTo: "All providers",
    pricingNote: "Based on " + (c?.contractType || "standard contract") + " pricing.",
    clauseList: []
  };
  TEMPLATES.push(newTpl);
  renderedScreens.delete("templates");
  renderedScreens.delete("admin");
  document.getElementById("saveTemplateModal").remove();
  showToast(`✓ Template "${name}" saved — visible in Template Repository`);
}

function insertPriceTable(contractId) {
  const c = CONTRACTS.find(x => x.id === contractId);
  if (!c) return;
  const canvas = document.getElementById("editorCanvas");
  if (!canvas) return;
  let tableHtml = `<h2>Schedule 1 — Rate Schedule</h2><table style="width:100%;border-collapse:collapse;font-size:13px;margin:10px 0">
    <thead><tr style="background:#f4f4f5"><th style="padding:7px 12px;border:1px solid #e4e4e7;text-align:left">Band</th><th style="padding:7px 12px;border:1px solid #e4e4e7;text-align:right">Rate (NZD)</th></tr></thead><tbody>`;
  if (c.tiers) {
    c.tiers.forEach((t,i) => { tableHtml += `<tr><td style="padding:7px 12px;border:1px solid #e4e4e7">Tier ${i+1}: ${t.from}–${t.to??"∞"} procedures</td><td style="padding:7px 12px;border:1px solid #e4e4e7;text-align:right;font-weight:600">$${t.rate.toLocaleString()}</td></tr>`; });
  } else if (c.rate) {
    tableHtml += `<tr><td style="padding:7px 12px;border:1px solid #e4e4e7">Flat FFS Rate</td><td style="padding:7px 12px;border:1px solid #e4e4e7;text-align:right;font-weight:600">$${c.rate.toLocaleString()}</td></tr>`;
  }
  tableHtml += `</tbody></table>`;
  canvas.focus();
  document.execCommand("insertHTML", false, tableHtml);
  showToast("Price table inserted");
}

function showAIAssist(contractId) {
  const panel = document.getElementById("aiAssistPanel");
  if (panel) { panel.style.display = panel.style.display === "none" ? "block" : "none"; }
}

function editorFindReplace() {
  const find = prompt("Find text:");
  if (!find) return;
  const replace = prompt(`Replace "${find}" with:`);
  if (replace === null) return;
  const canvas = document.getElementById("editorCanvas");
  if (!canvas) return;
  canvas.innerHTML = canvas.innerHTML.split(escapeHtml(find)).join(escapeHtml(replace))
    .split(find).join(replace);
  showToast(`Replaced all instances of "${find}"`);
}

function editorInviteCollaborate(contractId) {
  openCollabEditor(contractId);
  showToast("Collab editor opened in new tab — share the URL with your colleague");
}

function saveContractEditor(contractId) {
  const c = CONTRACTS.find(x => x.id === contractId);
  if (c) {
    if (!c.versions) c.versions = [{ v: "v1.0", date: c.effectiveDate, user: c.relationshipOwner || "System", note: "Initial contract" }];
    const nextNum = c.versions.length + 1;
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-NZ", { day:"2-digit", month:"short", year:"numeric" });
    c.versions.push({ v: `v1.${nextNum}`, date: dateStr, user: "Sarah Mitchell", note: "Manual edit via Contract Editor" });
    if (selectedContractId === contractId) selectContract(contractId);
  }
  document.getElementById("contractEditorOverlay")?.remove();
  showToast(`Contract ${contractId} saved — v1.${c?.versions?.length || 1} logged to audit trail`);
}

// ─── Screen 6: Clause Library ─────────────────────────────────────────────────

function renderClauseLibrary() {
  const categories = ["All", ...new Set(CLAUSES.map(c => c.category))];
  const filtered = clauseCategory === "All" ? CLAUSES : CLAUSES.filter(c => c.category === clauseCategory);

  document.getElementById("screen-clauses").innerHTML = `
    <div class="screen-header">
      <div class="screen-header-top">
        <div><div class="screen-title">Clause Library</div><div class="screen-sub">Pre-approved legal building blocks — click a clause to read the full text</div></div>
        <button class="btn-sm primary" onclick="alert('Add Clause — available in Phase 2 with full legal workflow')">+ Add Clause</button>
      </div>
    </div>
    <div class="screen-body">
      <div class="clause-layout">
        <div class="clause-sidebar">
          ${categories.map(cat => {
            const count = cat === "All" ? CLAUSES.length : CLAUSES.filter(c=>c.category===cat).length;
            return `<button class="clause-cat-btn ${clauseCategory===cat?"active":""}" onclick="setClauseCategory('${cat}')"><span>${cat}</span><span class="clause-cat-count">${count}</span></button>`;
          }).join("")}
          <div style="margin-top:12px;padding:10px 12px;background:rgba(37,99,235,0.06);border:1px solid rgba(37,99,235,0.15);border-radius:8px;font-size:11.5px;color:var(--blue);line-height:1.5">
            <strong>8 clauses</strong> in library<br><span style="color:var(--text-muted)">7 approved · 1 under review</span>
          </div>
        </div>
        <div class="clause-list">
          ${filtered.map(cl => `
            <div class="clause-card ${expandedClauseId===cl.id?"expanded":""}" onclick="toggleClause('${cl.id}')">
              <div class="clause-card-header">
                <div class="clause-card-meta">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
                    <span class="clause-status-${cl.status}">${cl.status==="approved"?"Approved":"Under Review"}</span>
                    <span style="font-size:11px;color:var(--text-muted);font-family:monospace">${cl.id} · ${cl.version}</span>
                  </div>
                  <div class="clause-card-title">${cl.title}</div>
                  <div class="clause-card-sub">${cl.category} · Last reviewed ${cl.lastReviewed}</div>
                  <div class="clause-tags">${cl.tags.map(t=>`<span class="clause-tag">${t}</span>`).join("")}</div>
                </div>
                <div class="clause-expand-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
              <div class="clause-card-body">${escapeHtml(cl.body)}</div>
              ${expandedClauseId===cl.id?`<div class="clause-card-footer"><button class="btn-sm primary" onclick="event.stopPropagation();alert('Insert into draft — connects to AI Studio in Phase 2')">Insert into Draft</button><button class="btn-sm outline" onclick="event.stopPropagation()">Copy Text</button></div>`:""}
            </div>`).join("")}
        </div>
      </div>
    </div>`;
}

function setClauseCategory(cat) {
  clauseCategory = cat;
  expandedClauseId = null;
  renderedScreens.delete("clauses");
  renderClauseLibrary();
  renderedScreens.add("clauses");
}

function toggleClause(id) {
  expandedClauseId = expandedClauseId === id ? null : id;
  renderedScreens.delete("clauses");
  renderClauseLibrary();
  renderedScreens.add("clauses");
}

// ─── Screen: Pricing Configuration (Chunk 7) ────────────────────────────────

let pricingSelectedCode = "NZACS-1471";
let pricingModel = "TIERED";
let pricingBaseRate = 4200;
let pricingTiers = [{ from:1, to:50, rate:4200 }, { from:51, to:100, rate:3900 }, { from:101, to:null, rate:3600 }];
let pricingProviderTier = "preferred";

function renderPricingConfig() {
  const categories = ["All", ...new Set(PRICING_SCHEDULES.map(p => p.category))];
  const multiplier = pricingProviderTier === "platinum" ? 1.2 : pricingProviderTier === "preferred" ? 1.1 : 1.0;
  const selected = PRICING_SCHEDULES.find(p => p.code === pricingSelectedCode) || PRICING_SCHEDULES[0];

  const previewRows = (() => {
    const volumes = [25, 50, 75, 100, 150];
    return volumes.map(vol => {
      let rate = pricingBaseRate;
      if (pricingModel === "TIERED") {
        for (const t of pricingTiers) { if (vol >= t.from && (t.to === null || vol <= t.to)) { rate = t.rate; break; } }
      }
      const total = Math.round(rate * multiplier * vol);
      return `<tr>
        <td>${vol} procedures</td>
        <td>$${Math.round(rate * multiplier).toLocaleString()} NZD</td>
        <td style="font-weight:600">$${total.toLocaleString()} NZD</td>
      </tr>`;
    }).join("");
  })();

  const tierRowsHtml = pricingTiers.map((t, i) => `
    <div class="tier-row" id="tierRow${i}">
      <input class="form-input" type="number" value="${t.from}" placeholder="From" onchange="pricingTiers[${i}].from=+this.value;refreshPricingPreview()" />
      <div class="tier-sep">to</div>
      <input class="form-input" type="number" value="${t.to ?? ''}" placeholder="∞" onchange="pricingTiers[${i}].to=this.value?+this.value:null;refreshPricingPreview()" />
      <input class="form-input" type="number" value="${t.rate}" placeholder="Rate $" onchange="pricingTiers[${i}].rate=+this.value;refreshPricingPreview()" style="min-width:80px;max-width:120px" />
      <button class="btn-sm ghost" style="padding:3px 7px;color:var(--red)" onclick="pricingTiers.splice(${i},1);renderedScreens.delete('pricing-config');renderPricingConfig();renderedScreens.add('pricing-config')">✕</button>
    </div>`).join("");

  document.getElementById("screen-pricing-config").innerHTML = `
    <div class="screen-header">
      <div class="screen-header-top">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn-sm outline" onclick="goBack()">← Back</button>
          <div>
            <div class="screen-title">Pricing Configuration</div>
            <div class="screen-sub">Set procedure rates, choose a pricing model, and preview the live calculation</div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn-sm disabled" data-tip-title="Phase 2 Feature" data-tip-desc="Excel-based pricing import will be available in Phase 2 — upload a spreadsheet of CPT/ICD rates and they will be automatically validated and mapped.">↑ Import from Excel — Phase 2</button>
          <button class="btn-sm primary" onclick="savePricingToContract()">Save to Contract</button>
        </div>
      </div>
    </div>
    <div class="pricing-layout">

      <div class="pricing-form">

        <div class="section-card">
          <div class="section-card-header"><span class="section-card-title">Procedure</span></div>
          <div style="padding:14px 18px;display:flex;flex-direction:column;gap:10px">
            <div class="form-group">
              <label class="form-label">Search by CPT / NZACS Code or Name</label>
              <select class="form-select" id="procedureSelect" onchange="pricingSelectedCode=this.value;pricingBaseRate=PRICING_SCHEDULES.find(p=>p.code===this.value)?.baseRate||0;document.getElementById('baseRateInput').value=pricingBaseRate;refreshPricingPreview()">
                ${categories.filter(c=>c!=="All").map(cat => `
                  <optgroup label="${cat}">
                    ${PRICING_SCHEDULES.filter(p=>p.category===cat).map(p =>
                      `<option value="${p.code}" ${p.code===pricingSelectedCode?"selected":""}>${p.code} — ${p.name} (suggested $${p.baseRate.toLocaleString()})</option>`
                    ).join("")}
                  </optgroup>`).join("")}
              </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="form-group">
                <label class="form-label">Base Rate (NZD)</label>
                <input class="form-input" type="number" id="baseRateInput" value="${pricingBaseRate}" onchange="pricingBaseRate=+this.value;if(pricingModel==='FFS'){pricingTiers=[{from:1,to:null,rate:pricingBaseRate}];}else{pricingTiers[0]&&(pricingTiers[0].rate=pricingBaseRate);}refreshPricingPreview()" />
              </div>
              <div class="form-group">
                <label class="form-label">Network Tier Multiplier</label>
                <select class="form-select" onchange="pricingProviderTier=this.value;refreshPricingPreview()">
                  <option value="standard"  ${pricingProviderTier==="standard" ?"selected":""}>Standard — 1.0×</option>
                  <option value="preferred" ${pricingProviderTier==="preferred"?"selected":""}>Gold (Preferred) — 1.1×</option>
                  <option value="platinum"  ${pricingProviderTier==="platinum" ?"selected":""}>Platinum — 1.2×</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-header"><span class="section-card-title">Pricing Model</span></div>
          <div style="padding:14px 18px;display:flex;flex-direction:column;gap:12px">
            <div class="pricing-model-grid">
              ${["FFS","TIERED","MATRIX","STAIRCASE"].map(m => `
                <div class="pricing-model-option ${pricingModel===m?"selected":""}" onclick="pricingModel='${m}';if('${m}'==='FFS'){pricingTiers=[{from:1,to:null,rate:pricingBaseRate}];}else if('${m}'==='TIERED'&&pricingTiers.length<2){pricingTiers=[{from:1,to:50,rate:pricingBaseRate},{from:51,to:100,rate:Math.round(pricingBaseRate*0.93)},{from:101,to:null,rate:Math.round(pricingBaseRate*0.86)}];}renderedScreens.delete('pricing-config');renderPricingConfig();renderedScreens.add('pricing-config')">
                  <div style="font-weight:700;font-size:12px">${m}</div>
                  <div style="font-size:10.5px;color:var(--text-subtle);margin-top:2px">${{FFS:"Flat rate",TIERED:"Volume bands",MATRIX:"Complexity grid",STAIRCASE:"Threshold drop"}[m]}</div>
                </div>`).join("")}
            </div>
            ${pricingModel === "TIERED" ? `
              <div>
                <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:var(--text-muted);margin-bottom:8px;display:grid;grid-template-columns:70px 70px 1fr 28px;gap:6px"><span>From</span><span>To (∞=no cap)</span><span>Rate (NZD)</span><span></span></div>
                <div id="tierRowsContainer">${tierRowsHtml}</div>
                <button class="btn-sm outline" style="margin-top:8px;font-size:11.5px" onclick="pricingTiers.push({from:pricingTiers.length?pricingTiers[pricingTiers.length-1].to+1||1:1,to:null,rate:Math.round(pricingBaseRate*0.85)});renderedScreens.delete('pricing-config');renderPricingConfig();renderedScreens.add('pricing-config')">+ Add Tier Band</button>
              </div>` : ""}
            ${pricingModel === "STAIRCASE" ? `
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                <div class="form-group"><label class="form-label">Threshold (procedures)</label><input class="form-input" type="number" value="100" id="staircaseThreshold" onchange="refreshPricingPreview()" /></div>
                <div class="form-group"><label class="form-label">Post-threshold Rate (NZD)</label><input class="form-input" type="number" value="${Math.round(pricingBaseRate*0.85)}" id="staircaseAfter" onchange="refreshPricingPreview()" /></div>
              </div>` : ""}
            ${pricingModel === "FFS" ? `<div style="font-size:12.5px;color:var(--text-muted)">Flat fee-for-service — every procedure billed at the same rate regardless of volume.</div>` : ""}
            ${pricingModel === "MATRIX" ? `<div style="font-size:12.5px;color:var(--text-muted)">Matrix pricing by facility class × complexity. Configure full matrix in the contract editor after saving.</div>` : ""}
          </div>
        </div>

      </div>

      <div class="pricing-preview">
        <div class="section-card">
          <div class="section-card-header"><span class="section-card-title">Live Calculation Preview</span><span class="section-card-count">${selected?.name || pricingSelectedCode}</span></div>
          <div style="padding:12px 18px">
            <div style="font-size:11.5px;color:var(--text-muted);margin-bottom:10px">Effective rate = base × ${multiplier.toFixed(1)}× (${pricingProviderTier} tier multiplier)</div>
            <table class="preview-calc-table" id="previewCalcTable">
              <thead><tr><th>Volume</th><th>Effective Rate</th><th>Total Payout</th></tr></thead>
              <tbody>${previewRows}</tbody>
            </table>
          </div>
        </div>
        <div class="section-card">
          <div class="section-card-header"><span class="section-card-title">Selected Procedure</span></div>
          <div style="padding:12px 18px;font-size:12.5px;display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Code</span><span style="font-family:var(--font-mono);font-weight:700;color:var(--blue)">${selected?.code}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Name</span><span style="font-weight:600">${selected?.name}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Category</span><span>${selected?.category}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Unit</span><span>${selected?.unit}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Suggested Base</span><span style="font-weight:600">$${selected?.baseRate?.toLocaleString()} NZD</span></div>
            ${selected?.accCode ? `<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">ACC Code</span><span style="font-family:var(--font-mono)">${selected.accCode}</span></div>` : ""}
          </div>
        </div>
      </div>

    </div>`;
}

function refreshPricingPreview() {
  renderedScreens.delete("pricing-config");
  renderPricingConfig();
  renderedScreens.add("pricing-config");
}

function savePricingToContract() {
  showToast(`Pricing saved — ${pricingSelectedCode} · ${pricingModel} model · rates locked`);
  goBack();
}

// ─── Screen: Template Repository ─────────────────────────────────────────────

function renderTemplateRepository() {
  const categories = ["All", ...new Set(TEMPLATES.map(t => t.category))];
  const filtered = templateCategory === "All" ? TEMPLATES : TEMPLATES.filter(t => t.category === templateCategory);
  const selected = selectedTemplateId ? TEMPLATES.find(t => t.id === selectedTemplateId) : null;

  document.getElementById("screen-templates").innerHTML = `
    <div class="screen-header">
      <div class="screen-header-top">
        <div><div class="screen-title">Template Repository</div><div class="screen-sub">${TEMPLATES.length} contract type templates — select a category, then click to view full detail</div></div>
        <button class="btn-sm primary" onclick="alert('New Template — available in Phase 2 with legal workflow')">+ New Template</button>
      </div>
    </div>
    <div class="screen-body">
      <div class="template-layout">
        <div class="template-sidebar">
          ${categories.map(cat => {
            const count = cat === "All" ? TEMPLATES.length : TEMPLATES.filter(t=>t.category===cat).length;
            return `<button class="template-cat-btn ${templateCategory===cat?"active":""}" onclick="setTemplateCategory('${cat}')"><span>${cat}</span><span class="template-cat-count">${count}</span></button>`;
          }).join("")}
          <div style="margin-top:14px;padding:10px;background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:6px;font-size:11.5px;color:var(--blue);line-height:1.6">
            <strong>${TEMPLATES.reduce((s,t)=>s+t.usedIn,0)} deployments</strong><br><span style="color:var(--text-muted)">across active contracts</span>
          </div>
        </div>
        <div class="template-main">
          ${selected ? `
            <div class="template-detail">
              <div class="template-detail-header">
                <div>
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                    <span class="model-chip ${selected.model.toLowerCase()}">${selected.model}</span>
                    <span style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">${selected.id}</span>
                  </div>
                  <div class="template-detail-title">${selected.name}</div>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                  <button class="btn-sm primary" onclick="showScreen('studio')">Use as Template</button>
                  <button class="btn-sm outline" onclick="selectedTemplateId=null;renderTemplateRepository()">← Back</button>
                </div>
              </div>
              <div class="template-detail-body">
                <div class="template-detail-section">
                  <div class="template-detail-section-title">Description</div>
                  <p style="font-size:13px;color:var(--text);line-height:1.6;margin-bottom:10px">${selected.description}</p>
                  <div style="font-size:12px;color:var(--text-muted)">Applicable to: <strong style="color:var(--text)">${selected.applicableTo}</strong></div>
                </div>
                <div class="template-detail-section">
                  <div class="template-detail-section-title">Tags</div>
                  <div style="display:flex;flex-wrap:wrap;gap:4px">${selected.tags.map(t=>`<span class="template-tag">${t}</span>`).join("")}</div>
                </div>
                <div class="template-detail-section">
                  <div class="template-detail-section-title">Pricing Model</div>
                  <div style="background:var(--surface-hover);border:1px solid var(--border);border-radius:6px;padding:12px 14px;font-size:12.5px;line-height:1.7">
                    <div style="margin-bottom:6px"><strong>Model:</strong> ${selected.model} · <strong>Base Rate:</strong> $${selected.baseRate.toLocaleString()} NZD</div>
                    <div style="color:var(--text-muted)">${selected.pricingNote}</div>
                  </div>
                </div>
                <div class="template-detail-section">
                  <div class="template-detail-section-title">Pre-Approved Clauses (${selected.clauses})</div>
                  <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;overflow:hidden">
                    ${selected.clauseList.map((cl,i) => `
                      <div class="clause-list-item" style="padding:8px 14px">
                        <div class="clause-list-num">${i+1}</div>
                        <div style="font-size:12.5px;color:var(--text)">${cl}</div>
                      </div>`).join("")}
                  </div>
                </div>
                <div class="template-detail-section">
                  <div style="display:flex;gap:8px">
                    <button class="btn-sm primary" onclick="showScreen('studio')">Use as Template in AI Studio</button>
                    <button class="btn-sm outline" onclick="showScreen('clauses')">View Clause Library</button>
                  </div>
                </div>
              </div>
            </div>
          ` : `
            <div>
              <div class="template-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" placeholder="Search templates..." oninput="filterTemplates(this.value)" />
              </div>
              <div class="template-grid" id="templateGrid">
                ${renderTemplateCards(filtered)}
              </div>
            </div>
          `}
        </div>
      </div>
    </div>`;
}

function renderTemplateCards(list) {
  return list.map(t => `
    <div class="template-card ${selectedTemplateId===t.id?"active":""}" onclick="selectTemplate('${t.id}')">
      <div class="template-card-header">
        <div class="template-card-meta">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
            <span class="model-chip ${t.model.toLowerCase()}">${t.model}</span>
            <span style="font-size:10.5px;color:var(--text-muted);font-family:var(--font-mono)">${t.id}</span>
          </div>
          <div class="template-card-title">${t.name}</div>
          <div class="template-card-sub" style="margin-top:3px">${t.description.substring(0,70)}…</div>
          <div class="template-card-tags">${t.tags.slice(0,4).map(tg=>`<span class="template-tag">${tg}</span>`).join("")}</div>
        </div>
      </div>
      <div class="template-card-stats">
        <div class="template-stat"><div class="template-stat-label">Base Rate</div><div class="template-stat-value">$${t.baseRate.toLocaleString()}</div></div>
        <div class="template-stat"><div class="template-stat-label">Clauses</div><div class="template-stat-value">${t.clauses}</div></div>
        <div class="template-stat"><div class="template-stat-label">Used In</div><div class="template-stat-value">${t.usedIn} ctr</div></div>
        <div class="template-stat"><div class="template-stat-label">Updated</div><div class="template-stat-value">${t.lastUpdated}</div></div>
      </div>
    </div>`).join("");
}

function selectTemplate(id) {
  selectedTemplateId = id;
  renderedScreens.delete("templates");
  renderTemplateRepository();
  renderedScreens.add("templates");
}

function setTemplateCategory(cat) {
  templateCategory = cat;
  selectedTemplateId = null;
  renderedScreens.delete("templates");
  renderTemplateRepository();
  renderedScreens.add("templates");
}

function filterTemplates(search) {
  const s = search.toLowerCase();
  const base = templateCategory === "All" ? TEMPLATES : TEMPLATES.filter(t => t.category === templateCategory);
  const filtered = !s ? base : base.filter(t =>
    t.name.toLowerCase().includes(s) || t.category.toLowerCase().includes(s) ||
    t.tags.some(tg => tg.includes(s)) || t.model.toLowerCase().includes(s)
  );
  const grid = document.getElementById("templateGrid");
  if (grid) grid.innerHTML = renderTemplateCards(filtered);
}

// ─── Screen 8: Negotiation & Redlining ───────────────────────────────────────

function renderNegotiation() {
  const statusLabel = { "in-progress": "In Progress", "awaiting-response": "Awaiting Response", "complete": "Complete" };
  const statusClass = { "in-progress": "draft", "awaiting-response": "pending", "complete": "approved" };

  document.getElementById("screen-negotiation").innerHTML = `
    <div class="screen-header">
      <div class="screen-header-top">
        <div><div class="screen-title">Negotiation & Redlining</div><div class="screen-sub">${NEGOTIATIONS.length} active negotiations — click to review tracked changes and accept or reject each item</div></div>
      </div>
    </div>
    <div class="screen-body">
      <div class="neg-layout">
        <div class="neg-list">
          ${NEGOTIATIONS.map(neg => `
            <div class="neg-card ${selectedNegotiationId===neg.id?"selected":""}" onclick="selectNegotiation('${neg.id}')">
              <div class="neg-card-title">${neg.provider}</div>
              <div class="neg-card-sub">${neg.procedure} · ${neg.contractId}</div>
              <div class="neg-card-meta">
                <span class="neg-round-badge">Round ${neg.round}</span>
                <span class="status-pill ${statusClass[neg.status]}" style="font-size:10px">${statusLabel[neg.status]}</span>
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:6px">${neg.changes.length} changes · Last activity ${neg.lastActivity}</div>
            </div>`).join("")}
        </div>
        <div class="neg-detail">
          ${selectedNegotiationId
            ? renderNegotiationDetail(NEGOTIATIONS.find(n => n.id === selectedNegotiationId))
            : `<div class="section-card" style="padding:40px;text-align:center;color:var(--text-muted);font-size:13px">Select a negotiation to review tracked changes</div>`}
        </div>
      </div>
    </div>`;
}

function renderNegotiationDetail(neg) {
  if (!neg) return "";
  const pendingCount  = neg.changes.filter(c => c.status === "pending").length;
  const acceptedCount = neg.changes.filter(c => c.status === "accepted").length;
  const rejectedCount = neg.changes.filter(c => c.status === "rejected").length;
  const allResolved   = pendingCount === 0;

  const collabBar = `
    <div class="collab-bar">
      <span class="collab-label">Active</span>
      <div class="collab-avatars">
        ${neg.collaborators.map(col => `<div class="collab-avatar ${col.online?"online":""}" title="${col.name} · ${col.role}${col.online?" (online)":""}">${col.initials}</div>`).join("")}
      </div>
      <span class="collab-status">${neg.collaborators.filter(c=>c.online).length} online · ${neg.collaborators.length} participants</span>
      <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">Round ${neg.round} · Last activity ${neg.lastActivity}</span>
    </div>`;

  const voteBar = `
    <div class="vote-bar">
      <span class="vote-label">Team vote:</span>
      <span class="vote-approve">✓ ${neg.votes.approve} approve</span>
      <span class="vote-reject">✗ ${neg.votes.reject} reject</span>
      <span class="vote-pending">${neg.votes.pending} pending</span>
    </div>`;

  return `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="section-card" style="overflow:hidden">
        ${collabBar}
        <div class="section-card-header">
          <div>
            <div style="font-size:13px;font-weight:700">${neg.provider}</div>
            <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">${neg.contractType} · ${neg.hpiOrgId} · ${neg.contractId}</div>
          </div>
          <div style="display:flex;gap:8px;font-size:11.5px;align-items:center">
            <span style="color:var(--amber);font-weight:600">${pendingCount} pending</span>
            <span style="color:var(--green);font-weight:600">${acceptedCount} accepted</span>
            <span style="color:var(--red);font-weight:600">${rejectedCount} rejected</span>
          </div>
        </div>
        ${neg.changes.map(ch => `
          <div class="change-row">
            <div class="change-row-header">
              <div class="change-field">${ch.field}</div>
              ${ch.status==="pending"
                ? `<div class="change-actions">
                    <span class="change-proposer">${ch.proposedBy}</span>
                    <button class="btn-sm danger" onclick="resolveChange('${neg.id}','${ch.id}','rejected')">Reject</button>
                    <button class="btn-sm success" onclick="resolveChange('${neg.id}','${ch.id}','accepted')">Accept</button>
                   </div>`
                : `<span class="change-status-${ch.status}">${ch.status==="accepted"?"✓ Accepted":"✗ Rejected"}</span>`}
            </div>
            <div class="change-diff">
              <div class="change-from"><strong>Was:</strong> ${ch.from}</div>
              <div class="change-arrow">→</div>
              <div class="change-to"><strong>Proposed:</strong> ${ch.to}</div>
            </div>
            <div class="change-note">${ch.note}</div>
          </div>`).join("")}
        ${voteBar}
      </div>
      <div style="display:flex;gap:8px">
        ${allResolved
          ? `<button class="btn-sm success" onclick="showScreen('approvals')">Submit for Approval →</button>`
          : `<button class="btn-sm primary" onclick="alert('Send counter-proposal — available in Phase 2 full negotiation workflow')">Send Counter-Proposal</button>`}
        <button class="btn-sm outline" onclick="exportRedlinePDF('${neg.id}')">Export Redline PDF</button>
      </div>
    </div>`;
}

function selectNegotiation(id) {
  selectedNegotiationId = id;
  renderedScreens.delete("negotiation");
  renderNegotiation();
  renderedScreens.add("negotiation");
}

function resolveChange(negId, changeId, resolution) {
  const neg = NEGOTIATIONS.find(n => n.id === negId);
  const change = neg?.changes.find(c => c.id === changeId);
  if (change) change.status = resolution;
  renderedScreens.delete("negotiation");
  renderNegotiation();
  renderedScreens.add("negotiation");
}

function exportRedlinePDF(negId) {
  const neg = NEGOTIATIONS.find(n => n.id === negId);
  if (!neg) return;
  showToast(`Redline PDF exported — ${neg.contractId} · ${neg.changes.length} tracked changes · Round ${neg.round}`, "#1e40af");
}

// ─── Screen: Integrations & API ──────────────────────────────────────────────

function renderIntegrations() {
  document.getElementById("screen-integrations").innerHTML = `
    <div class="screen-header">
      <div class="screen-header-top">
        <div><div class="screen-title">Integrations & API</div><div class="screen-sub">External system connections — data flows in and out of the CLM automatically</div></div>
      </div>
    </div>
    <div class="screen-body">
      <div class="stat-row" style="grid-template-columns:repeat(3,1fr);max-width:480px;margin-bottom:24px">
        <div class="stat-card"><div class="stat-label">Connected</div><div class="stat-value green">${INTEGRATIONS.filter(i=>i.status==="connected").length}</div><div class="stat-sub">Live integrations</div></div>
        <div class="stat-card"><div class="stat-label">Disconnected</div><div class="stat-value amber">${INTEGRATIONS.filter(i=>i.status==="disconnected").length}</div><div class="stat-sub">Requires setup</div></div>
        <div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">${INTEGRATIONS.length}</div><div class="stat-sub">Configured</div></div>
      </div>
      <div class="integrations-grid">
        ${INTEGRATIONS.map(int => `
          <div class="integration-card">
            <div class="integration-card-header">
              <div>
                <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">
                  <div class="integration-status-dot ${int.status}"></div>
                  <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${int.status==="connected"?"#047857":"#b45309"}">${int.status==="connected"?"Connected":"Disconnected"}</span>
                </div>
                <div class="integration-name">${int.name}</div>
                <div class="integration-category">${int.category}</div>
              </div>
              <div class="integration-card-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
              </div>
            </div>
            <div class="integration-desc">${int.description}</div>
            <div class="integration-footer">
              <span style="font-size:11px;color:var(--text-muted)">Last sync: ${int.lastSync}</span>
              <button class="btn-sm ${int.status==="connected"?"outline":"primary"}" style="font-size:11px;padding:4px 10px" onclick="alert('${int.status==="connected"?"Configure "+int.name+" — settings in Phase 2":"Connect "+int.name+" — setup wizard in Phase 2"}')">
                ${int.status==="connected"?"Configure":"Connect"}
              </button>
            </div>
          </div>`).join("")}
      </div>
      <div style="margin-top:20px">
        <div class="section-card">
          <div class="section-card-header"><span class="section-card-title">API Access</span><span class="section-card-count">REST + FHIR R4</span></div>
          <div style="padding:18px 20px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px">Base URL</div><div style="font-family:monospace;font-size:12px;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--blue)">https://api.contractedge.healthinsurer.co.nz/v1</div></div>
            <div><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px">Authentication</div><div style="font-family:monospace;font-size:12px;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text-muted)">OAuth 2.0 / SAML 2.0</div></div>
            <div><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px">Data Standard</div><div style="font-size:13px;color:var(--text)">FHIR R4 · NZ Base IG · HL7</div></div>
            <div><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px">Hosting</div><div style="font-size:13px;color:var(--text)">AWS Sydney · NZ data residency ✓</div></div>
          </div>
          <div style="padding:0 20px 16px;display:flex;gap:6px;flex-wrap:wrap"><span class="tag">CoFI Act ✓</span><span class="tag">NZ Privacy Act ✓</span><span class="tag">FHIR R4 ✓</span><span class="tag">AWS Sydney ✓</span><span class="tag">WCAG 2.1 AA ✓</span></div>
        </div>
      </div>
    </div>`;
}

function toggleAdminSubnav() {
  const subnav = document.getElementById("adminSubnav");
  const chevron = document.getElementById("adminChevron");
  if (!subnav) return;
  const open = subnav.classList.toggle("open");
  if (chevron) chevron.style.transform = open ? "rotate(180deg)" : "";
}

function showAdmin(section) {
  adminSection = section || "users";
  const subnav = document.getElementById("adminSubnav");
  const chevron = document.getElementById("adminChevron");
  if (subnav && !subnav.classList.contains("open")) {
    subnav.classList.add("open");
    if (chevron) chevron.style.transform = "rotate(180deg)";
  }
  document.querySelectorAll(".nav-sub-item").forEach(el => {
    el.classList.toggle("active", el.dataset.admin === adminSection);
  });
  renderedScreens.delete("admin");
  showScreen("admin");
}

// ─── Screen: Admin Panel ─────────────────────────────────────────────────────

function renderAdmin() {
  const sectionLabels = { users:"User Management", templates:"Template Repository", clauses:"Clause Library", pricing:"Pricing Repository", roles:"Rules & Role Permissions", settings:"System Settings" };
  const subLabel = sectionLabels[adminSection] || "User Management";

  let bodyHtml = "";
  if (adminSection === "users") {
    bodyHtml = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-size:13px;color:var(--text-muted)">${USERS.length} users · ${USERS.filter(u=>u.status==="active").length} active</div>
        <button class="btn-sm outline">+ Invite User</button>
      </div>
      <div class="users-section">
        <div class="users-table-header">
          <div class="users-th">Name</div><div class="users-th">Email</div><div class="users-th">Role</div><div class="users-th">Status</div><div class="users-th">Last Login</div>
        </div>
        ${USERS.map(u => `
          <div class="user-row">
            <div class="user-row-name"><div class="user-initials" style="background:${u.avatarColor}">${u.initials}</div>${u.name}</div>
            <div class="user-row-email">${u.email}</div>
            <div class="user-row-role"><span class="status-pill ${u.role==="admin"?"negotiation":u.role==="senior_contract_manager"?"draft":u.role==="contract_manager"?"active":"lead"}" style="font-size:10px">${u.roleLabel}</span></div>
            <div><span class="user-status-${u.status}">${u.status==="active"?"● Active":"● Inactive"}</span></div>
            <div class="user-row-last">${u.lastLogin}</div>
          </div>`).join("")}
      </div>
      <div class="admin-section-title" style="margin-top:24px">Contract Manager Assignments</div>
      <div class="section-card" style="overflow:hidden">
        <div class="users-table-header" style="grid-template-columns:2fr 1.5fr 100px 120px">
          <div class="users-th">Provider</div><div class="users-th">Contract Manager</div><div class="users-th">Contracts</div><div class="users-th">Stage</div>
        </div>
        ${PROVIDERS.map(p => {
          const sl = p.status==="contracted"?"Contracted":p.status==="negotiating"?"Negotiating":p.status==="under-review"?"Under Review":p.status==="contracting"?"Contracting":"Lead";
          const sc = p.status==="contracted"?"contracted":p.status==="negotiating"||p.status==="contracting"?"in-negotiation":p.status==="under-review"?"pending":"lead";
          return `<div class="user-row" style="grid-template-columns:2fr 1.5fr 100px 120px">
            <div class="user-row-name" style="gap:8px"><div style="width:7px;height:7px;border-radius:50%;background:${p.status==="contracted"?"var(--green)":p.status==="lead"?"var(--blue)":"var(--amber)"};flex-shrink:0"></div><span style="font-weight:600">${p.name}</span></div>
            <div class="user-row-email">${p.relationshipOwner}</div>
            <div style="font-size:12.5px">${p.contracts} contract${p.contracts!==1?"s":""}</div>
            <div><span class="status-pill ${sc}" style="font-size:10px">${sl}</span></div>
          </div>`;
        }).join("")}
      </div>`;
  } else if (adminSection === "templates") {
    bodyHtml = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-size:13px;color:var(--text-muted)">${TEMPLATES.length} templates · ${new Set(TEMPLATES.map(t=>t.category)).size} categories</div>
        <button class="btn-sm primary" onclick="showScreen('templates')">Open Full Repository →</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${TEMPLATES.map(t => `
          <div class="section-card" style="flex:1;min-width:240px;padding:14px 16px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span class="model-chip ${t.model.toLowerCase()}" style="font-size:10px">${t.model}</span>
              <span style="font-size:13px;font-weight:700">${t.name}</span>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${t.description}</div>
            <div style="font-size:11.5px;color:var(--text-muted)">${t.clauses} clauses · Used in ${t.usedIn} contracts · Updated ${t.lastUpdated}</div>
          </div>`).join("")}
      </div>`;
  } else if (adminSection === "clauses") {
    bodyHtml = `
      <div style="margin-bottom:16px;font-size:13px;color:var(--text-muted)">${CLAUSES.length} clauses · <button class="btn-sm outline" style="display:inline-flex" onclick="showScreen('clauses')">Open Clause Library →</button></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${CLAUSES.map(cl => `
          <div class="section-card" style="padding:12px 16px;display:flex;align-items:center;gap:12px">
            <span class="status-pill ${cl.status==="approved"?"active":"pending"}" style="font-size:10px;flex-shrink:0">${cl.status}</span>
            <div style="flex:1"><div style="font-size:13px;font-weight:600">${cl.title}</div><div style="font-size:11.5px;color:var(--text-muted)">${cl.category} · ${cl.version} · Reviewed ${cl.lastReviewed}</div></div>
            <div style="font-size:11px;color:var(--text-muted)">${cl.tags.map(tag=>`<span class="tag">${tag}</span>`).join("")}</div>
          </div>`).join("")}
      </div>`;
  } else if (adminSection === "pricing") {
    bodyHtml = `
      <div style="margin-bottom:16px;font-size:13px;color:var(--text-muted)">${PRICING_SCHEDULES.length} procedure codes loaded</div>
      <div class="section-card" style="overflow:hidden">
        <div class="users-table-header" style="grid-template-columns:100px 2fr 1.5fr 1fr">
          <div class="users-th">Code</div><div class="users-th">Procedure</div><div class="users-th">Category</div><div class="users-th">Base Rate</div>
        </div>
        ${PRICING_SCHEDULES.map(p => `
          <div class="user-row" style="grid-template-columns:100px 2fr 1.5fr 1fr">
            <div style="font-family:var(--font-mono);font-size:11.5px;font-weight:700;color:var(--blue)">${p.code}</div>
            <div style="font-size:12.5px;font-weight:500">${p.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">${p.category}</div>
            <div style="font-size:12.5px;font-weight:600">$${p.baseRate.toLocaleString()} NZD</div>
          </div>`).join("")}
      </div>`;
  } else if (adminSection === "roles") {
    bodyHtml = `
      <div style="margin-bottom:16px;font-size:13px;color:var(--text-muted)">Role definitions are read-only in this demo. Real-time RBAC enforcement is Phase 2.</div>
      <div class="admin-grid">
        ${ROLES.map(role => `
          <div class="role-card">
            <div class="role-card-header">
              <div class="role-color-dot" style="background:${role.color}"></div>
              <div class="role-name">${role.name}</div>
              <div class="role-user-count">${role.userCount} user${role.userCount!==1?"s":""}</div>
            </div>
            <div class="perm-list">
              ${role.permissions.map(p => `<div class="perm-tag ${p.allowed?"allowed":"denied"}">${p.name}</div>`).join("")}
            </div>
          </div>`).join("")}
      </div>`;
  } else if (adminSection === "settings") {
    bodyHtml = `
      <div class="section-card" style="margin-bottom:16px">
        <div style="padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div><div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text);margin-bottom:5px">Audit Log Retention</div><div style="font-size:13px;font-weight:600">7 Years</div><div style="font-size:11.5px;color:var(--text-muted)">CoFI Act compliant · Immutable</div></div>
          <div><div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text);margin-bottom:5px">Data Residency</div><div style="font-size:13px;font-weight:600">AWS Sydney</div><div style="font-size:11.5px;color:var(--text-muted)">NZ data residency law compliant</div></div>
          <div><div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text);margin-bottom:5px">Authentication</div><div style="font-size:13px;font-weight:600">OAuth 2.0 / SAML 2.0</div><div style="font-size:11.5px;color:var(--text-muted)">SSO ready · MFA enforced</div></div>
          <div><div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text);margin-bottom:5px">API Standard</div><div style="font-size:13px;font-weight:600">FHIR R4 · NZ Base IG</div><div style="font-size:11.5px;color:var(--text-muted)">HL7 · NZ Health Provider Index</div></div>
        </div>
        <div style="padding:0 20px 14px;display:flex;gap:6px;flex-wrap:wrap">
          <span class="tag">WCAG 2.1 AA ✓</span><span class="tag">NZ Privacy Act 2020 ✓</span><span class="tag">CoFI Act ✓</span><span class="tag">AWS Sydney ✓</span>
        </div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><span class="section-card-title">CoFI & Audit Compliance</span></div>
        <div style="padding:14px 18px;font-size:12.5px;color:var(--text);line-height:1.7">
          Every action in Contract Edge is <strong>immutably logged</strong> with the user's identity, role, timestamp, and full record state.
          Role changes and user provisioning are captured in the audit trail with 7-year retention. No admin action can bypass the log.
        </div>
        <div style="padding:0 18px 14px;display:flex;gap:6px;flex-wrap:wrap">
          <span class="tag">CoFI Act ✓</span><span class="tag">7-year retention ✓</span><span class="tag">Immutable log ✓</span><span class="tag">Role-based access ✓</span><span class="tag">NZ Privacy Act ✓</span>
        </div>
      </div>`;
  }

  document.getElementById("screen-admin").innerHTML = `
    <div class="screen-header">
      <div class="screen-header-top">
        <div>
          <div class="screen-title">Admin — ${subLabel}</div>
          <div class="screen-sub">Administration · ${subLabel}</div>
        </div>
      </div>
    </div>
    <div class="screen-body">${bodyHtml}</div>`;
}

// ─── Contract Preview ─────────────────────────────────────────────────────────

function renderContractPreview(draft, awaitingConfirm, financialImpact) {
  document.getElementById("emptyState").style.display = "none";
  const card = document.getElementById("contractCard");
  card.style.display = "block";

  const isAmendment = !!draft.amendment_id;
  const isRenewal   = !!draft.renewal_id;

  const statusText = draft.status || "NEGOTIATION — Awaiting Confirmation";
  let statusClass = "contract-status";
  if (statusText.includes("ACTIVE"))    statusClass += " active";
  if (statusText.includes("CONFIRMED")) statusClass += " confirmed";
  if (statusText.includes("REJECTED"))  statusClass += " rejected";

  let title    = draft.provider_name || draft.provider_id || "";
  let subtitle = isAmendment ? `Amendment ${draft.amendment_id} · ${draft.procedure_name || ""}`
    : isRenewal ? `Renewal ${draft.renewal_id} · ${draft.procedure_name || ""}`
    : `${(draft.procedure_codes || []).join(", ")} · Contract: ${draft.contract_id}`;

  let pricingModel = isAmendment ? (draft.original_terms?.pricing_model || "")
    : isRenewal ? (draft.baseline_terms?.pricing_model || "") : (draft.pricing_model || "");

  const networkTier = draft.network_tier || draft.baseline_terms?.network_tier || "preferred";
  const sections = [];

  if (!isAmendment) {
    sections.push(`<div class="contract-section"><div class="section-label">Provider</div><div class="hpi-badge">✓ HPI Validated — Registration ACTIVE · NZ HPI (FHIR R4)</div><div class="network-tier-badge tier-${networkTier.toLowerCase()}" style="margin-top:5px">${networkTier.toUpperCase()} NETWORK</div></div>`);
  }

  sections.push(`<div class="contract-section"><div class="section-label">Pricing Model</div><div class="pricing-model-badge">${pricingModel.toUpperCase()}</div></div>`);

  if (isAmendment) {
    sections.push(`<div class="contract-section"><div class="section-label">Original Rates</div><div class="rate-table">${renderRateSummaryText(draft.original_terms?.rate_summary)}</div></div><div class="contract-section"><div class="section-label">Proposed Changes ↓</div><div class="rate-table">${renderProposedChanges(draft.proposed_changes)}</div></div>`);
    if (draft.reason) sections.push(`<div class="contract-section"><div class="section-label">Reason</div><div class="amendment-note">${draft.reason}</div></div>`);
    if (draft.effective_date) sections.push(`<div class="contract-section"><div class="section-label">Effective Date</div><div class="value-pill">${draft.effective_date}</div></div>`);
  } else if (isRenewal) {
    const bl = draft.baseline_terms || {};
    sections.push(`<div class="contract-section"><div class="section-label">Baseline Rates</div><div class="rate-table">${renderRateSummaryText(bl.rate_summary)}</div></div><div class="contract-section"><div class="section-label">Volume Cap</div><div class="value-pill">${bl.annual_cap || "—"} procedures / year</div></div><div class="contract-section"><div class="section-label">Current Expiry</div><div class="value-pill expiring">${draft.current_expiry || "—"}</div></div><div class="contract-section"><div class="section-label">Proposed New Term</div><div class="value-pill">${draft.proposed_start} → ${draft.proposed_end}</div></div>`);
  } else {
    sections.push(`<div class="contract-section"><div class="section-label">Rate Schedule</div><div class="rate-table">${renderRateSchedule(draft.pricing_model, draft.rate_schedule)}</div></div><div class="contract-section"><div class="section-label">Volume Cap</div><div class="value-pill">${draft.volume_cap} procedures / year</div></div><div class="contract-section"><div class="section-label">Contract Period</div><div class="value-pill">${draft.start_date} → ${draft.end_date}</div></div>`);
  }

  if (financialImpact && !financialImpact.error) {
    const delta = financialImpact.annual_delta;
    const dir = financialImpact.delta_direction || (delta < 0 ? "saving" : "increase");
    sections.push(`<div class="contract-section"><div class="section-label">Financial Impact</div><div class="financial-impact ${dir}"><div>Current annual cost: <strong>$${(financialImpact.current_annual_cost||0).toLocaleString()}</strong></div><div>Proposed annual cost: <strong>$${(financialImpact.proposed_annual_cost||0).toLocaleString()}</strong></div><div class="delta">Annual ${dir}: <strong>$${Math.abs(delta).toLocaleString()}</strong></div><div class="fi-note">${financialImpact.note||""}</div></div></div>`);
  }

  if (!isAmendment && !isRenewal && (draft.approval_route||[]).length > 0) {
    const chainHtml = draft.approval_route.map((role,i) => (i>0?'<span class="arrow">→</span>':"") + `<div class="approver-badge">${role}</div>`).join("");
    sections.push(`<div class="contract-section"><div class="section-label">Approval Required</div><div class="approval-chain">${chainHtml}</div></div>`);
  }

  sections.push(`<div class="contract-section"><div class="section-label">Compliance</div><div class="compliance-tags"><span class="tag">CoFI Act ✓</span><span class="tag">NZ Privacy Act ✓</span><span class="tag">FHIR R4 ✓</span><span class="tag">AWS Sydney ✓</span></div></div>`);

  card.innerHTML = `
    <div id="contractStatus" class="${statusClass}">${statusText}</div>
    <div class="contract-title">${title}</div>
    <div class="contract-subtitle">${subtitle}</div>
    ${sections.join("")}
    <div class="contract-footer">
      <div class="audit-note">${draft.audit_note || "AI-generated — all values sourced from Rules Engine and HPI. No data was invented."}</div>
      <div class="confirm-actions" id="confirmActions" style="display:${awaitingConfirm?"flex":"none"}">
        <button class="btn-reject" onclick="rejectContract()">Reject</button>
        <button class="btn-confirm" onclick="confirmContract()">Confirm &amp; Submit for Approval</button>
      </div>
    </div>`;

  document.getElementById("previewHint").textContent = isAmendment
    ? "Amendment draft ready — review changes and confirm"
    : isRenewal ? "Renewal draft ready — review terms and confirm"
    : "Draft ready — review and confirm below";
}

function renderRateSchedule(model, schedule) {
  if (!schedule) return '<div class="rate-row"><span class="rate-tier">No rate schedule</span></div>';
  if (model === "tiered" && schedule.tiers) {
    return schedule.tiers.map((t,i) => `<div class="rate-row"><span class="rate-tier">Tier ${i+1}: ${t.from}–${t.to??"∞"} procedures</span><span class="rate-amount">$${Number(t.rate).toLocaleString()} NZD</span></div>`).join("");
  }
  if (model === "ffs" || (schedule.rate !== undefined && !schedule.threshold)) {
    return `<div class="rate-row"><span class="rate-tier">Fixed rate (Fee-for-Service)</span><span class="rate-amount">$${Number(schedule.rate).toLocaleString()} NZD</span></div>`;
  }
  if (model === "staircase" && schedule.threshold !== undefined) {
    const ytd = schedule.ytd_volume || 0;
    const flipped = ytd >= schedule.threshold;
    const staircaseMsg = flipped
      ? `⚡ Threshold CROSSED — ${ytd} procedures YTD. Rate locked at $${Number(schedule.rate_after).toLocaleString()} for remainder of year.`
      : `${ytd} of ${schedule.threshold} procedures — threshold not yet reached`;
    return `<div class="rate-row${flipped?"":" rate-row-active"}"><span class="rate-tier">Claims 1–${schedule.threshold} <em>(pre-threshold)</em></span><span class="rate-amount${flipped?" rate-crossed":""}">$${Number(schedule.rate_before).toLocaleString()} NZD</span></div><div class="rate-row${flipped?" rate-row-active":""}"><span class="rate-tier">Claims ${schedule.threshold+1}+ <em>(post-threshold)</em></span><span class="rate-amount">$${Number(schedule.rate_after).toLocaleString()} NZD</span></div><div class="staircase-status${flipped?" flipped":""}">${staircaseMsg}</div>`;
  }
  if (model === "matrix" && schedule.values) {
    return Object.entries(schedule.values).map(([key,rate]) => { const [f,cx]=key.split(":"); return `<div class="rate-row"><span class="rate-tier">Facility ${f} · ${cx} complexity</span><span class="rate-amount">$${Number(rate).toLocaleString()} NZD</span></div>`; }).join("");
  }
  return '<div class="rate-row"><span class="rate-tier">See contract for rate details</span></div>';
}

function renderRateSummaryText(summary) {
  if (!summary) return '<div class="rate-row"><span class="rate-tier">—</span></div>';
  return `<div class="rate-row"><span class="rate-tier">${summary}</span></div>`;
}

function renderProposedChanges(changes) {
  if (!changes) return '<div class="rate-row"><span class="rate-tier">No changes specified</span></div>';
  if (changes.tiers) return changes.tiers.map((t,i) => `<div class="rate-row proposed-row"><span class="rate-tier">Tier ${i+1}: ${t.from}–${t.to??"∞"} procedures</span><span class="rate-amount">$${Number(t.rate).toLocaleString()} NZD</span></div>`).join("");
  if (changes.rate !== undefined) return `<div class="rate-row proposed-row"><span class="rate-tier">New flat rate</span><span class="rate-amount">$${Number(changes.rate).toLocaleString()} NZD</span></div>`;
  if (changes.annual_cap !== undefined) return `<div class="rate-row proposed-row"><span class="rate-tier">New volume cap</span><span class="rate-amount">${changes.annual_cap} procedures/year</span></div>`;
  return `<div class="rate-row proposed-row"><span class="rate-tier">${escapeHtml(JSON.stringify(changes))}</span></div>`;
}

function confirmContract() {
  document.getElementById("contractStatus").textContent = "CONFIRMED — Submitted for Approval";
  document.getElementById("contractStatus").className = "contract-status confirmed";
  document.getElementById("confirmActions").style.display = "none";
  document.getElementById("previewHint").textContent = "Submitted for approval";
  appendAIMessage("Contract confirmed and submitted for approval. The Contracting Manager has been notified. An immutable audit entry has been logged with your confirmation, timestamp, and the full contract terms. Contract ID: **" + (currentDraft?.contract_id || currentDraft?.amendment_id || currentDraft?.renewal_id || "DRAFT") + "**", []);
}

function rejectContract() {
  document.getElementById("contractStatus").textContent = "REJECTED";
  document.getElementById("contractStatus").className = "contract-status rejected";
  document.getElementById("confirmActions").style.display = "none";
  document.getElementById("previewHint").textContent = "Draft rejected";
  appendAIMessage("Understood — draft rejected. Nothing has been saved. Tell me what you'd like to change and I'll revise it.", []);
}

// ─── LiveKit Voice ─────────────────────────────────────────────────────────────

function setupVoice() {
  // Check LiveKit SDK loaded
  if (!window.LivekitClient) {
    const btn = document.getElementById("micBtn");
    if (btn) { btn.style.opacity = "0.4"; btn.title = "Voice SDK not loaded"; }
  }
}

async function toggleVoice() {
  if (lkVoiceActive) {
    await disconnectVoice();
  } else {
    await connectVoice();
  }
}

async function connectVoice() {
  if (!window.LivekitClient) {
    setVoiceStatus("LiveKit SDK not loaded — refresh the page");
    return;
  }
  setVoiceStatus("Connecting...");
  document.getElementById("micBtn")?.classList.add("listening");

  try {
    const res = await fetch(`${API_BASE}/api/livekit/token`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setVoiceStatus(err.detail || "Voice not available — LiveKit not configured");
      document.getElementById("micBtn")?.classList.remove("listening");
      return;
    }
    const { token, url } = await res.json();

    const { Room, RoomEvent, Track } = window.LivekitClient;

    livekitRoom = new Room({
      audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      adaptiveStream: true,
      dynacast: true,
    });

    // Play agent audio automatically
    livekitRoom.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind === Track.Kind.Audio && !participant.isLocal) {
        const audioEl = track.attach();
        audioEl.id = "lk-agent-audio";
        audioEl.autoplay = true;
        document.body.appendChild(audioEl);
      }
    });

    livekitRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach(el => el.remove());
    });

    // Show agent + user transcriptions in the chat panel
    livekitRoom.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
      segments.forEach(seg => {
        if (!seg.isFinal || !seg.text?.trim()) return;
        if (participant?.isLocal) {
          appendUserMessage(seg.text.trim());
        } else {
          appendAIMessage(seg.text.trim(), []);
        }
      });
    });

    livekitRoom.on(RoomEvent.Connected, () => {
      lkVoiceActive = true;
      setVoiceStatus("Connected — speak naturally");
      document.getElementById("micBtn")?.classList.add("listening");
    });

    livekitRoom.on(RoomEvent.Disconnected, () => {
      lkVoiceActive = false;
      livekitRoom = null;
      document.getElementById("lk-agent-audio")?.remove();
      document.getElementById("micBtn")?.classList.remove("listening");
      setVoiceStatus("");
    });

    livekitRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
      if (state === "reconnecting") setVoiceStatus("Reconnecting...");
      if (state === "connected")    setVoiceStatus("Connected — speak naturally");
    });

    await livekitRoom.connect(url, token);
    await livekitRoom.localParticipant.setMicrophoneEnabled(true);

  } catch (err) {
    console.error("[LiveKit]", err);
    setVoiceStatus(`Connection failed: ${err.message}`);
    document.getElementById("micBtn")?.classList.remove("listening");
    lkVoiceActive = false;
    livekitRoom = null;
  }
}

async function disconnectVoice() {
  if (livekitRoom) {
    try {
      await livekitRoom.localParticipant.setMicrophoneEnabled(false);
      await livekitRoom.disconnect();
    } catch (_) {}
  }
  document.getElementById("lk-agent-audio")?.remove();
  document.getElementById("micBtn")?.classList.remove("listening");
  lkVoiceActive = false;
  livekitRoom = null;
  setVoiceStatus("");
}

// Keep stopVoice as an alias so any existing callers (e.g. sendMessage) still work
function stopVoice() { /* no-op — LiveKit session stays alive until mic button toggled */ }
function setVoiceStatus(msg) { const el = document.getElementById("voiceStatus"); if (el) el.textContent = msg; }

// ─── Chat ─────────────────────────────────────────────────────────────────────

function handleKey(e)    { if (e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} }
function autoResize(el)  { el.style.height="auto"; el.style.height=Math.min(el.scrollHeight,120)+"px"; }

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text) return;
  input.value=""; autoResize(input); stopVoice();
  appendUserMessage(text);
  const thinkingEl = appendThinking();
  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) sendBtn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api/chat`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({message:text,session_id:SESSION_ID}) });
    const data = await res.json();
    thinkingEl.remove();
    await renderAIResponse(data);
  } catch {
    thinkingEl.remove();
    appendAIMessage("Sorry, I couldn't reach the AI service. Make sure the backend is running on port 8001.", []);
  }
  if (sendBtn) sendBtn.disabled = false;
  scrollToBottom();
}

function scrollToBottom() { const el=document.getElementById("chatMessages"); if(el) setTimeout(()=>el.scrollTop=el.scrollHeight,50); }

function appendUserMessage(text) {
  const el = document.createElement("div");
  el.className = "message user";
  el.innerHTML = `<div class="message-avatar">You</div><div class="message-body"><div class="message-text">${escapeHtml(text)}</div><div class="message-time">${now()}</div></div>`;
  document.getElementById("chatMessages").appendChild(el);
  scrollToBottom();
}

function appendThinking() {
  const el = document.createElement("div");
  el.className = "message ai";
  el.innerHTML = `<div class="message-avatar">AI</div><div class="message-body"><div class="thinking"><div class="thinking-dots"><div class="thinking-dot"></div><div class="thinking-dot"></div><div class="thinking-dot"></div></div>Processing...</div></div>`;
  document.getElementById("chatMessages").appendChild(el);
  scrollToBottom();
  return el;
}

async function renderAIResponse(data) {
  const container = document.getElementById("chatMessages");
  if (data.tool_calls?.length > 0) {
    const toolContainer = document.createElement("div");
    toolContainer.className = "tool-calls";
    container.appendChild(toolContainer);
    for (const tc of data.tool_calls) {
      await delay(400);
      const chip = document.createElement("div");
      chip.className = `tool-chip ${tc.result?.error ? "error" : "success"}`;
      chip.innerHTML = `<span class="tool-name">${tc.tool}()</span><span class="tool-summary">${escapeHtml(tc.summary)}</span>`;
      toolContainer.appendChild(chip);
      scrollToBottom();
    }
    await delay(300);
  }
  const el = document.createElement("div");
  el.className = "message ai";
  el.innerHTML = `<div class="message-avatar">AI</div><div class="message-body"><div class="message-text">${markdownToHtml(data.ai_message)}</div><div class="message-time">${now()}</div></div>`;
  container.appendChild(el);
  if (data.contract_draft) {
    currentDraft = data.contract_draft;
    const fiCall = (data.tool_calls||[]).find(tc => tc.tool==="get_financial_impact");
    renderContractPreview(data.contract_draft, data.awaiting_confirmation, fiCall ? fiCall.result : null);
  }
  scrollToBottom();
}

function appendAIMessage(text, toolCalls) {
  renderAIResponse({ ai_message: text, tool_calls: toolCalls||[], awaiting_confirmation: false, contract_draft: null });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function now()     { return new Date().toLocaleTimeString("en-NZ", {hour:"2-digit",minute:"2-digit"}); }
function escapeHtml(str) { return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function markdownToHtml(text) {
  return text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,"<em>$1</em>")
    .replace(/`(.+?)`/g,"<code>$1</code>")
    .replace(/\n/g,"<br>");
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
