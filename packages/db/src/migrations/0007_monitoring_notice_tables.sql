CREATE TABLE `official_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`jurisdiction` text NOT NULL,
	`agency_name` text NOT NULL,
	`source_type` text NOT NULL,
	`source_url` text NOT NULL,
	`allowlist_level` text NOT NULL,
	`deadline_scope` text NOT NULL,
	`monitor_frequency_hours` integer DEFAULT 24 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`last_checked_at` integer,
	`last_changed_at` integer,
	`last_status` text,
	`last_error_message` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "official_sources_type_check" CHECK("source_type" in ('html', 'pdf', 'rss', 'api', 'manual')),
	CONSTRAINT "official_sources_allowlist_level_check" CHECK("allowlist_level" in ('p0', 'later')),
	CONSTRAINT "official_sources_last_status_check" CHECK("last_status" is null or "last_status" in ('success', 'failed', 'skipped')),
	CONSTRAINT "official_sources_frequency_check" CHECK("monitor_frequency_hours" > 0)
);
--> statement-breakpoint
CREATE TABLE `source_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`snapshot_url` text,
	`captured_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `official_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `source_check_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`checked_at` integer NOT NULL,
	`status` text NOT NULL,
	`http_status` integer,
	`content_hash` text,
	`previous_content_hash` text,
	`changed_detected` integer DEFAULT false NOT NULL,
	`error_message` text,
	FOREIGN KEY (`source_id`) REFERENCES `official_sources`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "source_check_runs_status_check" CHECK("status" in ('success', 'failed', 'skipped')),
	CONSTRAINT "source_check_runs_success_content_check" CHECK("status" != 'success' or "content_hash" is not null),
	CONSTRAINT "source_check_runs_failure_error_check" CHECK("status" = 'success' or "error_message" is not null)
);
--> statement-breakpoint
CREATE TABLE `official_notices` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`source_snapshot_id` text,
	`notice_url` text NOT NULL,
	`notice_title` text NOT NULL,
	`notice_published_at` integer,
	`notice_summary` text NOT NULL,
	`jurisdiction` text NOT NULL,
	`deadline_relevance` text NOT NULL,
	`confidence_label` text NOT NULL,
	`confidence_reasons` text NOT NULL,
	`impact_conditions` text NOT NULL,
	`workspace_match_hints` text NOT NULL,
	`alert_visibility` text NOT NULL,
	`detected_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `official_sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_snapshot_id`) REFERENCES `source_snapshots`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "official_notices_deadline_relevance_check" CHECK("deadline_relevance" in ('high', 'medium', 'low')),
	CONSTRAINT "official_notices_confidence_label_check" CHECK("confidence_label" in ('high', 'medium', 'low')),
	CONSTRAINT "official_notices_alert_visibility_check" CHECK("alert_visibility" in ('workspace_alert', 'internal_queue'))
);
--> statement-breakpoint
CREATE INDEX `official_sources_jurisdiction_idx` ON `official_sources` (`jurisdiction`);
--> statement-breakpoint
CREATE INDEX `official_sources_active_idx` ON `official_sources` (`active`);
--> statement-breakpoint
CREATE INDEX `source_snapshots_source_captured_at_idx` ON `source_snapshots` (`source_id`,`captured_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_snapshots_source_hash_unique` ON `source_snapshots` (`source_id`,`content_hash`);
--> statement-breakpoint
CREATE INDEX `source_check_runs_source_checked_at_idx` ON `source_check_runs` (`source_id`,`checked_at`);
--> statement-breakpoint
CREATE INDEX `source_check_runs_status_idx` ON `source_check_runs` (`status`);
--> statement-breakpoint
CREATE INDEX `official_notices_source_detected_at_idx` ON `official_notices` (`source_id`,`detected_at`);
--> statement-breakpoint
CREATE INDEX `official_notices_alert_visibility_idx` ON `official_notices` (`alert_visibility`);
--> statement-breakpoint
CREATE INDEX `official_notices_confidence_idx` ON `official_notices` (`confidence_label`);
--> statement-breakpoint
CREATE UNIQUE INDEX `official_notices_source_url_unique` ON `official_notices` (`source_id`,`notice_url`);
