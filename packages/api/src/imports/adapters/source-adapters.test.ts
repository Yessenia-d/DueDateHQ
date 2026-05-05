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
  assert.ok(result.recognizedFields.includes("sourceRowId"));
  assert.equal(result.rows[0]?.sourceRowId, "K-0007");
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
