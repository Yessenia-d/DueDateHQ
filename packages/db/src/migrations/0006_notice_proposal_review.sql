CREATE UNIQUE INDEX `filing_profiles_firm_id_id_unique` ON `filing_profiles` (`firm_id`,`id`);
--> statement-breakpoint
CREATE TABLE `notice_impact_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`official_notice_id` text NOT NULL,
	`firm_id` text NOT NULL,
	`filing_profile_id` text,
	`deadline_task_id` text,
	`proposal_type` text NOT NULL,
	`before_state` text NOT NULL,
	`after_state` text NOT NULL,
	`confidence_label` text NOT NULL,
	`confidence_reasons` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`decided_by` text,
	`decided_at` integer,
	`audit_log_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`official_notice_id`) REFERENCES `official_notices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`filing_profile_id`) REFERENCES `filing_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deadline_task_id`) REFERENCES `deadline_tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`decided_by`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`audit_log_id`) REFERENCES `audit_logs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`firm_id`,`filing_profile_id`) REFERENCES `filing_profiles`(`firm_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`deadline_task_id`) REFERENCES `deadline_tasks`(`firm_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`audit_log_id`) REFERENCES `audit_logs`(`firm_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "notice_impact_proposals_type_check" CHECK("proposal_type" in ('task_update', 'coverage_review_status_update')),
	CONSTRAINT "notice_impact_proposals_status_check" CHECK("status" in ('pending', 'approved', 'rejected', 'decide_later')),
	CONSTRAINT "notice_impact_proposals_confidence_label_check" CHECK("confidence_label" in ('high', 'medium', 'low')),
	CONSTRAINT "notice_impact_proposals_target_check" CHECK(("proposal_type" = 'task_update' and "deadline_task_id" is not null) or ("proposal_type" = 'coverage_review_status_update' and "filing_profile_id" is not null)),
	CONSTRAINT "notice_impact_proposals_decision_check" CHECK(("status" = 'pending' and "decided_at" is null and "decided_by" is null) or ("status" != 'pending' and "decided_at" is not null and "decided_by" is not null))
);
--> statement-breakpoint
CREATE INDEX `notice_impact_proposals_notice_status_idx` ON `notice_impact_proposals` (`official_notice_id`,`status`);
--> statement-breakpoint
CREATE INDEX `notice_impact_proposals_firm_status_idx` ON `notice_impact_proposals` (`firm_id`,`status`);
--> statement-breakpoint
CREATE INDEX `notice_impact_proposals_deadline_task_idx` ON `notice_impact_proposals` (`deadline_task_id`);
--> statement-breakpoint
CREATE INDEX `notice_impact_proposals_filing_profile_idx` ON `notice_impact_proposals` (`filing_profile_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `notice_impact_proposals_firm_id_id_unique` ON `notice_impact_proposals` (`firm_id`,`id`);
--> statement-breakpoint
CREATE TABLE `notice_proposal_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`firm_id` text NOT NULL,
	`official_notice_id` text NOT NULL,
	`proposal_id` text NOT NULL,
	`action` text NOT NULL,
	`actor_user_id` text,
	`previous_status` text NOT NULL,
	`new_status` text NOT NULL,
	`before_state` text NOT NULL,
	`after_state` text NOT NULL,
	`audit_log_id` text,
	`bulk_action_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`official_notice_id`) REFERENCES `official_notices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`proposal_id`) REFERENCES `notice_impact_proposals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`audit_log_id`) REFERENCES `audit_logs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`firm_id`,`proposal_id`) REFERENCES `notice_impact_proposals`(`firm_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`audit_log_id`) REFERENCES `audit_logs`(`firm_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "notice_proposal_actions_action_check" CHECK("action" in ('approve', 'reject', 'decide_later')),
	CONSTRAINT "notice_proposal_actions_status_check" CHECK("previous_status" in ('pending', 'approved', 'rejected', 'decide_later') and "new_status" in ('pending', 'approved', 'rejected', 'decide_later'))
);
--> statement-breakpoint
CREATE INDEX `notice_proposal_actions_notice_created_at_idx` ON `notice_proposal_actions` (`official_notice_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `notice_proposal_actions_proposal_created_at_idx` ON `notice_proposal_actions` (`proposal_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `notice_proposal_actions_bulk_action_idx` ON `notice_proposal_actions` (`bulk_action_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `notice_proposal_actions_firm_id_id_unique` ON `notice_proposal_actions` (`firm_id`,`id`);
