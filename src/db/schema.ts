import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const recipes = sqliteTable("recipes", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    cookingMode: text("cooking_mode", { enum: ["MAKE_AHEAD", "LUNCH", "DINNER"] }).notNull().default("DINNER"),
    recipeCategory: text("recipe_category"), // Keep for migration/compatibility for a while
    prepTime: text("prep_time"), // ISO 8601 duration
    cookTime: text("cook_time"), // ISO 8601 duration
    suitableForKids: text("suitable_for_kids", { mode: "json" }), // { name: string, ageRange?: string }
    recipeIngredient: text("recipe_ingredient", { mode: "json" }), // JSON array of ingredients
    recipeInstructions: text("recipe_instructions", { mode: "json" }), // JSON array or Markdown string of steps
    url: text("url"), // Reference URL
    images: text("images", { mode: "json" }), // JSON array of image keys (R2 keys)
    structuredData: text("structured_data", { mode: "json" }), // Full Schema.org JSON-LD (optional)
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(new Date()),
});

export const tags = sqliteTable("tags", {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(), // Lowercased, trimmed
});

export const recipeTags = sqliteTable("recipe_tags", {
    recipeId: text("recipe_id")
        .notNull()
        .references(() => recipes.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
        .notNull()
        .references(() => tags.id, { onDelete: "cascade" }),
}, (t) => ({
    pk: primaryKey({ columns: [t.recipeId, t.tagId] }),
}));
