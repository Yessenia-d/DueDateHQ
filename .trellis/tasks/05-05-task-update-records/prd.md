# Add task update records for mutable deadline task fields

## Goal

Add field-level update records for product `deadline_tasks` so task status, due-date-related fields, and notes-related fields can produce a durable history row showing the previous value, new value, action, actor, and related audit log.

## What I Already Know

- Existing `audit_logs` records action-level before/after state.
- Existing `deadline_date_events` records date-specific evidence/history for official due-date and firm target date changes.
- The dashboard evidence drawer currently displays date event history but not general task field history.
- The task scope is `deadline_tasks`, not Trellis tasks.

## Requirements

- Add a `deadline_task_update_records` table with firm ownership and a composite firm-scoped FK to `deadline_tasks`.
- Store one row per changed tracked field, not one row per mutation.
- Track only these `deadline_tasks` fields:
  - `status`
  - `currentDueDate`
  - `originalDueDate`
  - `firmTargetDate`
  - `notes` as shown in the task table, sourced from `client_relationships.notes`
- Exclude all other task fields, including client/profile associations, title, jurisdiction, tax category, recurrence, priority, source fields, and timestamps.
- Add a shared API helper that compares before and after rows and inserts update records only for actual changes.
- Wire existing task mutations through the helper:
  - `tasks.updateStatus`
  - `tasks.bulkUpdateStatus`
  - `tasks.updateFirmTargetDate`
  - `tasks.bulkUpdateFirmTargetDate`
- `tasks.markExtended`
- `clients.updateNotes`
- Extend `tasks.getEvidence` with update records.
- Add a Task update history section to the Evidence drawer.

## Acceptance Criteria

- Status changes create a `status` update record.
- Firm target date changes create a `firmTargetDate` update record and keep the existing date event.
- Extension changes create `currentDueDate` and, when applicable, `originalDueDate` update records.
- Bulk updates create records for each changed task.
- No-op mutations do not create update records.
- `tasks.getEvidence` returns update records in stable order.
- DB schema tests cover new table columns, indexes, firm-scoped FK, and type export.
- API tests cover the mutation and evidence behavior above.
- Typecheck passes.

## Out of Scope

- Creation-time initial field records.
- Generic update history for client relationships, filing profiles, tax rules, or Trellis tasks.
- Replacing `audit_logs` or `deadline_date_events`.
