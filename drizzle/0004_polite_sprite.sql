PRAGMA foreign_keys=OFF;
--> statement-breakpoint
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
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_recipes`("id", "name", "cooking_mode", "recipe_category", "prep_time", "cook_time", "suitable_for_kids", "recipe_ingredient", "recipe_instructions", "url", "images", "structured_data", "created_at", "updated_at") SELECT "id", "name", "cooking_mode", "recipe_category", "prep_time", "cook_time", "suitable_for_kids", "recipe_ingredient", "recipe_instructions", "url", "images", "structured_data", "created_at", "created_at" FROM `recipes`;
--> statement-breakpoint
DROP TABLE `recipes`;
--> statement-breakpoint
ALTER TABLE `__new_recipes` RENAME TO `recipes`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;