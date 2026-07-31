import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";

export const recipes = sqliteTable("recipes", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    cookingMode: text("cooking_mode").notNull().default("DINNER"),
    recipeCategory: text("recipe_category"), // Keep for migration/compatibility for a while
    prepTime: text("prep_time"), // ISO 8601 duration
    cookTime: text("cook_time"), // ISO 8601 duration
    suitableForKids: text("suitable_for_kids", { mode: "json" }), // { name: string, ageRange?: string }
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false), // Mark recipe as pinned
    recipeYield: text("recipe_yield", { mode: "json" }), // { value: number, unit: string }
    recipeIngredient: text("recipe_ingredient", { mode: "json" }), // JSON array of ingredients
    recipeInstructions: text("recipe_instructions", { mode: "json" }), // JSON array or Markdown string of steps
    url: text("url"), // Reference URL
    images: text("images", { mode: "json" }), // JSON array of image keys (R2 keys)
    structuredData: text("structured_data", { mode: "json" }), // Full Schema.org JSON-LD (optional)
    notes: text("notes"), // Free text memo
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

export const cookingEvents = sqliteTable("cooking_events", {
    id: text("id").primaryKey(),
    recipeId: text("recipe_id")
        .notNull()
        .references(() => recipes.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(new Date()),
});

export const shoppingListItems = sqliteTable("shopping_list_items", {
    id: text("id").primaryKey(),
    recipeId: text("recipe_id"), // Nullable for manual items
    recipeName: text("recipe_name"), // Nullable for manual items
    name: text("name").notNull(), // The full text of the item (e.g. "Pork 200g")
    baseName: text("base_name"),
    multiplier: real("multiplier").default(1.0),
    isChecked: integer("is_checked", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(new Date()),
});
