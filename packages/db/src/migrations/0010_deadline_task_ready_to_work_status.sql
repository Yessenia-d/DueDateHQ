PRAGMA foreign_keys=OFF;
--> statement-breakpoint
DROP INDEX IF EXISTS `deadline_tasks_firm_due_date_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `deadline_tasks_firm_status_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `deadline_tasks_firm_priority_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `deadline_tasks_client_relationship_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `deadline_tasks_filing_profile_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `deadline_tasks_tax_rule_idx`;
--> statement-breakpoint
CREATE TABLE `__new_deadline_tasks_0010` (
	`id` text PRIMARY KEY NOT NULL,
	`firm_id` text NOT NULL,
	`client_relationship_id` text NOT NULL,
	`filing_profile_id` text NOT NULL,
	`tax_rule_id` text,
	`title` text NOT NULL,
	`jurisdiction` text NOT NULL,
	`tax_category` text NOT NULL,
	`current_due_date` text NOT NULL,
	`original_due_date` text,
	`firm_target_date` text,
	`recurrence_key` text,
	`status` text DEFAULT 'not_started' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`source_type` text NOT NULL,
	`created_via` text NOT NULL,
	`entered_deadline_reference_note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_relationship_id`) REFERENCES `client_relationships`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`filing_profile_id`) REFERENCES `filing_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`client_relationship_id`) REFERENCES `client_relationships`(`firm_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`client_relationship_id`,`filing_profile_id`) REFERENCES `filing_profiles`(`firm_id`,`client_relationship_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "deadline_tasks_status_check" CHECK("status" in ('not_started', 'waiting_on_client', 'ready_to_work', 'in_progress', 'done')),
	CONSTRAINT "deadline_tasks_priority_check" CHECK("priority" in ('low', 'normal', 'high', 'urgent')),
	CONSTRAINT "deadline_tasks_source_type_check" CHECK("source_type" in ('verified_rule', 'entered_deadline')),
	CONSTRAINT "deadline_tasks_created_via_check" CHECK("created_via" in ('system_rule', 'manual')),
	CONSTRAINT "deadline_tasks_source_created_via_check" CHECK(("source_type" = 'verified_rule' and "created_via" = 'system_rule') or ("source_type" = 'entered_deadline' and "created_via" = 'manual')),
	CONSTRAINT "deadline_tasks_verified_rule_tax_rule_check" CHECK("source_type" != 'verified_rule' or "tax_rule_id" is not null),
	CONSTRAINT "deadline_tasks_entered_deadline_reference_note_check" CHECK("source_type" != 'entered_deadline' or "entered_deadline_reference_note" is not null)
);
--> statement-breakpoint
INSERT INTO `__new_deadline_tasks_0010` (
	`id`,
	`firm_id`,
	`client_relationship_id`,
	`filing_profile_id`,
	`tax_rule_id`,
	`title`,
	`jurisdiction`,
	`tax_category`,
	`current_due_date`,
	`original_due_date`,
	`firm_target_date`,
	`recurrence_key`,
	`status`,
	`priority`,
	`source_type`,
	`created_via`,
	`entered_deadline_reference_note`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`firm_id`,
	`client_relationship_id`,
	`filing_profile_id`,
	`tax_rule_id`,
	`title`,
	`jurisdiction`,
	`tax_category`,
	`current_due_date`,
	`original_due_date`,
	`firm_target_date`,
	`recurrence_key`,
	`status`,
	`priority`,
	`source_type`,
	`created_via`,
	`entered_deadline_reference_note`,
	`created_at`,
	`updated_at`
FROM `deadline_tasks`;
--> statement-breakpoint
DROP TABLE `deadline_tasks`;
--> statement-breakpoint
ALTER TABLE `__new_deadline_tasks_0010` RENAME TO `deadline_tasks`;
--> statement-breakpoint
CREATE INDEX `deadline_tasks_firm_due_date_idx` ON `deadline_tasks` (`firm_id`,`current_due_date`);
--> statement-breakpoint
CREATE INDEX `deadline_tasks_firm_status_idx` ON `deadline_tasks` (`firm_id`,`status`);
--> statement-breakpoint
CREATE INDEX `deadline_tasks_firm_priority_idx` ON `deadline_tasks` (`firm_id`,`priority`);
--> statement-breakpoint
CREATE INDEX `deadline_tasks_client_relationship_idx` ON `deadline_tasks` (`client_relationship_id`);
--> statement-breakpoint
CREATE INDEX `deadline_tasks_filing_profile_idx` ON `deadline_tasks` (`filing_profile_id`);
--> statement-breakpoint
CREATE INDEX `deadline_tasks_tax_rule_idx` ON `deadline_tasks` (`tax_rule_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `deadline_tasks_firm_id_id_unique` ON `deadline_tasks` (`firm_id`,`id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
