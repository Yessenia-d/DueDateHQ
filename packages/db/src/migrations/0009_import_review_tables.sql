PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `duplicate_candidates` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE `duplicate_candidates` RENAME TO `__legacy_duplicate_candidates_0009`;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `relationship_suggestions` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE `relationship_suggestions` RENAME TO `__legacy_relationship_suggestions_0009`;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `import_review_items` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE `import_review_items` RENAME TO `__legacy_import_review_items_0009`;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `import_batches` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE `import_batches` RENAME TO `__legacy_import_batches_0009`;
--> statement-breakpoint
DROP INDEX IF EXISTS `duplicate_candidates_batch_resolution_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `relationship_suggestions_batch_status_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `import_review_items_batch_status_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `import_review_items_firm_batch_id_unique`;
--> statement-breakpoint
DROP INDEX IF EXISTS `import_batches_firm_created_at_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `import_batches_firm_status_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `import_batches_firm_id_id_unique`;
--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`firm_id` text NOT NULL,
	`source_system` text NOT NULL,
	`status` text DEFAULT 'previewed' NOT NULL,
	`adapter_profile` text NOT NULL,
	`adapter_version` text NOT NULL,
	`total_rows` integer NOT NULL,
	`accepted_rows` integer NOT NULL,
	`review_rows` integer NOT NULL,
	`duplicate_rows` integer NOT NULL,
	`header_detected` integer NOT NULL,
	`mapping_confidence` integer NOT NULL,
	`column_mapping` text NOT NULL,
	`recognized_fields` text NOT NULL,
	`unmapped_columns` text NOT NULL,
	`validation_messages` text NOT NULL,
	`created_at` integer NOT NULL,
	`committed_at` integer,
	FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "import_batches_source_system_check" CHECK("source_system" in ('taxdome', 'drake', 'karbon', 'quickbooks')),
	CONSTRAINT "import_batches_status_check" CHECK("status" in ('previewed', 'committed', 'failed')),
	CONSTRAINT "import_batches_counts_check" CHECK("total_rows" >= 0 and "accepted_rows" >= 0 and "review_rows" >= 0 and "duplicate_rows" >= 0)
);
--> statement-breakpoint
CREATE INDEX `import_batches_firm_created_at_idx` ON `import_batches` (`firm_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `import_batches_firm_status_idx` ON `import_batches` (`firm_id`,`status`);
--> statement-breakpoint
CREATE UNIQUE INDEX `import_batches_firm_id_id_unique` ON `import_batches` (`firm_id`,`id`);
--> statement-breakpoint
CREATE TABLE `import_review_items` (
	`id` text PRIMARY KEY NOT NULL,
	`firm_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`source_row_id` text NOT NULL,
	`row_index` integer NOT NULL,
	`status` text NOT NULL,
	`problem_types` text NOT NULL,
	`canonical_profile` text NOT NULL,
	`source_fields` text NOT NULL,
	`messages` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`batch_id`) REFERENCES `import_batches`(`firm_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "import_review_items_status_check" CHECK("status" in ('accepted', 'needs_review', 'committed', 'skipped'))
);
--> statement-breakpoint
CREATE INDEX `import_review_items_batch_status_idx` ON `import_review_items` (`firm_id`,`batch_id`,`status`);
--> statement-breakpoint
CREATE UNIQUE INDEX `import_review_items_firm_batch_id_unique` ON `import_review_items` (`firm_id`,`batch_id`,`id`);
--> statement-breakpoint
CREATE TABLE `relationship_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`firm_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`incoming_review_item_id` text NOT NULL,
	`suggested_client_relationship_id` text,
	`reason` text NOT NULL,
	`suggested_action` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`batch_id`) REFERENCES `import_batches`(`firm_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`batch_id`,`incoming_review_item_id`) REFERENCES `import_review_items`(`firm_id`,`batch_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`suggested_client_relationship_id`) REFERENCES `client_relationships`(`firm_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "relationship_suggestions_action_check" CHECK("suggested_action" in ('confirm_relationship', 'keep_separate')),
	CONSTRAINT "relationship_suggestions_status_check" CHECK("status" in ('pending', 'accepted', 'rejected'))
);
--> statement-breakpoint
CREATE INDEX `relationship_suggestions_batch_status_idx` ON `relationship_suggestions` (`firm_id`,`batch_id`,`status`);
--> statement-breakpoint
CREATE TABLE `duplicate_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`firm_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`incoming_review_item_id` text NOT NULL,
	`existing_client_relationship_id` text,
	`matched_fields` text NOT NULL,
	`differing_fields` text NOT NULL,
	`suggested_action` text NOT NULL,
	`resolution` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`batch_id`) REFERENCES `import_batches`(`firm_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`batch_id`,`incoming_review_item_id`) REFERENCES `import_review_items`(`firm_id`,`batch_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`existing_client_relationship_id`) REFERENCES `client_relationships`(`firm_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "duplicate_candidates_action_check" CHECK("suggested_action" in ('create', 'update_existing', 'skip')),
	CONSTRAINT "duplicate_candidates_resolution_check" CHECK("resolution" in ('pending', 'create', 'update_existing', 'skip'))
);
--> statement-breakpoint
CREATE INDEX `duplicate_candidates_batch_resolution_idx` ON `duplicate_candidates` (`firm_id`,`batch_id`,`resolution`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
