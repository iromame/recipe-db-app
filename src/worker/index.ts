import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, inArray, desc } from "drizzle-orm";
import { recipes, tags, recipeTags } from "../db/schema";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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
    const allRecipes = await db.select().from(recipes).orderBy(desc(recipes.pinned), desc(recipes.updatedAt)).all();
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
        pinned: body.pinned || false,
        recipeCategory: body.recipeCategory || null,
        prepTime: body.prepTime || null,
        cookTime: body.cookTime || null,
        suitableForKids: body.suitableForKids || null,
        recipeIngredient: body.recipeIngredient || null,
        recipeInstructions: body.recipeInstructions || null,
        url: body.url || null,
        images: body.images || null,
        notes: body.notes || null,
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
    if (body.pinned !== undefined) updateData.pinned = body.pinned;
    if (body.recipeCategory !== undefined) updateData.recipeCategory = body.recipeCategory;
    if (body.prepTime !== undefined) updateData.prepTime = body.prepTime;
    if (body.cookTime !== undefined) updateData.cookTime = body.cookTime;
    if (body.suitableForKids !== undefined) updateData.suitableForKids = body.suitableForKids;
    if (body.recipeIngredient !== undefined) updateData.recipeIngredient = body.recipeIngredient;
    if (body.recipeInstructions !== undefined) updateData.recipeInstructions = body.recipeInstructions;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.images !== undefined) updateData.images = body.images;
    if (body.notes !== undefined) updateData.notes = body.notes;
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

// Extract Recipe with AI
app.post("/api/recipes/extract", async (c) => {
    const apiKey = (c.env as any).GEMINI_API_KEY;
    if (!apiKey) return c.json({ error: "Gemini API key is not configured" }, 500);

    const body = await c.req.parseBody();
    const url = body["url"] as string;
    const text = body["text"] as string;
    const file = body["file"];

    let extractedText = "";
    let imageUrl = "";

    try {
        if (url) {
            const res = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
                    "Cache-Control": "max-age=0",
                    "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                    "Sec-Ch-Ua-Mobile": "?0",
                    "Sec-Ch-Ua-Platform": '"Windows"',
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-User": "?1",
                    "Upgrade-Insecure-Requests": "1"
                }
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch URL: ${res.status} (サイトがレシピの自動取得をブロックしている可能性があります。テキスト貼り付けをお試しください)`);
            }
            const html = await res.text();
            extractedText = html;

            const ogImageMatch1 = html.match(/<meta[^>]+(?:property|name)="(?:og:image|twitter:image)"[^>]+content="([^">]+)"/i);
            const ogImageMatch2 = html.match(/<meta[^>]+content="([^">]+)"[^>]+(?:property|name)="(?:og:image|twitter:image)"/i);
            if (ogImageMatch1 && ogImageMatch1[1]) {
                imageUrl = ogImageMatch1[1];
            } else if (ogImageMatch2 && ogImageMatch2[1]) {
                imageUrl = ogImageMatch2[1];
            }
        } else if (text) {
            extractedText = text;
        } else if (file instanceof File) {
            const arrayBuffer = await file.arrayBuffer();
            const key = `uploads/${crypto.randomUUID()}-${file.name}`;
            await c.env.IMAGES.put(key, arrayBuffer, {
                httpMetadata: { contentType: file.type },
            });
            imageUrl = key; // Save only the key, it will be mapped correctly later
            extractedText = "Please extract the recipe from this image.";
        } else {
            return c.json({ error: "No input provided" }, 400);
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                name: { type: SchemaType.STRING, description: "レシピ名" },
                description: { type: SchemaType.STRING, description: "簡単な説明文" },
                prepTime: { type: SchemaType.STRING, description: "準備時間 (ISO 8601, 例: PT15M)" },
                cookTime: { type: SchemaType.STRING, description: "調理時間 (ISO 8601, 例: PT20M)" },
                cookingMode: { type: SchemaType.STRING, description: "用途（MAKE_AHEAD, LUNCH, DINNER のいずれかを選択）" },
                recipeIngredient: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            name: { type: SchemaType.STRING, description: "材料名と分量 (例: 豚肉 200g)" }
                        },
                        required: ["name"]
                    }
                },
                recipeInstructions: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            text: { type: SchemaType.STRING, description: "調理手順" }
                        },
                        required: ["text"]
                    }
                },
                suitableForKids: {
                    type: SchemaType.OBJECT,
                    properties: {
                        name: { type: SchemaType.STRING, description: "子供向けなら 'Infant' など" }
                    }
                }
            },
            required: ["name", "cookingMode"]
        };

        const prompt = `以下の内容からレシピ情報を抽出し、指定されたJSONスキーマに従って出力してください。可能な限り情報を補完し、ISO8601形式の時間は厳密に守ってください。\n\nContent:\n${extractedText}`;

        const parts: any[] = [];
        if (file instanceof File) {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < buffer.byteLength; i++) {
                binary += String.fromCharCode(buffer[i]);
            }
            parts.push({
                inlineData: {
                    data: btoa(binary),
                    mimeType: file.type
                }
            });
        }
        parts.push({ text: prompt });

        const result = await model.generateContent({
            contents: [{ role: "user", parts }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema as any,
            }
        });

        const jsonText = result.response.text();
        const extractedData = JSON.parse(jsonText);

        if (imageUrl && !extractedData.images && !extractedData.imageUrl) {
            // Provide as array to match frontend if we want, or as imageUrl for API
            extractedData.imageUrl = (file instanceof File) ? `/api/images/${imageUrl}` : imageUrl;
            // Also set images as array if it's an uploaded file
            if (file instanceof File) {
                 extractedData.images = [imageUrl];
            }
        }
        if (url && !extractedData.url) {
            extractedData.url = url;
        }

        return c.json({ success: true, data: extractedData });

    } catch (e: any) {
        return c.json({ error: e.message || "Failed to extract recipe" }, 500);
    }
});

export default app;
