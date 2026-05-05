import type {
  OfficialSourceAllowlistLevel,
  OfficialSourceType,
} from "@due-date-hq/db/schema/monitoring";

export type OfficialSourceDefinition = {
  id: string;
  jurisdiction: string;
  agencyName: string;
  sourceType: OfficialSourceType;
  sourceUrl: string;
  allowlistLevel: OfficialSourceAllowlistLevel;
  deadlineScope: string;
  monitorFrequencyHours: number;
  active: boolean;
};

export const P0_OFFICIAL_SOURCES = [
  {
    id: "irs-federal-deadlines-relief",
    jurisdiction: "federal",
    agencyName: "Internal Revenue Service",
    sourceType: "html",
    sourceUrl: "https://www.irs.gov/",
    allowlistLevel: "p0",
    deadlineScope:
      "Federal individual and small-business filing, payment, extension, estimated tax, disaster relief, and tax relief deadline changes.",
    monitorFrequencyHours: 24,
    active: true,
  },
  {
    id: "ca-ftb-deadlines-relief",
    jurisdiction: "CA",
    agencyName: "California Franchise Tax Board",
    sourceType: "html",
    sourceUrl: "https://www.ftb.ca.gov/",
    allowlistLevel: "p0",
    deadlineScope:
      "California personal income, business/franchise, estimated tax, disaster relief, and tax relief deadline changes.",
    monitorFrequencyHours: 24,
    active: true,
  },
  {
    id: "ny-tax-deadlines-relief",
    jurisdiction: "NY",
    agencyName: "New York Tax Department",
    sourceType: "html",
    sourceUrl: "https://www.tax.ny.gov/",
    allowlistLevel: "p0",
    deadlineScope:
      "New York personal income, business/corporate, estimated tax, disaster relief, and tax relief deadline changes.",
    monitorFrequencyHours: 24,
    active: true,
  },
  {
    id: "tx-comptroller-deadlines-relief",
    jurisdiction: "TX",
    agencyName: "Texas Comptroller of Public Accounts",
    sourceType: "html",
    sourceUrl: "https://comptroller.texas.gov/",
    allowlistLevel: "p0",
    deadlineScope:
      "Texas franchise, sales/use, disaster relief, and tax relief deadline changes.",
    monitorFrequencyHours: 24,
    active: true,
  },
  {
    id: "fl-dor-deadlines-relief",
    jurisdiction: "FL",
    agencyName: "Florida Department of Revenue",
    sourceType: "html",
    sourceUrl: "https://floridarevenue.com/",
    allowlistLevel: "p0",
    deadlineScope:
      "Florida corporate income, sales/use, reemployment, disaster relief, and tax relief deadline changes.",
    monitorFrequencyHours: 24,
    active: true,
  },
] as const satisfies readonly OfficialSourceDefinition[];

export function listOfficialSourceDefinitions(): OfficialSourceDefinition[] {
  return [...P0_OFFICIAL_SOURCES];
}

export function getOfficialSourceDefinition(sourceId: string): OfficialSourceDefinition | null {
  return P0_OFFICIAL_SOURCES.find((source) => source.id === sourceId) ?? null;
}
