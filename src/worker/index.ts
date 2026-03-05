import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { recipes } from "../db/schema";

// To keep things simple and zero-dependency, let's use standard Web Crypto API.

const app = new Hono<{ Bindings: Env }>();

app.get("/api/recipes", async (c) => {
    const db = drizzle(c.env.recipe_db);
    const allRecipes = await db.select().from(recipes).all();
    return c.json(allRecipes);
});

app.get("/api/recipes/:id", async (c) => {
    const db = drizzle(c.env.recipe_db);
    const recipeId = c.req.param("id");
    const recipe = await db.select().from(recipes).where(eq(recipes.id, recipeId)).get();

    if (!recipe) {
        return c.json({ error: "Recipe not found" }, 404);
    }

    return c.json(recipe);
});

app.post("/api/recipes", async (c) => {
    const db = drizzle(c.env.recipe_db);
    const body = await c.req.json();
    // Body expected to match Schema.org Recipe structure mapped to our schema

    const newId = crypto.randomUUID();
    const newRecipe = {
        id: newId,
        name: body.name || "Untitled Recipe",
        recipeCategory: body.recipeCategory || null,
        prepTime: body.prepTime || null,
        cookTime: body.cookTime || null,
        suitableForKids: body.suitableForKids ? JSON.stringify(body.suitableForKids) : null,
        recipeIngredient: body.recipeIngredient ? JSON.stringify(body.recipeIngredient) : null,
        recipeInstructions: body.recipeInstructions ? JSON.stringify(body.recipeInstructions) : null,
        structuredData: JSON.stringify(body), // Store full original JSON for future-proofing
    };

    await db.insert(recipes).values(newRecipe).run();

    return c.json(newRecipe, 201);
});

app.put("/api/recipes/:id", async (c) => {
    const db = drizzle(c.env.recipe_db);
    const recipeId = c.req.param("id");
    const body = await c.req.json();

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.recipeCategory !== undefined) updateData.recipeCategory = body.recipeCategory;
    if (body.prepTime !== undefined) updateData.prepTime = body.prepTime;
    if (body.cookTime !== undefined) updateData.cookTime = body.cookTime;
    if (body.suitableForKids !== undefined) updateData.suitableForKids = JSON.stringify(body.suitableForKids);
    if (body.recipeIngredient !== undefined) updateData.recipeIngredient = JSON.stringify(body.recipeIngredient);
    if (body.recipeInstructions !== undefined) updateData.recipeInstructions = JSON.stringify(body.recipeInstructions);
    if (body.structuredData !== undefined) updateData.structuredData = JSON.stringify(body.structuredData);

    await db.update(recipes).set(updateData).where(eq(recipes.id, recipeId)).run();

    return c.json({ success: true, updated: recipeId });
});

app.delete("/api/recipes/:id", async (c) => {
    const db = drizzle(c.env.recipe_db);
    const recipeId = c.req.param("id");
    await db.delete(recipes).where(eq(recipes.id, recipeId)).run();
    return c.json({ success: true });
});

export default app;
