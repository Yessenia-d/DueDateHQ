CREATE TABLE `feature_items` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`spec_path` text NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`priority` text NOT NULL,
	`updated_at` integer NOT NULL
);
