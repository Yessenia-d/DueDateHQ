import type {
  ImportCanonicalProfile,
  ImportColumnMapping,
  ImportReviewProblemType,
  ImportSourceSystem,
} from "@due-date-hq/db/schema/imports";
import { TRPCError } from "@trpc/server";

import { normalizeStateCode } from "../state-normalization";
import { parseCsvText } from "./csv";
import type { CanonicalField, CanonicalImportRow, SourceAdapterResult } from "./types";

const ADAPTER_VERSION = "2026.05.csv-import-v1";

const fieldAliases: Record<CanonicalField, string[]> = {
  clientName: [
    "accountname",
    "clientname",
    "customer",
    "customername",
    "displayname",
    "fullname",
    "name",
    "organizationname",
    "company",
    "companyname",
    "taxpayername",
    "businessname",
    "contactname",
  ],
  ein: ["ein", "fein", "federalid", "federaltaxid", "taxid", "taxidnumber", "ssnein"],
  ssnLast4: ["ssn", "ssnlast4", "ssnlastfour", "tinlast4", "tinlastfour"],
  state: [
    "state",
    "taxstate",
    "filingstate",
    "billingstate",
    "addressstate",
    "province",
    "stateprovince",
  ],
  entityType: [
    "entitytype",
    "clienttype",
    "customertype",
    "returntype",
    "taxreturn",
    "taxform",
    "businessstructure",
    "type",
    "entity",
  ],
  county: ["county", "taxcounty", "filingcounty"],
  fiscalYearType: ["fiscalyear", "fiscalyeartype", "fiscalyearend", "yearend", "fye"],
  sourceRowId: [
    "clientid",
    "clientidentifier",
    "clientnumber",
    "accountid",
    "customerid",
    "contactid",
    "identifier",
    "id",
    "number",
  ],
  relationshipName: [
    "linkedaccount",
    "linkedaccounts",
    "linkedcontact",
    "linkedcontacts",
    "belongsto",
    "associatedorganization",
    "clientgroup",
    "parentcustomer",
    "subcustomerof",
  ],
  email: ["email", "emailaddress", "primaryemail"],
  phone: ["phone", "phonenumber", "primaryphone", "mobilephone"],
};

const sourceProfileSignals: Record<ImportSourceSystem, Array<{ profile: string; signals: string[] }>> = {
  taxdome: [
    { profile: "taxdome_accounts_v1", signals: ["accountname", "linkedcontacts", "tags"] },
    { profile: "taxdome_contacts_v1", signals: ["contactname", "linkedaccounts", "firstname"] },
  ],
  drake: [
    { profile: "drake_client_export_v1", signals: ["clientid", "taxpayername", "returntype"] },
  ],
  karbon: [
    { profile: "karbon_bulk_update_v1", signals: ["associatedorganization", "belongsto"] },
    { profile: "karbon_import_file_v1", signals: ["organizationname", "clientidentifier"] },
  ],
  quickbooks: [
    { profile: "quickbooks_online_customer_contact_v1", signals: ["customer", "billingstate"] },
    { profile: "quickbooks_desktop_customer_vendor_v1", signals: ["name", "customer"] },
  ],
};

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getMappedField(header: string): CanonicalField | null {
  const normalized = normalizeHeader(header);

  for (const [field, aliases] of Object.entries(fieldAliases)) {
    if (aliases.includes(normalized)) {
      return field as CanonicalField;
    }
  }

  if (normalized.includes("ein")) return "ein";
  if (normalized.includes("ssn")) return "ssnLast4";
  if (normalized.includes("state")) return "state";
  if (normalized.includes("county")) return "county";
  if (normalized.includes("fiscal")) return "fiscalYearType";
  if (normalized.includes("entity") || normalized.includes("return")) return "entityType";
  if (normalized.includes("email")) return "email";
  if (normalized.includes("phone")) return "phone";

  return null;
}

function getColumnMapping(headers: readonly string[]): ImportColumnMapping[] {
  return headers.map((header) => {
    const canonicalField = getMappedField(header);
    const normalized = normalizeHeader(header);
    const directAlias = canonicalField
      ? fieldAliases[canonicalField].includes(normalized)
      : false;

    return {
      sourceColumn: header,
      canonicalField,
      confidence: canonicalField ? (directAlias ? "high" : "medium") : "low",
    };
  });
}

function readMappedValue(
  row: Record<string, string>,
  mapping: readonly ImportColumnMapping[],
  field: CanonicalField,
): string | null {
  const mappedColumn = mapping.find((column) => column.canonicalField === field);
  return mappedColumn ? normalizeValue(row[mappedColumn.sourceColumn]) : null;
}

function combineNameParts(row: Record<string, string>): string | null {
  const entries = Object.entries(row);
  const first = entries.find(([key]) => normalizeHeader(key) === "firstname")?.[1]?.trim();
  const last = entries.find(([key]) => normalizeHeader(key) === "lastname")?.[1]?.trim();
  const company = entries.find(([key]) => normalizeHeader(key) === "companyname")?.[1]?.trim();
  const joined = [first, last].filter(Boolean).join(" ").trim();

  return normalizeValue(company) ?? normalizeValue(joined);
}

function normalizeTaxIdentifier(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits || value.trim();
}

function normalizeSsnLast4(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 4) return digits.slice(-4);
  return null;
}

function normalizeEntityType(value: string | null): {
  entityType: ImportCanonicalProfile["entityType"];
  fuzzy: boolean;
} {
  if (!value) return { entityType: null, fuzzy: false };
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  if (/\b1040\b|individual|person|personal/.test(normalized)) {
    return { entityType: "individual", fuzzy: false };
  }
  if (/sole/.test(normalized)) return { entityType: "sole_prop", fuzzy: false };
  if (/1120\s*s|1120s|s corp|scorp|subchapter s/.test(normalized)) {
    return { entityType: "s_corp", fuzzy: false };
  }
  if (/1120|c corp|ccorp|corporation|inc\b/.test(normalized)) {
    return { entityType: "c_corp", fuzzy: false };
  }
  if (/1065|partnership|partner/.test(normalized)) {
    return { entityType: "partnership", fuzzy: false };
  }
  if (/\bllc\b|limited liability/.test(normalized)) return { entityType: "llc", fuzzy: false };
  if (/1041|trust|estate/.test(normalized)) return { entityType: "trust_estate", fuzzy: false };
  if (/nonprofit|not for profit|501/.test(normalized)) {
    return { entityType: "nonprofit", fuzzy: false };
  }
  if (/business|organization|company|customer/.test(normalized)) {
    return { entityType: null, fuzzy: true };
  }

  return { entityType: null, fuzzy: true };
}

function normalizeFiscalYearType(value: string | null): ImportCanonicalProfile["fiscalYearType"] {
  if (!value) return "calendar_year";
  const normalized = value.toLowerCase();
  if (normalized.includes("calendar") || normalized.includes("12/31")) {
    return "calendar_year";
  }
  return "fiscal_year";
}

function detectSourceProfile(sourceSystem: ImportSourceSystem, headers: readonly string[]): string {
  const normalizedHeaders = new Set(headers.map(normalizeHeader));
  const profiles = sourceProfileSignals[sourceSystem];
  const best = profiles
    .map((profile) => ({
      profile: profile.profile,
      score: profile.signals.filter((signal) => normalizedHeaders.has(signal)).length,
    }))
    .sort((a, b) => b.score - a.score)[0];

  return best?.score ? best.profile : profiles[0]?.profile ?? `${sourceSystem}_csv_v1`;
}

function isQuickBooksBankCsv(headers: readonly string[]): boolean {
  const normalizedHeaders = new Set(headers.map(normalizeHeader));
  const hasBankShape =
    normalizedHeaders.has("date") &&
    (normalizedHeaders.has("description") || normalizedHeaders.has("memo")) &&
    normalizedHeaders.has("amount");
  const hasCustomerShape = [...normalizedHeaders].some((header) =>
    ["customer", "customername", "companyname", "billingstate"].includes(header),
  );

  return hasBankShape && !hasCustomerShape;
}

function getMappingConfidence(mapping: readonly ImportColumnMapping[]): number {
  if (mapping.length === 0) return 0;

  const score = mapping.reduce((total, column) => {
    if (column.confidence === "high") return total + 1;
    if (column.confidence === "medium") return total + 0.7;
    return total;
  }, 0);

  return Math.round((score / mapping.length) * 100);
}

function getRowProblems(profile: ImportCanonicalProfile, fuzzyEntity: boolean) {
  const problemTypes: ImportReviewProblemType[] = [];
  const messages: string[] = [];

  if (!profile.clientName) {
    problemTypes.push("missing_client_name");
    messages.push("Client name is missing.");
  }
  if (!profile.entityType) {
    problemTypes.push(fuzzyEntity ? "fuzzy_entity_type" : "missing_entity_type");
    messages.push(
      fuzzyEntity
        ? "Entity type is ambiguous and needs CPA review."
        : "Entity type is missing.",
    );
  }
  if (profile.states.length === 0) {
    problemTypes.push("missing_state");
    messages.push("State is missing; federal tasks can still be reviewed.");
  }
  if (!profile.ein && !profile.ssnLast4) {
    problemTypes.push("missing_tax_id");
    messages.push("Tax ID is missing or unavailable in this export.");
  }

  return { problemTypes, messages };
}

function toCanonicalRows({
  mapping,
  rows,
  sourceSystem,
}: {
  mapping: readonly ImportColumnMapping[];
  rows: Array<Record<string, string>>;
  sourceSystem: ImportSourceSystem;
}): CanonicalImportRow[] {
  return rows.map((row, index) => {
    const sourceRowId =
      readMappedValue(row, mapping, "sourceRowId") ?? `${sourceSystem}-row-${index + 1}`;
    const clientName = readMappedValue(row, mapping, "clientName") ?? combineNameParts(row);
    const rawEntityType = readMappedValue(row, mapping, "entityType");
    const { entityType, fuzzy } = normalizeEntityType(rawEntityType);
    const state = normalizeStateCode(readMappedValue(row, mapping, "state"));
    const ein = normalizeTaxIdentifier(readMappedValue(row, mapping, "ein"));
    const ssnLast4 = normalizeSsnLast4(readMappedValue(row, mapping, "ssnLast4"));
    const profile: ImportCanonicalProfile = {
      clientName,
      ein: entityType === "individual" ? null : ein,
      ssnLast4: entityType === "individual" ? ssnLast4 ?? normalizeSsnLast4(ein) : ssnLast4,
      state,
      states: state ? [state] : [],
      entityType,
      county: readMappedValue(row, mapping, "county"),
      fiscalYearType: normalizeFiscalYearType(readMappedValue(row, mapping, "fiscalYearType")),
      sourceSystem,
      sourceRowId,
    };
    const { problemTypes, messages } = getRowProblems(profile, fuzzy);

    return {
      reviewItemId: crypto.randomUUID(),
      rowIndex: index + 1,
      sourceRowId,
      profile,
      sourceFields: row,
      relationshipName: readMappedValue(row, mapping, "relationshipName"),
      problemTypes,
      messages,
    };
  });
}

export function parseWithSourceAdapter(
  sourceSystem: ImportSourceSystem,
  csvText: string,
): SourceAdapterResult {
  const parsed = parseCsvText(csvText);

  if (sourceSystem === "quickbooks" && isQuickBooksBankCsv(parsed.headers)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "QuickBooks bank transaction CSVs are not client import files. Export a customer or contact list instead.",
    });
  }

  const columnMapping = getColumnMapping(parsed.headers);
  const recognizedFields = [
    ...new Set(
      columnMapping
        .map((column) => column.canonicalField)
        .filter((field): field is string => Boolean(field)),
    ),
  ];
  const unmappedColumns = columnMapping
    .filter((column) => !column.canonicalField)
    .map((column) => column.sourceColumn);
  const mappingConfidence = getMappingConfidence(columnMapping);
  const validationMessages: string[] = [];

  if (!parsed.headerDetected) {
    validationMessages.push("Headers were not confidently detected; review field mapping.");
  }
  if (!recognizedFields.includes("clientName")) {
    validationMessages.push("Client name was not confidently mapped.");
  }
  if (!recognizedFields.includes("entityType")) {
    validationMessages.push("Entity type was not confidently mapped.");
  }

  return {
    sourceSystem,
    detectedSourceProfile: detectSourceProfile(sourceSystem, parsed.headers),
    adapterVersion: ADAPTER_VERSION,
    headerDetected: parsed.headerDetected,
    columnMapping,
    recognizedFields,
    unmappedColumns,
    mappingConfidence,
    rows: toCanonicalRows({
      mapping: columnMapping,
      rows: parsed.rows,
      sourceSystem,
    }),
    validationMessages,
  };
}
