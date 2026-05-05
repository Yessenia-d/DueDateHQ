CREATE TABLE `deadline_task_update_records` (
	`id` text PRIMARY KEY NOT NULL,
	`firm_id` text NOT NULL,
	`deadline_task_id` text NOT NULL,
	`field_name` text NOT NULL,
	`previous_value` text,
	`new_value` text,
	`action` text NOT NULL,
	`audit_log_id` text,
	`actor_user_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deadline_task_id`) REFERENCES `deadline_tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`audit_log_id`) REFERENCES `audit_logs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`firm_id`,`deadline_task_id`) REFERENCES `deadline_tasks`(`firm_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`firm_id`,`audit_log_id`) REFERENCES `audit_logs`(`firm_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "deadline_task_update_records_field_name_check" CHECK("field_name" in ('status', 'currentDueDate', 'originalDueDate', 'firmTargetDate', 'notes')),
	CONSTRAINT "deadline_task_update_records_changed_value_check" CHECK("previous_value" is not "new_value")
);
--> statement-breakpoint
CREATE INDEX `deadline_task_update_records_task_created_at_idx` ON `deadline_task_update_records` (`deadline_task_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `deadline_task_update_records_firm_field_idx` ON `deadline_task_update_records` (`firm_id`,`field_name`);
--> statement-breakpoint
CREATE INDEX `deadline_task_update_records_audit_log_id_idx` ON `deadline_task_update_records` (`audit_log_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `deadline_task_update_records_firm_id_id_unique` ON `deadline_task_update_records` (`firm_id`,`id`);
