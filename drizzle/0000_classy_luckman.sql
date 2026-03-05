CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`recipe_category` text,
	`prep_time` text,
	`cook_time` text,
	`suitable_for_kids` text,
	`recipe_ingredient` text,
	`recipe_instructions` text,
	`structured_data` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
