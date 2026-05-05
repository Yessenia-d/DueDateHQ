import type { DeadlineTask } from "@due-date-hq/db/schema/deadline-domain";

export const ENTERED_DEADLINE_LABEL = "Entered deadline";
export const ENTERED_DEADLINE_REFERENCE_LABEL = "Reference";
export const ENTERED_DEADLINE_NOT_VERIFIED_COPY = "Not verified by DueDateHQ";
export const ENTERED_DEADLINE_TRUST_LABEL =
  `${ENTERED_DEADLINE_LABEL} - ${ENTERED_DEADLINE_NOT_VERIFIED_COPY}`;

export function getDeadlineTrustLabel(sourceType: DeadlineTask["sourceType"]) {
  return sourceType === "entered_deadline"
    ? ENTERED_DEADLINE_TRUST_LABEL
    : "Verified by DueDateHQ";
}

export function getDeadlineReferenceNote(task: Pick<DeadlineTask, "enteredDeadlineReferenceNote">) {
  return task.enteredDeadlineReferenceNote;
}

export function getDeadlineRecurrenceLabel(
  task: Pick<DeadlineTask, "recurrenceKey" | "sourceType">,
) {
  if (task.sourceType === "verified_rule") {
    return "Generated from a DueDateHQ Verified rule";
  }

  return task.recurrenceKey ? "Recurring entered deadline" : "One-time entered deadline";
}
