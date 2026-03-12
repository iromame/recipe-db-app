import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const recipes = sqliteTable("recipes", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    recipeCategory: text("recipe_category"),
    prepTime: text("prep_time"), // ISO 8601 (e.g., PT20M)
    cookTime: text("cook_time"), // ISO 8601 (e.g., PT30M)
    suitableForKids: text("suitable_for_kids"), // JSON string or text flag
    recipeIngredient: text("recipe_ingredient", { mode: "json" }), // JSON array of ingredients
    recipeInstructions: text("recipe_instructions", { mode: "json" }), // JSON array or Markdown string of steps
    url: text("url"), // Reference URL
    images: text("images", { mode: "json" }), // JSON array of image keys (R2 keys)
    structuredData: text("structured_data", { mode: "json" }), // Full Schema.org JSON-LD (optional)
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
});
