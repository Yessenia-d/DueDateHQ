PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_deadline_tasks` (
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
	CONSTRAINT "deadline_tasks_status_check" CHECK("status" in ('not_started', 'in_progress', 'waiting_on_client', 'done')),
	CONSTRAINT "deadline_tasks_priority_check" CHECK("priority" in ('low', 'normal', 'high', 'urgent')),
	CONSTRAINT "deadline_tasks_source_type_check" CHECK("source_type" in ('verified_rule', 'entered_deadline')),
	CONSTRAINT "deadline_tasks_created_via_check" CHECK("created_via" in ('system_rule', 'manual')),
	CONSTRAINT "deadline_tasks_source_created_via_check" CHECK(("source_type" = 'verified_rule' and "created_via" = 'system_rule') or ("source_type" = 'entered_deadline' and "created_via" = 'manual')),
	CONSTRAINT "deadline_tasks_verified_rule_tax_rule_check" CHECK("source_type" != 'verified_rule' or "tax_rule_id" is not null),
	CONSTRAINT "deadline_tasks_entered_deadline_reference_note_check" CHECK("source_type" != 'entered_deadline' or "entered_deadline_reference_note" is not null)
);
--> statement-breakpoint
INSERT INTO `__new_deadline_tasks` (
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
	CASE `source_type`
		WHEN 'user_provided' THEN 'entered_deadline'
		ELSE `source_type`
	END,
	`created_via`,
	`user_provided_source_note`,
	`created_at`,
	`updated_at`
FROM `deadline_tasks`;
--> statement-breakpoint
DROP TABLE `deadline_tasks`;
--> statement-breakpoint
ALTER TABLE `__new_deadline_tasks` RENAME TO `deadline_tasks`;
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
CREATE TABLE `__new_deadline_date_events` (
	`id` text PRIMARY KEY NOT NULL,
	`firm_id` text NOT NULL,
	`deadline_task_id` text NOT NULL,
	`event_type` text NOT NULL,
	`previous_current_due_date` text,
	`new_current_due_date` text,
	`previous_firm_target_date` text,
	`new_firm_target_date` text,
	`source_name` text,
	`source_url` text,
	`source_snapshot_id` text,
	`created_by` text,
	`audit_log_id` text,
	`created_at` integer NOT NULL,
	`notes` text,
	FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deadline_task_id`) REFERENCES `deadline_tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`audit_log_id`) REFERENCES `audit_logs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`firm_id`,`deadline_task_id`) REFERENCES `deadline_tasks`(`firm_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`audit_log_id`) REFERENCES `audit_logs`(`firm_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "deadline_date_events_type_check" CHECK("event_type" in ('official_original_due_date', 'official_extension', 'official_relief_change', 'entered_deadline_adjustment', 'firm_target_change')),
	CONSTRAINT "deadline_date_events_due_date_payload_check" CHECK("event_type" = 'firm_target_change' or "new_current_due_date" is not null),
	CONSTRAINT "deadline_date_events_due_date_previous_check" CHECK("event_type" in ('official_original_due_date', 'firm_target_change') or "previous_current_due_date" is not null),
	CONSTRAINT "deadline_date_events_firm_target_payload_check" CHECK("event_type" != 'firm_target_change' or "previous_firm_target_date" is not null or "new_firm_target_date" is not null),
	CONSTRAINT "deadline_date_events_current_due_date_separation_check" CHECK("event_type" != 'firm_target_change' or ("previous_current_due_date" is null and "new_current_due_date" is null)),
	CONSTRAINT "deadline_date_events_firm_target_separation_check" CHECK("event_type" = 'firm_target_change' or ("previous_firm_target_date" is null and "new_firm_target_date" is null)),
	CONSTRAINT "deadline_date_events_official_source_check" CHECK("event_type" not in ('official_original_due_date', 'official_extension', 'official_relief_change') or "source_name" is not null or "source_url" is not null or "source_snapshot_id" is not null)
);
--> statement-breakpoint
INSERT INTO `__new_deadline_date_events` (
	`id`,
	`firm_id`,
	`deadline_task_id`,
	`event_type`,
	`previous_current_due_date`,
	`new_current_due_date`,
	`previous_firm_target_date`,
	`new_firm_target_date`,
	`source_name`,
	`source_url`,
	`source_snapshot_id`,
	`created_by`,
	`audit_log_id`,
	`created_at`,
	`notes`
)
SELECT
	`id`,
	`firm_id`,
	`deadline_task_id`,
	CASE `event_type`
		WHEN 'user_provided_adjustment' THEN 'entered_deadline_adjustment'
		ELSE `event_type`
	END,
	`previous_current_due_date`,
	`new_current_due_date`,
	`previous_firm_target_date`,
	`new_firm_target_date`,
	`source_name`,
	`source_url`,
	`source_snapshot_id`,
	`created_by`,
	`audit_log_id`,
	`created_at`,
	`notes`
FROM `deadline_date_events`;
--> statement-breakpoint
DROP TABLE `deadline_date_events`;
--> statement-breakpoint
ALTER TABLE `__new_deadline_date_events` RENAME TO `deadline_date_events`;
--> statement-breakpoint
CREATE INDEX `deadline_date_events_task_created_at_idx` ON `deadline_date_events` (`deadline_task_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `deadline_date_events_firm_event_type_idx` ON `deadline_date_events` (`firm_id`,`event_type`);
--> statement-breakpoint
CREATE INDEX `deadline_date_events_audit_log_id_idx` ON `deadline_date_events` (`audit_log_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
