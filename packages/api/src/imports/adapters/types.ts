import type {
  ImportCanonicalProfile,
  ImportColumnMapping,
  ImportReviewProblemType,
  ImportSourceSystem,
} from "@due-date-hq/db/schema/imports";

export type CanonicalField =
  | "clientName"
  | "ein"
  | "ssnLast4"
  | "state"
  | "entityType"
  | "county"
  | "fiscalYearType"
  | "sourceClientId"
  | "sourceRowId"
  | "filingProfileName"
  | "relationshipName"
  | "email"
  | "phone";

export type ParsedCsv = {
  headers: string[];
  rows: Array<Record<string, string>>;
  headerDetected: boolean;
};

export type SourceAdapterResult = {
  sourceSystem: ImportSourceSystem;
  detectedSourceProfile: string;
  adapterVersion: string;
  headerDetected: boolean;
  columnMapping: ImportColumnMapping[];
  recognizedFields: string[];
  unmappedColumns: string[];
  mappingConfidence: number;
  rows: CanonicalImportRow[];
  validationMessages: string[];
};

export type CanonicalImportRow = {
  reviewItemId: string;
  rowIndex: number;
  sourceRowId: string;
  profile: ImportCanonicalProfile;
  sourceFields: Record<string, string>;
  relationshipName: string | null;
  problemTypes: ImportReviewProblemType[];
  messages: string[];
};

export type SourceAdapter = {
  sourceSystem: ImportSourceSystem;
  version: string;
  parse(csvText: string): SourceAdapterResult;
};
