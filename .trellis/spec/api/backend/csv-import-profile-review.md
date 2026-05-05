# CSV Import Profile Review

## 1. Scope / Trigger

- Trigger: CSV import crosses source adapters, tRPC mutations, firm-owned import
  tables, existing client/profile lookup, Verified-rule task generation, audit
  history, and the `/import` React route.
- Use this pattern for TaxDome, Drake, Karbon, and QuickBooks CSV onboarding.
  Do not treat unresolved duplicate candidates or relationship suggestions as
  ready to commit.

## 2. Signatures

- API procedures:
  `imports.preview({ sourceSystem, csvText }): ImportPreviewResponse` and
  `imports.commit({ batchId, rowCorrections?, duplicateResolutions?,
  relationshipSuggestionDecisions? }): ImportCommitResponse`.
- Source adapter entrypoint:
  `parseWithSourceAdapter(sourceSystem, csvText): SourceAdapterResult`.
- Review helpers:
  `buildImportReview({ rows, existingClientRelationships,
  existingFilingProfiles })`, `buildReviewGroups(items)`, and
  `summarizeProfileCoverage(profile, obligations, rules)`.
- DB tables:
  `import_batches`, `import_review_items`, `duplicate_candidates`, and
  `relationship_suggestions`.

## 3. Contracts

- `preview` must require firm session, parse the CSV through the selected source
  adapter, store auditable preview metadata, and never persist raw CSV text.
- Adapter output must preserve identifiers as strings, detect headers, expose
  column mapping confidence, include unmapped columns, normalize US state names
  and codes through the shared state-normalization helper, and reject
  QuickBooks bank transaction CSVs.
- Review output is grouped by filing/tax profile and problem type. It must not
  require the CPA to inspect every generated task before commit.
- Duplicate candidates default to `pending`. Commit requires each duplicate to
  resolve to `create`, `update_existing`, or `skip`.
- Relationship suggestions default to `pending`. Commit requires each
  suggestion to be explicitly `accepted` or `rejected`; suggestions are never
  auto-merged.
- Commit creates client relationships and filing profiles only for ready rows.
  Verified rules generate current-plus-next-year official deadline tasks; needs
  review, coverage gap, and unsupported obligations stay visible but do not
  create official tasks.

## 4. Validation & Error Matrix

- Missing firm session -> `UNAUTHORIZED` from `requireFirmSession`.
- Unknown source system -> Zod validation failure.
- Empty or oversized CSV text -> Zod validation failure.
- QuickBooks bank transaction CSV -> `BAD_REQUEST` with customer/contact export
  guidance.
- Missing import batch -> `NOT_FOUND`.
- Batch status not `previewed` -> `BAD_REQUEST`.
- Any duplicate candidate or relationship suggestion still pending on commit ->
  `BAD_REQUEST`.
- Corrected row still missing client name or entity type -> leave the row in
  `needs_review`; do not fail the whole batch.

## 5. Good/Base/Bad Cases

- Good: TaxDome account export with linked contacts produces mapping preview,
  profile review rows, relationship suggestions, and blocks commit until the
  CPA accepts or rejects each suggestion.
- Good: Karbon or QuickBooks rows with full state names normalize to USPS state
  codes before rule matching.
- Base: Drake sample-driven export without reliable headers goes to mapping
  review while preserving source fields.
- Bad: commit creates a client/profile from a row whose duplicate candidate is
  still pending.
- Bad: imported coverage gaps are displayed as Verified official deadline
  tasks.

## 6. Tests Required

- Adapter tests cover TaxDome custom columns, Drake no-header review,
  Karbon/QuickBooks full state-name normalization, and QuickBooks bank CSV
  rejection.
- Review tests assert duplicate candidates and relationship suggestions group
  by profile/problem.
- Router tests assert preview persists metadata without raw CSV, commit creates
  firm-owned relationships/profiles/tasks, unresolved decisions reject, and
  state-name corrections apply before profile creation.
- DB tests assert import table columns, enum values, firm-scoped composite FKs,
  unique indexes, and CHECK constraints.
- Run `pnpm check-types` and focused import/db tests. Plain `node --test` cannot
  execute extensionless TypeScript imports in this repo; use the task's TS test
  runner until the project has a package-level test script.

## 7. Wrong vs Correct

### Wrong

```typescript
export const importsRouter = router({
  commit: publicProcedure.mutation(({ ctx, input }) => {
    return createProfilesForEveryPreviewRow(ctx.db, input.batchId);
  }),
});
```

### Correct

```typescript
export const importsRouter = router({
  commit: publicProcedure
    .input(commitInputSchema)
    .mutation(async ({ ctx, input }) => {
      const session = requireFirmSession(ctx);
      await rejectPendingDuplicateOrRelationshipDecisions(ctx.db, session.firm.id, input.batchId);

      return commitOnlyReadyProfilesAndVerifiedRuleTasks(ctx.db, session.firm.id, input);
    }),
});
```
