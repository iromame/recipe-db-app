import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, inArray, desc } from "drizzle-orm";
import { recipes, tags, recipeTags } from "../db/schema";

const app = new Hono<{ Bindings: Env }>();

// Helper to sync tags for a recipe
async function syncTags(db: any, recipeId: string, tagNames: string[]) {
    if (!tagNames) return;

    // 1. Clean and normalize tag names
    const cleanTagNames = [...new Set(tagNames.map((t: string) => t.trim().toLowerCase()).filter(t => t.length > 0))];

    // 2. Get existing tags or create new ones
    const existingTags = await db.select().from(tags).all() as { id: string, name: string }[];
    const tagMap = new Map(existingTags.map(t => [t.name, t.id]));

    const neededTagIds: string[] = [];

    for (const name of cleanTagNames) {
        let tagId = tagMap.get(name);
        if (!tagId) {
            tagId = crypto.randomUUID();
            await db.insert(tags).values({ id: tagId, name }).run();
            tagMap.set(name, tagId);
        }
        neededTagIds.push(tagId as string);
    }

    // 3. Update associations
    await db.delete(recipeTags).where(eq(recipeTags.recipeId, recipeId)).run();
    if (neededTagIds.length > 0) {
        for (const tagId of neededTagIds) {
            await db.insert(recipeTags).values({ recipeId, tagId }).run();
        }
    }
}

// Helper to get tags for multiple recipes
async function attachTags(db: any, recipeList: any[]) {
    if (recipeList.length === 0) return [];

    const recipeIds = recipeList.map(r => r.id);
    const associations = await db.select({
        recipeId: recipeTags.recipeId,
        tagName: tags.name
    })
        .from(recipeTags)
        .innerJoin(tags, eq(recipeTags.tagId, tags.id))
        .where(inArray(recipeTags.recipeId, recipeIds))
        .all() as { recipeId: string, tagName: string }[];

    const tagLookup = associations.reduce((acc: Record<string, string[]>, curr) => {
        if (!acc[curr.recipeId]) acc[curr.recipeId] = [];
        acc[curr.recipeId].push(curr.tagName);
        return acc;
    }, {});

    return recipeList.map((r: any) => ({
        ...r,
        cookingMode: r.cookingMode || (r.recipeCategory?.includes("昼") ? "LUNCH" : r.recipeCategory?.includes("作り置き") ? "MAKE_AHEAD" : "MAKE_AHEAD"),
        tags: tagLookup[r.id] || [],
        recipeIngredient: typeof r.recipeIngredient === 'string' ? JSON.parse(r.recipeIngredient) : r.recipeIngredient,
        recipeInstructions: typeof r.recipeInstructions === 'string' ? JSON.parse(r.recipeInstructions) : r.recipeInstructions,
        images: typeof r.images === 'string' ? JSON.parse(r.images) : r.images,
        suitableForKids: typeof r.suitableForKids === 'string' ? JSON.parse(r.suitableForKids) : r.suitableForKids,
        structuredData: typeof r.structuredData === 'string' ? JSON.parse(r.structuredData) : r.structuredData,
    }));
}

app.get("/api/recipes", async (c) => {
    const db = drizzle(c.env.recipe_db);
    const allRecipes = await db.select().from(recipes).orderBy(desc(recipes.updatedAt)).all();
    const results = await attachTags(db, allRecipes);
    return c.json(results);
});

app.get("/api/recipes/:id", async (c) => {
    const db = drizzle(c.env.recipe_db);
    const recipeId = c.req.param("id");
    const recipe = await db.select().from(recipes).where(eq(recipes.id, recipeId)).get();

    if (!recipe) return c.json({ error: "Recipe not found" }, 404);

    const [enriched] = await attachTags(db, [recipe]);
    return c.json(enriched);
});

app.post("/api/recipes", async (c) => {
    const db = drizzle(c.env.recipe_db);
    const body = await c.req.json();

    const newId = crypto.randomUUID();
    const newRecipe = {
        id: newId,
        name: body.name || "Untitled Recipe",
        cookingMode: body.cookingMode || "MAKE_AHEAD",
        recipeCategory: body.recipeCategory || null,
        prepTime: body.prepTime || null,
        cookTime: body.cookTime || null,
        suitableForKids: body.suitableForKids || null,
        recipeIngredient: body.recipeIngredient || null,
        recipeInstructions: body.recipeInstructions || null,
        url: body.url || null,
        images: body.images || null,
        structuredData: body,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    await db.insert(recipes).values(newRecipe).run();
    if (body.tags) {
        await syncTags(db, newId, body.tags);
    }

    return c.json({ ...newRecipe, tags: body.tags || [] }, 201);
});

app.put("/api/recipes/:id", async (c) => {
    const db = drizzle(c.env.recipe_db);
    const recipeId = c.req.param("id");
    const body = await c.req.json();

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.cookingMode !== undefined) updateData.cookingMode = body.cookingMode;
    if (body.recipeCategory !== undefined) updateData.recipeCategory = body.recipeCategory;
    if (body.prepTime !== undefined) updateData.prepTime = body.prepTime;
    if (body.cookTime !== undefined) updateData.cookTime = body.cookTime;
    if (body.suitableForKids !== undefined) updateData.suitableForKids = body.suitableForKids;
    if (body.recipeIngredient !== undefined) updateData.recipeIngredient = body.recipeIngredient;
    if (body.recipeInstructions !== undefined) updateData.recipeInstructions = body.recipeInstructions;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.images !== undefined) updateData.images = body.images;
    if (body.structuredData !== undefined) updateData.structuredData = body.structuredData;
    updateData.updatedAt = new Date();

    await db.update(recipes).set(updateData).where(eq(recipes.id, recipeId)).run();

    if (body.tags !== undefined) {
        await syncTags(db, recipeId, body.tags);
    }

    return c.json({ success: true });
});

app.delete("/api/recipes/:id", async (c) => {
    const db = drizzle(c.env.recipe_db);
    const recipeId = c.req.param("id");

    const recipe = await db.select().from(recipes).where(eq(recipes.id, recipeId)).get();
    if (recipe && recipe.images) {
        const imageKeys = typeof recipe.images === 'string' ? JSON.parse(recipe.images) : recipe.images;
        if (Array.isArray(imageKeys)) {
            for (const key of imageKeys) {
                await c.env.IMAGES.delete(key);
            }
        }
    }

    await db.delete(recipes).where(eq(recipes.id, recipeId)).run();
    // recipe_tags will be deleted by cascade
    return c.json({ success: true });
});

// Data Export (10-year vision)
app.get("/api/export", async (c) => {
    const db = drizzle(c.env.recipe_db);
    const allRecipes = await db.select().from(recipes).all();
    const enriched = await attachTags(db, allRecipes);

    return c.json({
        version: "1.0",
        exportedAt: new Date().toISOString(),
        recipes: enriched
    }, 200, {
        "Content-Disposition": 'attachment; filename="recipes-export.json"'
    });
});

// Image Proxy / Delivery
app.get("/api/images/:key{.+$}", async (c) => {
    const key = c.req.param("key");
    const object = await c.env.IMAGES.get(key);
    if (!object) return c.json({ error: "Image not found" }, 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(object.body, { headers });
});

// Image Upload
app.post("/api/recipes/:id/images", async (c) => {
    const db = drizzle(c.env.recipe_db);
    const recipeId = c.req.param("id");

    const recipe = await db.select().from(recipes).where(eq(recipes.id, recipeId)).get();
    if (!recipe) return c.json({ error: "Recipe not found" }, 404);

    const body = await c.req.parseBody();
    const file = body["file"];
    if (!(file instanceof File)) {
        return c.json({ error: "Invalid file upload" }, 400);
    }

    const key = `${recipeId}/${crypto.randomUUID()}-${file.name}`;
    await c.env.IMAGES.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
    });

    const currentImages = recipe.images ? (typeof recipe.images === 'string' ? JSON.parse(recipe.images) : recipe.images) : [];
    const updatedImages = [...currentImages, key].slice(-3);
    const now = new Date();

    await db.update(recipes).set({ 
        images: updatedImages,
        updatedAt: now
    }).where(eq(recipes.id, recipeId)).run();

    return c.json({ key });
});

export default app;
