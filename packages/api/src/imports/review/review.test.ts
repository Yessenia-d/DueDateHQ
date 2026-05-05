import assert from "node:assert/strict";
import test from "node:test";

import type { ClientRelationship, FilingProfile } from "@due-date-hq/db/schema/deadline-domain";

import type { CanonicalImportRow } from "../adapters/types";
import {
  buildImportReview,
  buildReviewGroups,
  summarizeProfileCoverage,
} from "./review";
import { getSeedObligations, getSeedRules } from "../../lib/seed-tax-data";

const now = new Date("2026-05-05T00:00:00.000Z");

function makeRow(overrides: Partial<CanonicalImportRow>): CanonicalImportRow {
  return {
    reviewItemId: "review-base",
    rowIndex: 1,
    sourceRowId: "row-base",
    profile: {
      clientName: "Base Client",
      ein: null,
      ssnLast4: null,
      state: "CA",
      states: ["CA"],
      entityType: "s_corp",
      county: null,
      fiscalYearType: "calendar_year",
      sourceSystem: "taxdome",
      sourceRowId: "row-base",
    },
    sourceFields: {},
    relationshipName: null,
    problemTypes: [],
    messages: [],
    ...overrides,
  };
}

function makeClient(overrides: Partial<ClientRelationship> = {}): ClientRelationship {
  return {
    id: "client-existing",
    firmId: "firm-test",
    displayName: "Acme Advisors LLC",
    relationshipType: "business",
    notes: null,
    sourceSystem: "manual",
    createdVia: "manual",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<FilingProfile> = {}): FilingProfile {
  return {
    id: "profile-existing",
    firmId: "firm-test",
    clientRelationshipId: "client-existing",
    displayName: "Acme Advisors LLC",
    ein: "123456789",
    ssnLast4: null,
    entityType: "s_corp",
    states: ["CA"],
    county: null,
    fiscalYearType: "calendar_year",
    coverageState: "ready",
    notes: null,
    sourceSystem: "manual",
    sourceRowId: null,
    createdVia: "manual",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("import review groups duplicate candidates and relationship suggestions by profile/problem", () => {
  const review = buildImportReview({
    rows: [
      makeRow({
        reviewItemId: "review-acme",
        profile: {
          ...makeRow({}).profile,
          clientName: "Acme Advisors LLC",
          ein: "123456789",
          entityType: "s_corp",
        },
      }),
      makeRow({
        reviewItemId: "review-jane",
        rowIndex: 2,
        sourceRowId: "row-jane",
        profile: {
          ...makeRow({}).profile,
          clientName: "Jane Owner",
          ein: null,
          ssnLast4: "4321",
          entityType: "individual",
        },
        relationshipName: "Acme Advisors LLC",
      }),
    ],
    existingClientRelationships: [makeClient()],
    existingFilingProfiles: [makeProfile()],
  });

  assert.equal(review.duplicateCandidates.length, 1);
  assert.deepEqual(review.duplicateCandidates[0]?.matchedFields, ["client_name", "ein"]);
  assert.equal(review.relationshipSuggestions.length, 1);
  assert.equal(review.relationshipSuggestions[0]?.suggestedClientRelationshipId, "client-existing");

  const duplicateRow = review.items.find((item) => item.id === "review-acme");
  const relationshipRow = review.items.find((item) => item.id === "review-jane");

  assert.ok(duplicateRow?.problemTypes.includes("duplicate_candidate"));
  assert.ok(relationshipRow?.problemTypes.includes("relationship_suggestion"));

  const groups = buildReviewGroups(review.items);
  assert.deepEqual(
    groups.map((group) => group.problemType),
    ["duplicate_candidate", "relationship_suggestion"],
  );
});

test("profile coverage summary separates verified rules from needs-review and coverage-gap obligations", () => {
  const cCorpNy = summarizeProfileCoverage(
    {
      entityType: "c_corp",
      states: ["NY"],
    },
    getSeedObligations(),
    getSeedRules(),
  );

  assert.ok(cCorpNy.verifiedRuleCount > 0);
  assert.ok(cCorpNy.needsReviewObligations.some((item) => item.obligationId === "obl-ny-ct3"));
  assert.equal(cCorpNy.generatedJurisdictions.includes("federal"), true);
  assert.equal(cCorpNy.generatedJurisdictions.includes("NY"), true);

  const partnershipNy = summarizeProfileCoverage(
    {
      entityType: "partnership",
      states: ["NY"],
    },
    getSeedObligations(),
    getSeedRules(),
  );

  assert.ok(partnershipNy.coverageGapObligations.length > 0);
});
