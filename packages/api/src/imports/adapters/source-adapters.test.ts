import assert from "node:assert/strict";
import test from "node:test";

import { parseWithSourceAdapter } from "./source-adapters";

test("TaxDome account exports map core filing profile fields and keep custom columns visible", () => {
  const result = parseWithSourceAdapter(
    "taxdome",
    [
      "Account Name,Entity Type,State,Linked Contacts,EIN,Custom Deadline Note",
      '"Acme Advisors LLC","S Corporation",California,"Jane Owner",12-3456789,"Organizer says CA only"',
    ].join("\n"),
  );

  assert.equal(result.detectedSourceProfile, "taxdome_accounts_v1");
  assert.equal(result.headerDetected, true);
  assert.ok(result.recognizedFields.includes("clientName"));
  assert.ok(result.recognizedFields.includes("entityType"));
  assert.ok(result.recognizedFields.includes("state"));
  assert.ok(result.unmappedColumns.includes("Custom Deadline Note"));
  assert.equal(result.rows[0]?.profile.clientName, "Acme Advisors LLC");
  assert.equal(result.rows[0]?.profile.entityType, "s_corp");
  assert.deepEqual(result.rows[0]?.profile.states, ["CA"]);
  assert.equal(result.rows[0]?.profile.ein, "123456789");
  assert.equal(result.rows[0]?.relationshipName, "Jane Owner");
});

test("Drake sample-driven imports require mapping review when headers are missing", () => {
  const result = parseWithSourceAdapter("drake", "Jane Owner,1040,CA");

  assert.equal(result.headerDetected, false);
  assert.ok(result.validationMessages.includes("Headers were not confidently detected; review field mapping."));
  assert.ok(result.validationMessages.includes("Client name was not confidently mapped."));
  assert.ok(result.rows[0]?.problemTypes.includes("missing_client_name"));
});

test("Karbon contact exports map client identifiers and full state names", () => {
  const result = parseWithSourceAdapter(
    "karbon",
    [
      "Organization Name,Client Identifier,Entity Type,State,Belongs To",
      "Garden State Partners,K-0007,Partnership,New Jersey,Parent Group",
    ].join("\n"),
  );

  assert.equal(result.detectedSourceProfile, "karbon_import_file_v1");
  assert.ok(result.recognizedFields.includes("sourceClientId"));
  assert.equal(result.rows[0]?.sourceRowId, "K-0007");
  assert.equal(result.rows[0]?.profile.sourceClientId, "K-0007");
  assert.deepEqual(result.rows[0]?.profile.states, ["NJ"]);
  assert.equal(result.rows[0]?.relationshipName, "Parent Group");
});

test("QuickBooks customer exports map billing state names without treating them as bank CSVs", () => {
  const result = parseWithSourceAdapter(
    "quickbooks",
    [
      "Customer,Company Name,Customer Type,Billing State,EIN",
      "Capitol Advisory,Capitol Advisory LLC,LLC,District of Columbia,98-7654321",
    ].join("\n"),
  );

  assert.equal(result.detectedSourceProfile, "quickbooks_online_customer_contact_v1");
  assert.ok(result.recognizedFields.includes("state"));
  assert.deepEqual(result.rows[0]?.profile.states, ["DC"]);
  assert.equal(result.rows[0]?.profile.ein, "987654321");
});

test("QuickBooks bank transaction CSVs are rejected as the wrong import source", () => {
  assert.throws(
    () => parseWithSourceAdapter("quickbooks", "Date,Description,Amount\n2026-05-05,Deposit,100.00"),
    /QuickBooks bank transaction CSVs are not client import files/,
  );
});

test("TaxDome year-round profile exports detect headers across tax-specific columns", () => {
  const result = parseWithSourceAdapter(
    "taxdome",
    [
      "Account Name,Client ID,Entity Type,State,County,Fiscal Year,EIN,SSN Last 4,Linked Contacts,Tax Profile,Tax Jurisdiction,Period Month,Tax Year,Filing Form,Filing Frequency,Due Date,Filing Status,Amount Due,Custom Deadline Note",
      '"Harbor & Pine Family Office",HPFO-2026-001,S Corporation,California,San Francisco,Calendar Year,12-3456789,,"Alex Harbor; Priya Pine",Federal S corporation income tax,Federal,January,2026,1120-S,Annual,2026-03-16,Filed,0,"Annual S corp return for client business profile"',
      '"Harbor & Pine Family Office",HPFO-2026-002,LLC,California,San Francisco,Calendar Year,33-1112222,,"Priya Pine",Sales and use tax,California,January,2026,CDTFA-401-A,Monthly,2026-02-29,Filed,1840.25,"January CA sales tax profile"',
    ].join("\n"),
  );

  assert.equal(result.headerDetected, true);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0]?.profile.clientName, "Harbor & Pine Family Office");
  assert.equal(result.rows[0]?.profile.entityType, "s_corp");
  assert.deepEqual(result.rows[0]?.profile.states, ["CA"]);
});

test("DueDateHQ canonical CSV fields support source client ids, filing profile names, and multi-state profiles", () => {
  const result = parseWithSourceAdapter(
    "taxdome",
    [
      "source_client_id,source_row_id,client_name,filing_profile_name,entity_type,states,fiscal_year_type,ein,ssn_last4",
      "SRC-100,ROW-1,Harbor Group,Harbor 1120S,S Corporation,CA;NY,calendar_year,12-3456789,",
    ].join("\n"),
  );

  assert.ok(result.recognizedFields.includes("sourceClientId"));
  assert.ok(result.recognizedFields.includes("sourceRowId"));
  assert.ok(result.recognizedFields.includes("filingProfileName"));
  assert.ok(result.recognizedFields.includes("state"));
  assert.equal(result.rows[0]?.sourceRowId, "ROW-1");
  assert.equal(result.rows[0]?.profile.sourceClientId, "SRC-100");
  assert.equal(result.rows[0]?.profile.filingProfileName, "Harbor 1120S");
  assert.equal(result.rows[0]?.profile.entityType, "s_corp");
  assert.deepEqual(result.rows[0]?.profile.states, ["CA", "NY"]);
});

test("canonical rows missing entity type stay in review and ambiguous states are not silently treated as verified jurisdictions", () => {
  const result = parseWithSourceAdapter(
    "taxdome",
    [
      "client_name,entity_type,states",
      "Review Needed,,CA;Atlantis",
    ].join("\n"),
  );

  assert.equal(result.rows[0]?.profile.entityType, null);
  assert.deepEqual(result.rows[0]?.profile.states, ["CA"]);
  assert.ok(result.rows[0]?.problemTypes.includes("missing_entity_type"));
  assert.ok(result.rows[0]?.problemTypes.includes("missing_state"));
});
