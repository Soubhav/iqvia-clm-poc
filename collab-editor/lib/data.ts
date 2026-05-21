import type { PartialBlock } from "@blocknote/core";

export const USERS = [
  { id: "USR-001", name: "Sarah Mitchell", initials: "SM", color: "#2563eb", role: "Contract Manager" },
  { id: "USR-002", name: "James Okonkwo",  initials: "JO", color: "#7c3aed", role: "Senior Contract Manager" },
  { id: "USR-003", name: "Lisa Chen",      initials: "LC", color: "#0891b2", role: "Administrator" },
  { id: "USR-004", name: "David Park",     initials: "DP", color: "#059669", role: "Viewer" },
  { id: "USR-005", name: "Emma Walsh",     initials: "EW", color: "#dc2626", role: "Contract Manager" },
];

export type User = typeof USERS[0];

export const CONTRACTS = [
  {
    id: "CTR-001",
    provider: "Auckland Surgical Centre",
    city: "Auckland",
    hpiOrgId: "G00001-K",
    contractType: "Surgical — Elective",
    procedure: "Total Knee Replacement",
    procedureCode: "NZACS-1471",
    model: "TIERED",
    rateRange: "$3,600–$4,200",
    cap: 150,
    status: "EXPIRING",
    effectiveDate: "1 Aug 2025",
    expiry: "31 Jul 2026",
    relationshipOwner: "Sarah Mitchell",
  },
  {
    id: "CTR-002",
    provider: "Wellington Orthopaedics",
    city: "Wellington",
    hpiOrgId: "G00012-M",
    contractType: "Surgical — Elective",
    procedure: "Total Knee Replacement",
    procedureCode: "NZACS-1471",
    model: "FFS",
    rateRange: "$4,050",
    cap: 80,
    status: "ACTIVE",
    effectiveDate: "1 Sep 2025",
    expiry: "31 Aug 2026",
    relationshipOwner: "James Okonkwo",
  },
  {
    id: "CTR-003",
    provider: "Christchurch Surgical Centre",
    city: "Christchurch",
    hpiOrgId: "G00023-P",
    contractType: "Surgical — Elective",
    procedure: "Knee Arthroscopy",
    procedureCode: "NZACS-1422",
    model: "FFS",
    rateRange: "$2,800",
    cap: 100,
    status: "ACTIVE",
    effectiveDate: "1 Oct 2025",
    expiry: "30 Sep 2026",
    relationshipOwner: "Sarah Mitchell",
  },
  {
    id: "CTR-004",
    provider: "Auckland Surgical Centre",
    city: "Auckland",
    hpiOrgId: "G00001-K",
    contractType: "Surgical — Elective",
    procedure: "Knee Arthroscopy",
    procedureCode: "NZACS-1422",
    model: "TIERED",
    rateRange: "$2,400–$2,900",
    cap: 200,
    status: "ACTIVE",
    effectiveDate: "1 Jan 2025",
    expiry: "31 Dec 2026",
    relationshipOwner: "Sarah Mitchell",
  },
  {
    id: "CTR-005",
    provider: "Wellington Regional Hospital",
    city: "Wellington",
    hpiOrgId: "G00045-R",
    contractType: "Surgical — Elective",
    procedure: "Total Knee Replacement",
    procedureCode: "NZACS-1471",
    model: "MATRIX",
    rateRange: "$2,800–$5,000",
    cap: 120,
    status: "ACTIVE",
    effectiveDate: "1 Jul 2026",
    expiry: "30 Jun 2027",
    relationshipOwner: "James Okonkwo",
  },
  {
    id: "CTR-006",
    provider: "Auckland Surgical Centre",
    city: "Auckland",
    hpiOrgId: "G00001-K",
    contractType: "Surgical — Elective",
    procedure: "Total Hip Replacement",
    procedureCode: "NZACS-1502",
    model: "STAIRCASE",
    rateRange: "$4,900–$5,800",
    cap: 120,
    status: "ACTIVE",
    effectiveDate: "1 Jul 2026",
    expiry: "30 Jun 2027",
    relationshipOwner: "Sarah Mitchell",
  },
  {
    id: "CTR-007",
    provider: "Dunedin Surgical Group",
    city: "Dunedin",
    hpiOrgId: "G00067-T",
    contractType: "Surgical — Elective",
    procedure: "Knee Arthroscopy",
    procedureCode: "NZACS-1422",
    model: "FFS",
    rateRange: "$2,400",
    cap: 60,
    status: "NEGOTIATION",
    effectiveDate: "1 Apr 2027",
    expiry: "31 Mar 2028",
    relationshipOwner: "Sarah Mitchell",
  },
  {
    id: "CTR-DRAFT",
    provider: "Christchurch Surgical Centre",
    city: "Christchurch",
    hpiOrgId: "G00023-P",
    contractType: "Surgical — Elective",
    procedure: "Total Knee Replacement",
    procedureCode: "NZACS-1471",
    model: "TIERED",
    rateRange: "$3,420–$3,990",
    cap: 120,
    status: "NEGOTIATION",
    effectiveDate: "1 Jul 2026",
    expiry: "30 Jun 2027",
    relationshipOwner: "Sarah Mitchell",
  },
];

export type Contract = typeof CONTRACTS[0];

export function getContractContent(contract: Contract): PartialBlock[] {
  const tierText =
    contract.model === "TIERED"
      ? `Rates are applied on a tiered volume basis: ${contract.rateRange} NZD per procedure, with the applicable tier determined by cumulative procedure volume within the contract year.`
      : contract.model === "FFS"
      ? `A fixed fee-for-service rate of ${contract.rateRange} NZD applies per procedure, irrespective of volume.`
      : `Rates apply per the pricing matrix attached as Schedule 1, with rate bands determined by complexity classification (A/B) and acuity (High/Low).`;

  return [
    {
      type: "heading",
      content: "HEALTH SERVICES AGREEMENT",
      props: { level: 1, textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: `Contract ID: ${contract.id}   ·   ${contract.procedure}   ·   ${contract.model} Pricing`,
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: "",
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "heading",
      content: "1. Parties",
      props: { level: 2, textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: `This Health Services Agreement ("Agreement") is entered into between NZ Private Health Insurer Limited ("the Health Insurer") and ${contract.provider}, ${contract.city} ("the Provider"), registered under HPI Organisation ID ${contract.hpiOrgId}.`,
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "heading",
      content: "2. Term",
      props: { level: 2, textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: `This Agreement commences on ${contract.effectiveDate} ("Commencement Date") and expires on ${contract.expiry} ("Expiry Date"), unless terminated earlier in accordance with this Agreement.`,
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "heading",
      content: "3. Services",
      props: { level: 2, textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: `The Provider shall deliver ${contract.procedure} services (Procedure Code: ${contract.procedureCode}) to eligible members of the Health Insurer's network in accordance with the clinical protocols set out in Schedule 2. The maximum contracted volume under this Agreement is ${contract.cap} procedures per contract year.`,
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "heading",
      content: "4. Pricing & Rates",
      props: { level: 2, textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: tierText,
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: "All rates are inclusive of GST where applicable and are denominated in New Zealand Dollars (NZD). Rates are subject to annual CPI review in accordance with Clause 7.",
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "heading",
      content: "5. Compliance & Accreditation",
      props: { level: 2, textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: "The Provider shall maintain active registration with the Health Provider Index (HPI) throughout the Term and shall notify the Health Insurer within 5 business days of any change to its registration status. The Provider shall hold and maintain facility accreditation under the Health and Disability Services Standards (HDSS) and shall supply evidence of current accreditation on request.",
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "heading",
      content: "6. Reporting & Claims",
      props: { level: 2, textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: "The Provider shall submit all claims through the IQVIA TMB claims platform using the agreed electronic format. Monthly utilisation reports shall be submitted within 10 business days of month end, including procedure codes, dates of service, NHI numbers, and provider identifiers.",
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "heading",
      content: "7. Rate Adjustment",
      props: { level: 2, textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: "Contract rates shall be reviewed annually on the Commencement Date anniversary. The Health Insurer may adjust rates by up to the CPI movement for the preceding 12 months as published by Statistics New Zealand, without requiring formal contract amendment. Adjustments take effect 30 days after written notification.",
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "heading",
      content: "8. Confidentiality & Privacy",
      props: { level: 2, textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: "The Provider shall maintain the confidentiality of all patient health information in accordance with the New Zealand Privacy Act 2020 and the Health Information Privacy Code 2020. Patient data shall not be disclosed to any third party without prior written consent, except as required by law or for direct care of the patient.",
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "heading",
      content: "9. Indemnity",
      props: { level: 2, textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: "Each party shall indemnify and hold harmless the other party from any claims, losses, or damages arising from its own breach of this Agreement or negligent acts. The Provider shall maintain professional indemnity insurance of no less than $5,000,000 NZD per claim throughout the Term.",
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "heading",
      content: "10. Termination",
      props: { level: 2, textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: "Either party may terminate this Agreement without cause upon 90 days' written notice. Either party may terminate immediately upon written notice if the other party commits a material breach that is not remedied within 20 business days of written notice of the breach.",
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "heading",
      content: "11. Dispute Resolution",
      props: { level: 2, textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: "Any dispute arising under this Agreement shall first be referred to good-faith mediation between the parties' senior representatives within 15 business days of written notice. If mediation fails within 30 days, either party may refer the matter to arbitration under the Arbitration Act 1996 (NZ).",
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: "",
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
    {
      type: "paragraph",
      content: `Relationship Owner: ${contract.relationshipOwner}   ·   Contract Edge — NZ Private Health Insurer`,
      props: { textAlignment: "left", backgroundColor: "default", textColor: "default" },
    },
  ];
}
