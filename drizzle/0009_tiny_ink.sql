CREATE TABLE `cooking_events` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`created_at` integer DEFAULT '"2026-04-03T04:12:57.927Z"' NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cooking_mode` text DEFAULT 'DINNER' NOT NULL,
	`recipe_category` text,
	`prep_time` text,
	`cook_time` text,
	`suitable_for_kids` text,
	`pinned` integer DEFAULT false NOT NULL,
	`recipe_yield` text,
	`recipe_ingredient` text,
	`recipe_instructions` text,
	`url` text,
	`images` text,
	`structured_data` text,
	`notes` text,
	`created_at` integer DEFAULT '"2026-04-03T04:12:57.926Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2026-04-03T04:12:57.926Z"' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_recipes`("id", "name", "cooking_mode", "recipe_category", "prep_time", "cook_time", "suitable_for_kids", "pinned", "recipe_yield", "recipe_ingredient", "recipe_instructions", "url", "images", "structured_data", "notes", "created_at", "updated_at") SELECT "id", "name", "cooking_mode", "recipe_category", "prep_time", "cook_time", "suitable_for_kids", "pinned", "recipe_yield", "recipe_ingredient", "recipe_instructions", "url", "images", "structured_data", "notes", "created_at", "updated_at" FROM `recipes`;--> statement-breakpoint
DROP TABLE `recipes`;--> statement-breakpoint
ALTER TABLE `__new_recipes` RENAME TO `recipes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;