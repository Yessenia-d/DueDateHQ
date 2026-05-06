ALTER TABLE `client_relationships` ADD `source_client_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `client_relationships_firm_source_client_unique` ON `client_relationships` (`firm_id`,`source_system`,`source_client_id`);
