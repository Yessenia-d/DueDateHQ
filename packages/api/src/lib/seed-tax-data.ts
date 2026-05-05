import type {
  DueDateRule,
  KnownStatus,
  VerificationStatus,
} from "@due-date-hq/db/schema/tax-rules";

const SEED_VERIFIED_AT = new Date("2026-04-01T00:00:00.000Z");

export type SeedObligation = {
  id: string;
  jurisdiction: string;
  jurisdictionLevel: "federal" | "state";
  agencyName: string;
  taxCategory: string;
  obligationName: string;
  entityTypes: string[];
  knownStatus: KnownStatus;
};

export type SeedRule = {
  id: string;
  obligationId: string;
  ruleSummary: string;
  dueDateRule: DueDateRule;
  verificationStatus: VerificationStatus;
  sourceName: string;
  sourceUrl: string;
  currentVersion: number;
  lastVerifiedAt?: Date | null;
  sourceLastCheckedAt?: Date;
  sourceLastChangedAt?: Date | null;
  sourceContentHash?: string | null;
  verifiedBy?: string | null;
  verificationNotes?: string | null;
};

// ── IRS Federal Obligations ──

export const seedObligations: SeedObligation[] = [
  // IRS Federal
  {
    id: "obl-irs-1040",
    jurisdiction: "federal",
    jurisdictionLevel: "federal",
    agencyName: "Internal Revenue Service",
    taxCategory: "Income Tax",
    obligationName: "Form 1040 Individual Income Tax Return",
    entityTypes: ["individual"],
    knownStatus: "known",
  },
  {
    id: "obl-irs-1120",
    jurisdiction: "federal",
    jurisdictionLevel: "federal",
    agencyName: "Internal Revenue Service",
    taxCategory: "Income Tax",
    obligationName: "Form 1120 Corporation Income Tax Return",
    entityTypes: ["c_corp"],
    knownStatus: "known",
  },
  {
    id: "obl-irs-1120s",
    jurisdiction: "federal",
    jurisdictionLevel: "federal",
    agencyName: "Internal Revenue Service",
    taxCategory: "Income Tax",
    obligationName: "Form 1120-S S Corporation Income Tax Return",
    entityTypes: ["s_corp"],
    knownStatus: "known",
  },
  {
    id: "obl-irs-1065",
    jurisdiction: "federal",
    jurisdictionLevel: "federal",
    agencyName: "Internal Revenue Service",
    taxCategory: "Income Tax",
    obligationName: "Form 1065 Partnership Return of Income",
    entityTypes: ["partnership"],
    knownStatus: "known",
  },
  {
    id: "obl-irs-1041",
    jurisdiction: "federal",
    jurisdictionLevel: "federal",
    agencyName: "Internal Revenue Service",
    taxCategory: "Income Tax",
    obligationName: "Form 1041 Estates and Trusts Income Tax Return",
    entityTypes: ["trust_estate"],
    knownStatus: "known",
  },
  {
    id: "obl-irs-1040es",
    jurisdiction: "federal",
    jurisdictionLevel: "federal",
    agencyName: "Internal Revenue Service",
    taxCategory: "Estimated Tax",
    obligationName: "Form 1040-ES Estimated Tax for Individuals",
    entityTypes: ["individual"],
    knownStatus: "known",
  },
  {
    id: "obl-irs-1120w",
    jurisdiction: "federal",
    jurisdictionLevel: "federal",
    agencyName: "Internal Revenue Service",
    taxCategory: "Estimated Tax",
    obligationName: "Form 1120-W Estimated Tax for Corporations",
    entityTypes: ["c_corp"],
    knownStatus: "known",
  },
  // California FTB
  {
    id: "obl-ca-540",
    jurisdiction: "CA",
    jurisdictionLevel: "state",
    agencyName: "California Franchise Tax Board",
    taxCategory: "Income Tax",
    obligationName: "Form 540 California Resident Income Tax Return",
    entityTypes: ["individual"],
    knownStatus: "known",
  },
  {
    id: "obl-ca-100",
    jurisdiction: "CA",
    jurisdictionLevel: "state",
    agencyName: "California Franchise Tax Board",
    taxCategory: "Income Tax",
    obligationName: "Form 100 California Corporation Franchise or Income Tax Return",
    entityTypes: ["c_corp"],
    knownStatus: "known",
  },
  {
    id: "obl-ca-100s",
    jurisdiction: "CA",
    jurisdictionLevel: "state",
    agencyName: "California Franchise Tax Board",
    taxCategory: "Income Tax",
    obligationName: "Form 100S California S Corporation Franchise or Income Tax Return",
    entityTypes: ["s_corp"],
    knownStatus: "known",
  },
  {
    id: "obl-ca-565",
    jurisdiction: "CA",
    jurisdictionLevel: "state",
    agencyName: "California Franchise Tax Board",
    taxCategory: "Income Tax",
    obligationName: "Form 565 Partnership Return of Income",
    entityTypes: ["partnership"],
    knownStatus: "known",
  },
  {
    id: "obl-ca-540es",
    jurisdiction: "CA",
    jurisdictionLevel: "state",
    agencyName: "California Franchise Tax Board",
    taxCategory: "Estimated Tax",
    obligationName: "Form 540-ES Estimated Tax for Individuals",
    entityTypes: ["individual"],
    knownStatus: "known",
  },
  {
    id: "obl-ca-100es",
    jurisdiction: "CA",
    jurisdictionLevel: "state",
    agencyName: "California Franchise Tax Board",
    taxCategory: "Estimated Tax",
    obligationName: "Form 100-ES Estimated Tax for Corporations",
    entityTypes: ["c_corp"],
    knownStatus: "known",
  },

  // ── New York Tax Department ──

  {
    id: "obl-ny-it201",
    jurisdiction: "NY",
    jurisdictionLevel: "state",
    agencyName: "New York Tax Department",
    taxCategory: "Income Tax",
    obligationName: "Form IT-201 Resident Income Tax Return",
    entityTypes: ["individual"],
    knownStatus: "known",
  },
  {
    id: "obl-ny-ct3",
    jurisdiction: "NY",
    jurisdictionLevel: "state",
    agencyName: "New York Tax Department",
    taxCategory: "Income Tax",
    obligationName: "Form CT-3 General Business Corporation Franchise Tax Return",
    entityTypes: ["c_corp"],
    knownStatus: "known",
  },
  {
    id: "obl-ny-ct3s",
    jurisdiction: "NY",
    jurisdictionLevel: "state",
    agencyName: "New York Tax Department",
    taxCategory: "Income Tax",
    obligationName: "Form CT-3-S New York S Corporation Franchise Tax Return",
    entityTypes: ["s_corp"],
    knownStatus: "known",
  },
  {
    id: "obl-ny-it204",
    jurisdiction: "NY",
    jurisdictionLevel: "state",
    agencyName: "New York Tax Department",
    taxCategory: "Income Tax",
    obligationName: "Form IT-204 Partnership Return",
    entityTypes: ["partnership"],
    knownStatus: "known",
  },
  {
    id: "obl-ny-it2105",
    jurisdiction: "NY",
    jurisdictionLevel: "state",
    agencyName: "New York Tax Department",
    taxCategory: "Estimated Tax",
    obligationName: "Form IT-2105 Estimated Income Tax Payment for Individuals",
    entityTypes: ["individual"],
    knownStatus: "known",
  },
  {
    id: "obl-ny-ct400",
    jurisdiction: "NY",
    jurisdictionLevel: "state",
    agencyName: "New York Tax Department",
    taxCategory: "Estimated Tax",
    obligationName: "Form CT-400 Estimated Tax for Corporations",
    entityTypes: ["c_corp"],
    knownStatus: "known",
  },

  // ── Texas Comptroller ──

  {
    id: "obl-tx-franchise",
    jurisdiction: "TX",
    jurisdictionLevel: "state",
    agencyName: "Texas Comptroller of Public Accounts",
    taxCategory: "Franchise Tax",
    obligationName: "Texas Franchise Tax Return (05-158-A/05-158-B)",
    entityTypes: ["s_corp", "c_corp", "partnership", "llc"],
    knownStatus: "known",
  },
  {
    id: "obl-tx-sales",
    jurisdiction: "TX",
    jurisdictionLevel: "state",
    agencyName: "Texas Comptroller of Public Accounts",
    taxCategory: "Sales & Use Tax",
    obligationName: "Texas Sales and Use Tax Return",
    entityTypes: ["s_corp", "c_corp", "partnership", "llc"],
    knownStatus: "known",
  },

  // ── Florida Department of Revenue ──

  {
    id: "obl-fl-f1120",
    jurisdiction: "FL",
    jurisdictionLevel: "state",
    agencyName: "Florida Department of Revenue",
    taxCategory: "Income Tax",
    obligationName: "Form F-1120 Florida Corporate Income Tax Return",
    entityTypes: ["c_corp"],
    knownStatus: "known",
  },
  {
    id: "obl-fl-sales",
    jurisdiction: "FL",
    jurisdictionLevel: "state",
    agencyName: "Florida Department of Revenue",
    taxCategory: "Sales & Use Tax",
    obligationName: "Form DR-15 Florida Sales and Use Tax Return",
    entityTypes: ["s_corp", "c_corp", "partnership", "llc"],
    knownStatus: "known",
  },
  {
    id: "obl-fl-rt6",
    jurisdiction: "FL",
    jurisdictionLevel: "state",
    agencyName: "Florida Department of Revenue",
    taxCategory: "Reemployment Tax",
    obligationName: "Form RT-6 Florida Quarterly Reemployment Compensation Tax Return",
    entityTypes: ["s_corp", "c_corp", "partnership", "llc"],
    knownStatus: "unsupported",
  },
];

// ── IRS Federal Rules ──

export const seedRules: SeedRule[] = [
  // IRS Form 1040 - April 15, extension to October 15
  {
    id: "rule-irs-1040-filing",
    obligationId: "obl-irs-1040",
    ruleSummary:
      "Individual income tax return due April 15 following the tax year. Automatic 6-month extension to October 15.",
    dueDateRule: {
      type: "fixed",
      month: 4,
      day: 15,
      adjustForWeekendHoliday: true,
      extensionRule: {
        month: 10,
        day: 15,
        adjustForWeekendHoliday: true,
      },
    },
    verificationStatus: "verified",
    sourceName: "IRS",
    sourceUrl: "https://www.irs.gov/forms-pubs/about-form-1040",
    currentVersion: 1,
  },
  // IRS Form 1120 - April 15, extension to October 15
  {
    id: "rule-irs-1120-filing",
    obligationId: "obl-irs-1120",
    ruleSummary:
      "C Corporation income tax return due April 15 following the tax year. Automatic 6-month extension to October 15.",
    dueDateRule: {
      type: "fixed",
      month: 4,
      day: 15,
      adjustForWeekendHoliday: true,
      extensionRule: {
        month: 10,
        day: 15,
        adjustForWeekendHoliday: true,
      },
    },
    verificationStatus: "verified",
    sourceName: "IRS",
    sourceUrl: "https://www.irs.gov/forms-pubs/about-form-1120",
    currentVersion: 1,
  },
  // IRS Form 1120-S - March 15, extension to September 15
  {
    id: "rule-irs-1120s-filing",
    obligationId: "obl-irs-1120s",
    ruleSummary:
      "S Corporation income tax return due March 15 following the tax year. Automatic 6-month extension to September 15.",
    dueDateRule: {
      type: "fixed",
      month: 3,
      day: 15,
      adjustForWeekendHoliday: true,
      extensionRule: {
        month: 9,
        day: 15,
        adjustForWeekendHoliday: true,
      },
    },
    verificationStatus: "verified",
    sourceName: "IRS",
    sourceUrl: "https://www.irs.gov/forms-pubs/about-form-1120-s",
    currentVersion: 1,
  },
  // IRS Form 1065 - March 15, extension to September 15
  {
    id: "rule-irs-1065-filing",
    obligationId: "obl-irs-1065",
    ruleSummary:
      "Partnership return of income due March 15 following the tax year. Automatic 6-month extension to September 15.",
    dueDateRule: {
      type: "fixed",
      month: 3,
      day: 15,
      adjustForWeekendHoliday: true,
      extensionRule: {
        month: 9,
        day: 15,
        adjustForWeekendHoliday: true,
      },
    },
    verificationStatus: "verified",
    sourceName: "IRS",
    sourceUrl: "https://www.irs.gov/forms-pubs/about-form-1065",
    currentVersion: 1,
  },
  // IRS Form 1041 - April 15, extension to September 30
  {
    id: "rule-irs-1041-filing",
    obligationId: "obl-irs-1041",
    ruleSummary:
      "Estates and trusts income tax return due April 15 following the tax year. 5.5-month extension to September 30.",
    dueDateRule: {
      type: "fixed",
      month: 4,
      day: 15,
      adjustForWeekendHoliday: true,
      extensionRule: {
        month: 9,
        day: 30,
        adjustForWeekendHoliday: true,
      },
    },
    verificationStatus: "verified",
    sourceName: "IRS",
    sourceUrl: "https://www.irs.gov/forms-pubs/about-form-1041",
    currentVersion: 1,
  },
  // IRS Form 1040-ES - Quarterly estimated tax
  {
    id: "rule-irs-1040es-quarterly",
    obligationId: "obl-irs-1040es",
    ruleSummary:
      "Individual estimated tax payments due quarterly: Apr 15, Jun 15, Sep 15, Jan 15 of the following year.",
    dueDateRule: {
      type: "quarterly",
      quarters: {
        q1: { month: 4, day: 15 },
        q2: { month: 6, day: 15 },
        q3: { month: 9, day: 15 },
        q4: { month: 1, day: 15, yearOffset: 1 },
      },
      adjustForWeekendHoliday: true,
    },
    verificationStatus: "verified",
    sourceName: "IRS",
    sourceUrl: "https://www.irs.gov/forms-pubs/about-form-1040-es",
    currentVersion: 1,
  },
  // IRS Form 1120-W - Quarterly estimated tax for corps
  {
    id: "rule-irs-1120w-quarterly",
    obligationId: "obl-irs-1120w",
    ruleSummary:
      "Corporate estimated tax payments due quarterly: Apr 15, Jun 15, Sep 15, Dec 15.",
    dueDateRule: {
      type: "quarterly",
      quarters: {
        q1: { month: 4, day: 15 },
        q2: { month: 6, day: 15 },
        q3: { month: 9, day: 15 },
        q4: { month: 12, day: 15 },
      },
      adjustForWeekendHoliday: true,
    },
    verificationStatus: "verified",
    sourceName: "IRS",
    sourceUrl: "https://www.irs.gov/forms-pubs/about-form-1120-w",
    currentVersion: 1,
  },

  // ── California FTB Rules ──

  // CA Form 540 - April 15, extension to October 15
  {
    id: "rule-ca-540-filing",
    obligationId: "obl-ca-540",
    ruleSummary:
      "California resident income tax return due April 15 following the tax year. Automatic 6-month extension to October 15.",
    dueDateRule: {
      type: "fixed",
      month: 4,
      day: 15,
      adjustForWeekendHoliday: true,
      extensionRule: {
        month: 10,
        day: 15,
        adjustForWeekendHoliday: true,
      },
    },
    verificationStatus: "verified",
    sourceName: "California Franchise Tax Board",
    sourceUrl: "https://www.ftb.ca.gov/forms/misc/1540.html",
    currentVersion: 1,
  },
  // CA Form 100 - April 15, extension to October 15
  {
    id: "rule-ca-100-filing",
    obligationId: "obl-ca-100",
    ruleSummary:
      "California corporation franchise or income tax return due the 15th day of the 4th month following close of tax year. Automatic 6-month extension to October 15.",
    dueDateRule: {
      type: "fixed",
      month: 4,
      day: 15,
      adjustForWeekendHoliday: true,
      extensionRule: {
        month: 10,
        day: 15,
        adjustForWeekendHoliday: true,
      },
    },
    verificationStatus: "verified",
    sourceName: "California Franchise Tax Board",
    sourceUrl: "https://www.ftb.ca.gov/forms/misc/100-booklet.html",
    currentVersion: 1,
  },
  // CA Form 100S - March 15, extension to September 15
  {
    id: "rule-ca-100s-filing",
    obligationId: "obl-ca-100s",
    ruleSummary:
      "California S Corporation franchise or income tax return due March 15. Automatic 6-month extension to September 15.",
    dueDateRule: {
      type: "fixed",
      month: 3,
      day: 15,
      adjustForWeekendHoliday: true,
      extensionRule: {
        month: 9,
        day: 15,
        adjustForWeekendHoliday: true,
      },
    },
    verificationStatus: "verified",
    sourceName: "California Franchise Tax Board",
    sourceUrl: "https://www.ftb.ca.gov/forms/misc/100s-booklet.html",
    currentVersion: 1,
  },
  // CA Form 565 - March 15, extension to September 15
  {
    id: "rule-ca-565-filing",
    obligationId: "obl-ca-565",
    ruleSummary:
      "California partnership return of income due March 15. Automatic 6-month extension to September 15.",
    dueDateRule: {
      type: "fixed",
      month: 3,
      day: 15,
      adjustForWeekendHoliday: true,
      extensionRule: {
        month: 9,
        day: 15,
        adjustForWeekendHoliday: true,
      },
    },
    verificationStatus: "verified",
    sourceName: "California Franchise Tax Board",
    sourceUrl: "https://www.ftb.ca.gov/forms/misc/565-booklet.html",
    currentVersion: 1,
  },
  // CA Form 540-ES - Quarterly estimated tax
  {
    id: "rule-ca-540es-quarterly",
    obligationId: "obl-ca-540es",
    ruleSummary:
      "California individual estimated tax payments due quarterly: Apr 15, Jun 15, Sep 15, Jan 15 of the following year.",
    dueDateRule: {
      type: "quarterly",
      quarters: {
        q1: { month: 4, day: 15 },
        q2: { month: 6, day: 15 },
        q3: { month: 9, day: 15 },
        q4: { month: 1, day: 15, yearOffset: 1 },
      },
      adjustForWeekendHoliday: true,
    },
    verificationStatus: "verified",
    sourceName: "California Franchise Tax Board",
    sourceUrl: "https://www.ftb.ca.gov/pay/estimated-tax-payments.html",
    currentVersion: 1,
  },
  // CA Form 100-ES - Quarterly estimated tax for corps
  {
    id: "rule-ca-100es-quarterly",
    obligationId: "obl-ca-100es",
    ruleSummary:
      "California corporate estimated tax payments due quarterly: Apr 15, Jun 15, Sep 15, Dec 15.",
    dueDateRule: {
      type: "quarterly",
      quarters: {
        q1: { month: 4, day: 15 },
        q2: { month: 6, day: 15 },
        q3: { month: 9, day: 15 },
        q4: { month: 12, day: 15 },
      },
      adjustForWeekendHoliday: true,
    },
    verificationStatus: "verified",
    sourceName: "California Franchise Tax Board",
    sourceUrl: "https://www.ftb.ca.gov/pay/estimated-tax-payments.html",
    currentVersion: 1,
  },

  // ── New York Tax Department Rules ──

  // NY Form IT-201 - April 15, extension to October 15
  {
    id: "rule-ny-it201-filing",
    obligationId: "obl-ny-it201",
    ruleSummary:
      "New York resident income tax return due April 15 following the tax year. Automatic 6-month extension to October 15.",
    dueDateRule: {
      type: "fixed",
      month: 4,
      day: 15,
      adjustForWeekendHoliday: true,
      extensionRule: {
        month: 10,
        day: 15,
        adjustForWeekendHoliday: true,
      },
    },
    verificationStatus: "verified",
    sourceName: "New York Tax Department",
    sourceUrl: "https://www.tax.ny.gov/pit/file/pit_forms.htm",
    currentVersion: 1,
  },
  // NY Form CT-3 - March 15, extension to September 15
  {
    id: "rule-ny-ct3-filing",
    obligationId: "obl-ny-ct3",
    ruleSummary:
      "New York general business corporation franchise tax return due March 15. Automatic 6-month extension to September 15.",
    dueDateRule: {
      type: "fixed",
      month: 3,
      day: 15,
      adjustForWeekendHoliday: true,
      extensionRule: {
        month: 9,
        day: 15,
        adjustForWeekendHoliday: true,
      },
    },
    verificationStatus: "needs_review",
    sourceName: "New York Tax Department",
    sourceUrl: "https://www.tax.ny.gov/bus/ct/ctforms.htm",
    currentVersion: 1,
    lastVerifiedAt: null,
    verifiedBy: null,
    verificationNotes: "Candidate rule exists but still needs DueDateHQ review before task generation.",
  },
  // NY Form CT-3-S - March 15, extension to September 15
  {
    id: "rule-ny-ct3s-filing",
    obligationId: "obl-ny-ct3s",
    ruleSummary:
      "New York S Corporation franchise tax return due March 15. Automatic 6-month extension to September 15.",
    dueDateRule: {
      type: "fixed",
      month: 3,
      day: 15,
      adjustForWeekendHoliday: true,
      extensionRule: {
        month: 9,
        day: 15,
        adjustForWeekendHoliday: true,
      },
    },
    verificationStatus: "verified",
    sourceName: "New York Tax Department",
    sourceUrl: "https://www.tax.ny.gov/bus/ct/ctforms.htm",
    currentVersion: 1,
  },
  // NY Form IT-2105 - Quarterly estimated tax for individuals
  {
    id: "rule-ny-it2105-quarterly",
    obligationId: "obl-ny-it2105",
    ruleSummary:
      "New York individual estimated income tax payments due quarterly: Apr 15, Jun 15, Sep 15, Jan 15 of the following year.",
    dueDateRule: {
      type: "quarterly",
      quarters: {
        q1: { month: 4, day: 15 },
        q2: { month: 6, day: 15 },
        q3: { month: 9, day: 15 },
        q4: { month: 1, day: 15, yearOffset: 1 },
      },
      adjustForWeekendHoliday: true,
    },
    verificationStatus: "verified",
    sourceName: "New York Tax Department",
    sourceUrl: "https://www.tax.ny.gov/pit/estimated_tax/default.htm",
    currentVersion: 1,
  },
  // NY Form CT-400 - Quarterly estimated tax for corporations
  {
    id: "rule-ny-ct400-quarterly",
    obligationId: "obl-ny-ct400",
    ruleSummary:
      "New York corporate estimated tax payments due quarterly: Mar 15, Jun 15, Sep 15, Dec 15.",
    dueDateRule: {
      type: "quarterly",
      quarters: {
        q1: { month: 3, day: 15 },
        q2: { month: 6, day: 15 },
        q3: { month: 9, day: 15 },
        q4: { month: 12, day: 15 },
      },
      adjustForWeekendHoliday: true,
    },
    verificationStatus: "verified",
    sourceName: "New York Tax Department",
    sourceUrl: "https://www.tax.ny.gov/bus/ct/ctforms.htm",
    currentVersion: 1,
  },

  // ── Texas Comptroller Rules ──

  // TX Franchise Tax - May 15, extension to November 15
  {
    id: "rule-tx-franchise-filing",
    obligationId: "obl-tx-franchise",
    ruleSummary:
      "Texas franchise tax return due May 15. Automatic 6-month extension to November 15.",
    dueDateRule: {
      type: "fixed",
      month: 5,
      day: 15,
      adjustForWeekendHoliday: true,
      extensionRule: {
        month: 11,
        day: 15,
        adjustForWeekendHoliday: true,
      },
    },
    verificationStatus: "verified",
    sourceName: "Texas Comptroller of Public Accounts",
    sourceUrl: "https://comptroller.texas.gov/taxes/franchise/",
    currentVersion: 1,
  },
  // TX Sales & Use Tax - Quarterly (modeled for Beta)
  {
    id: "rule-tx-sales-quarterly",
    obligationId: "obl-tx-sales",
    ruleSummary:
      "Texas sales and use tax return due quarterly (Beta model): Apr 20, Jul 20, Oct 20, Jan 20 of the following year.",
    dueDateRule: {
      type: "quarterly",
      quarters: {
        q1: { month: 4, day: 20 },
        q2: { month: 7, day: 20 },
        q3: { month: 10, day: 20 },
        q4: { month: 1, day: 20, yearOffset: 1 },
      },
      adjustForWeekendHoliday: true,
    },
    verificationStatus: "source_changed",
    sourceName: "Texas Comptroller of Public Accounts",
    sourceUrl: "https://comptroller.texas.gov/taxes/sales/",
    currentVersion: 1,
    sourceLastChangedAt: new Date("2026-04-15T00:00:00.000Z"),
    verificationNotes:
      "Official source changed after the previous verification. Do not generate official tasks until reviewed.",
  },

  // ── Florida Department of Revenue Rules ──

  // FL Form F-1120 - May 1, extension to November 1
  {
    id: "rule-fl-f1120-filing",
    obligationId: "obl-fl-f1120",
    ruleSummary:
      "Florida corporate income tax return due May 1 (1st day of the 5th month following fiscal year end for calendar year filers). Automatic 6-month extension to November 1.",
    dueDateRule: {
      type: "fixed",
      month: 5,
      day: 1,
      adjustForWeekendHoliday: true,
      extensionRule: {
        month: 11,
        day: 1,
        adjustForWeekendHoliday: true,
      },
    },
    verificationStatus: "verified",
    sourceName: "Florida Department of Revenue",
    sourceUrl: "https://floridarevenue.com/taxes/taxesfees/pages/corporate.aspx",
    currentVersion: 1,
  },
  // FL Form DR-15 Sales & Use Tax - Quarterly (modeled for Beta)
  {
    id: "rule-fl-sales-quarterly",
    obligationId: "obl-fl-sales",
    ruleSummary:
      "Florida sales and use tax return due quarterly (Beta model): Apr 20, Jul 20, Oct 20, Jan 20 of the following year.",
    dueDateRule: {
      type: "quarterly",
      quarters: {
        q1: { month: 4, day: 20 },
        q2: { month: 7, day: 20 },
        q3: { month: 10, day: 20 },
        q4: { month: 1, day: 20, yearOffset: 1 },
      },
      adjustForWeekendHoliday: true,
    },
    verificationStatus: "verified",
    sourceName: "Florida Department of Revenue",
    sourceUrl: "https://floridarevenue.com/taxes/taxesfees/pages/sales_tax.aspx",
    currentVersion: 1,
  },
];

/**
 * Build fully hydrated obligation records suitable for insertion or API response.
 */
export function getSeedObligations() {
  const now = SEED_VERIFIED_AT;
  return seedObligations.map((obl) => ({
    ...obl,
    createdAt: now,
    updatedAt: now,
  }));
}

/**
 * Build fully hydrated rule records suitable for insertion or API response.
 */
export function getSeedRules() {
  const now = SEED_VERIFIED_AT;
  return seedRules.map((rule) => ({
    ...rule,
    lastVerifiedAt: rule.lastVerifiedAt === undefined ? now : rule.lastVerifiedAt,
    sourceLastCheckedAt: rule.sourceLastCheckedAt ?? now,
    sourceLastChangedAt: rule.sourceLastChangedAt ?? null,
    sourceContentHash: rule.sourceContentHash ?? null,
    verifiedBy: rule.verifiedBy === undefined ? "system-seed" : rule.verifiedBy,
    verificationNotes: rule.verificationNotes ?? "Initial seed data for Beta",
    createdAt: now,
    updatedAt: now,
  }));
}
