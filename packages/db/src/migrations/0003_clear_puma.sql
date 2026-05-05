CREATE TABLE `tax_obligations` (
	`id` text PRIMARY KEY NOT NULL,
	`jurisdiction` text NOT NULL,
	`jurisdiction_level` text NOT NULL,
	`agency_name` text NOT NULL,
	`tax_category` text NOT NULL,
	`obligation_name` text NOT NULL,
	`entity_types` text NOT NULL,
	`known_status` text DEFAULT 'known' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tax_rule_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`rule_id` text NOT NULL,
	`version` integer NOT NULL,
	`rule_summary` text NOT NULL,
	`due_date_rule` text NOT NULL,
	`source_snapshot_id` text,
	`published_at` integer NOT NULL,
	`published_by` text,
	FOREIGN KEY (`rule_id`) REFERENCES `tax_rules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tax_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`obligation_id` text NOT NULL,
	`rule_summary` text NOT NULL,
	`due_date_rule` text NOT NULL,
	`verification_status` text DEFAULT 'needs_review' NOT NULL,
	`source_name` text,
	`source_url` text,
	`last_verified_at` integer,
	`source_last_checked_at` integer,
	`source_last_changed_at` integer,
	`source_content_hash` text,
	`verified_by` text,
	`verification_notes` text,
	`current_version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`obligation_id`) REFERENCES `tax_obligations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `verification_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`firm_id` text NOT NULL,
	`request_type` text NOT NULL,
	`obligation_id` text,
	`tax_rule_id` text,
	`deadline_task_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`message` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "verification_requests_type_check" CHECK("verification_requests"."request_type" in ('source_changed', 'needs_review', 'user_requested', 'manual_deadline', 'coverage_gap_dismissed')),
	CONSTRAINT "verification_requests_status_check" CHECK("verification_requests"."status" in ('open', 'approved', 'rejected', 'closed')),
	CONSTRAINT "verification_requests_subject_check" CHECK("verification_requests"."obligation_id" is not null or "verification_requests"."tax_rule_id" is not null or "verification_requests"."deadline_task_id" is not null)
);
--> statement-breakpoint
CREATE INDEX `verification_requests_firm_status_idx` ON `verification_requests` (`firm_id`,`status`);--> statement-breakpoint
CREATE INDEX `verification_requests_obligation_idx` ON `verification_requests` (`obligation_id`);