CREATE TABLE `recipe_tags` (
	`recipe_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`recipe_id`, `tag_id`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cooking_mode` text DEFAULT 'DINNER' NOT NULL,
	`recipe_category` text,
	`prep_time` text,
	`cook_time` text,
	`suitable_for_kids` text,
	`recipe_ingredient` text,
	`recipe_instructions` text,
	`url` text,
	`images` text,
	`structured_data` text,
	`created_at` integer DEFAULT '"2026-03-12T07:36:06.764Z"' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_recipes`("id", "name", "cooking_mode", "recipe_category", "prep_time", "cook_time", "suitable_for_kids", "recipe_ingredient", "recipe_instructions", "url", "images", "structured_data", "created_at") SELECT "id", "name", "cooking_mode", "recipe_category", "prep_time", "cook_time", "suitable_for_kids", "recipe_ingredient", "recipe_instructions", "url", "images", "structured_data", "created_at" FROM `recipes`;--> statement-breakpoint
DROP TABLE `recipes`;--> statement-breakpoint
ALTER TABLE `__new_recipes` RENAME TO `recipes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;