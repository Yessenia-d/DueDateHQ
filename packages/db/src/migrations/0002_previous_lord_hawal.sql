CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`firm_id` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`before_state` text,
	`after_state` text,
	`source_type` text NOT NULL,
	`source_id` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "audit_logs_actor_type_check" CHECK("audit_logs"."actor_type" in ('user', 'system', 'monitor')),
	CONSTRAINT "audit_logs_source_type_check" CHECK("audit_logs"."source_type" in ('manual_entry', 'csv_import', 'verified_rule', 'official_notice', 'system')),
	CONSTRAINT "audit_logs_user_actor_check" CHECK("audit_logs"."actor_type" != 'user' or "audit_logs"."actor_user_id" is not null)
);
--> statement-breakpoint
CREATE INDEX `audit_logs_firm_entity_created_at_idx` ON `audit_logs` (`firm_id`,`entity_type`,`entity_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_user_id_idx` ON `audit_logs` (`actor_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `audit_logs_firm_id_id_unique` ON `audit_logs` (`firm_id`,`id`);--> statement-breakpoint
CREATE TABLE `client_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`firm_id` text NOT NULL,
	`display_name` text NOT NULL,
	`relationship_type` text NOT NULL,
	`notes` text,
	`source_system` text DEFAULT 'manual' NOT NULL,
	`created_via` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "client_relationships_type_check" CHECK("client_relationships"."relationship_type" in ('individual', 'business', 'household', 'related_group')),
	CONSTRAINT "client_relationships_created_via_check" CHECK("client_relationships"."created_via" in ('csv_import', 'manual')),
	CONSTRAINT "client_relationships_source_system_check" CHECK("client_relationships"."source_system" in ('manual', 'taxdome', 'drake', 'karbon', 'quickbooks', 'other'))
);
--> statement-breakpoint
CREATE INDEX `client_relationships_firm_display_name_idx` ON `client_relationships` (`firm_id`,`display_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `client_relationships_firm_id_id_unique` ON `client_relationships` (`firm_id`,`id`);--> statement-breakpoint
CREATE TABLE `deadline_date_events` (
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
	CONSTRAINT "deadline_date_events_type_check" CHECK("deadline_date_events"."event_type" in ('official_original_due_date', 'official_extension', 'official_relief_change', 'user_provided_adjustment', 'firm_target_change')),
	CONSTRAINT "deadline_date_events_due_date_payload_check" CHECK("deadline_date_events"."event_type" = 'firm_target_change' or "deadline_date_events"."new_current_due_date" is not null),
	CONSTRAINT "deadline_date_events_due_date_previous_check" CHECK("deadline_date_events"."event_type" in ('official_original_due_date', 'firm_target_change') or "deadline_date_events"."previous_current_due_date" is not null),
	CONSTRAINT "deadline_date_events_firm_target_payload_check" CHECK("deadline_date_events"."event_type" != 'firm_target_change' or "deadline_date_events"."previous_firm_target_date" is not null or "deadline_date_events"."new_firm_target_date" is not null),
	CONSTRAINT "deadline_date_events_current_due_date_separation_check" CHECK("deadline_date_events"."event_type" != 'firm_target_change' or ("deadline_date_events"."previous_current_due_date" is null and "deadline_date_events"."new_current_due_date" is null)),
	CONSTRAINT "deadline_date_events_firm_target_separation_check" CHECK("deadline_date_events"."event_type" = 'firm_target_change' or ("deadline_date_events"."previous_firm_target_date" is null and "deadline_date_events"."new_firm_target_date" is null)),
	CONSTRAINT "deadline_date_events_official_source_check" CHECK("deadline_date_events"."event_type" not in ('official_original_due_date', 'official_extension', 'official_relief_change') or "deadline_date_events"."source_name" is not null or "deadline_date_events"."source_url" is not null or "deadline_date_events"."source_snapshot_id" is not null)
);
--> statement-breakpoint
CREATE INDEX `deadline_date_events_task_created_at_idx` ON `deadline_date_events` (`deadline_task_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `deadline_date_events_firm_event_type_idx` ON `deadline_date_events` (`firm_id`,`event_type`);--> statement-breakpoint
CREATE INDEX `deadline_date_events_audit_log_id_idx` ON `deadline_date_events` (`audit_log_id`);--> statement-breakpoint
CREATE TABLE `deadline_tasks` (
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
	`user_provided_source_note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_relationship_id`) REFERENCES `client_relationships`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`filing_profile_id`) REFERENCES `filing_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`client_relationship_id`) REFERENCES `client_relationships`(`firm_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`client_relationship_id`,`filing_profile_id`) REFERENCES `filing_profiles`(`firm_id`,`client_relationship_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "deadline_tasks_status_check" CHECK("deadline_tasks"."status" in ('not_started', 'in_progress', 'waiting_on_client', 'done')),
	CONSTRAINT "deadline_tasks_priority_check" CHECK("deadline_tasks"."priority" in ('low', 'normal', 'high', 'urgent')),
	CONSTRAINT "deadline_tasks_source_type_check" CHECK("deadline_tasks"."source_type" in ('verified_rule', 'user_provided')),
	CONSTRAINT "deadline_tasks_created_via_check" CHECK("deadline_tasks"."created_via" in ('system_rule', 'manual')),
	CONSTRAINT "deadline_tasks_source_created_via_check" CHECK(("deadline_tasks"."source_type" = 'verified_rule' and "deadline_tasks"."created_via" = 'system_rule') or ("deadline_tasks"."source_type" = 'user_provided' and "deadline_tasks"."created_via" = 'manual')),
	CONSTRAINT "deadline_tasks_verified_rule_tax_rule_check" CHECK("deadline_tasks"."source_type" != 'verified_rule' or "deadline_tasks"."tax_rule_id" is not null),
	CONSTRAINT "deadline_tasks_user_source_note_check" CHECK("deadline_tasks"."source_type" != 'user_provided' or "deadline_tasks"."user_provided_source_note" is not null)
);
--> statement-breakpoint
CREATE INDEX `deadline_tasks_firm_due_date_idx` ON `deadline_tasks` (`firm_id`,`current_due_date`);--> statement-breakpoint
CREATE INDEX `deadline_tasks_firm_status_idx` ON `deadline_tasks` (`firm_id`,`status`);--> statement-breakpoint
CREATE INDEX `deadline_tasks_firm_priority_idx` ON `deadline_tasks` (`firm_id`,`priority`);--> statement-breakpoint
CREATE INDEX `deadline_tasks_client_relationship_idx` ON `deadline_tasks` (`client_relationship_id`);--> statement-breakpoint
CREATE INDEX `deadline_tasks_filing_profile_idx` ON `deadline_tasks` (`filing_profile_id`);--> statement-breakpoint
CREATE INDEX `deadline_tasks_tax_rule_idx` ON `deadline_tasks` (`tax_rule_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `deadline_tasks_firm_id_id_unique` ON `deadline_tasks` (`firm_id`,`id`);--> statement-breakpoint
CREATE TABLE `filing_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`firm_id` text NOT NULL,
	`client_relationship_id` text NOT NULL,
	`display_name` text NOT NULL,
	`ein` text,
	`ssn_last4` text,
	`entity_type` text NOT NULL,
	`states` text NOT NULL,
	`county` text,
	`fiscal_year_type` text NOT NULL,
	`coverage_state` text DEFAULT 'needs_review' NOT NULL,
	`notes` text,
	`source_system` text DEFAULT 'manual' NOT NULL,
	`source_row_id` text,
	`created_via` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_relationship_id`) REFERENCES `client_relationships`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`client_relationship_id`) REFERENCES `client_relationships`(`firm_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "filing_profiles_entity_type_check" CHECK("filing_profiles"."entity_type" in ('individual', 'sole_prop', 's_corp', 'c_corp', 'partnership', 'llc', 'trust_estate', 'nonprofit', 'other')),
	CONSTRAINT "filing_profiles_fiscal_year_type_check" CHECK("filing_profiles"."fiscal_year_type" in ('calendar_year', 'fiscal_year')),
	CONSTRAINT "filing_profiles_coverage_state_check" CHECK("filing_profiles"."coverage_state" in ('ready', 'needs_review', 'coverage_gap', 'unsupported')),
	CONSTRAINT "filing_profiles_created_via_check" CHECK("filing_profiles"."created_via" in ('csv_import', 'manual')),
	CONSTRAINT "filing_profiles_source_system_check" CHECK("filing_profiles"."source_system" in ('manual', 'taxdome', 'drake', 'karbon', 'quickbooks', 'other')),
	CONSTRAINT "filing_profiles_identity_check" CHECK("filing_profiles"."ein" is null or "filing_profiles"."ssn_last4" is null)
);
--> statement-breakpoint
CREATE INDEX `filing_profiles_firm_client_relationship_idx` ON `filing_profiles` (`firm_id`,`client_relationship_id`);--> statement-breakpoint
CREATE INDEX `filing_profiles_firm_entity_type_idx` ON `filing_profiles` (`firm_id`,`entity_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `filing_profiles_firm_client_id_unique` ON `filing_profiles` (`firm_id`,`client_relationship_id`,`id`);