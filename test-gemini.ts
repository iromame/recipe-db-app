import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import fs from "fs";

async function test() {
    const apiKey = "YOUR_KEY_HERE"; // We'll pass it via process.env
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            name: { type: SchemaType.STRING, description: "レシピ名" },
            description: { type: SchemaType.STRING, description: "簡単な説明文", nullable: true },
            prepTime: { type: SchemaType.STRING, description: "準備時間 (ISO 8601, 例: PT15M)", nullable: true },
            cookTime: { type: SchemaType.STRING, description: "調理時間 (ISO 8601, 例: PT20M)", nullable: true },
            cookingMode: { type: SchemaType.STRING, description: "用途（MAKE_AHEAD, LUNCH, DINNER のいずれかを選択）" },
            tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "タグの配列 (例: ['時短', 'レンジ', '鶏肉'])", nullable: true },
            recipeIngredient: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        name: { type: SchemaType.STRING, description: "材料名と分量 (例: 豚肉 200g)" }
                    },
                    required: ["name"]
                },
                nullable: true
            },
            recipeInstructions: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        text: { type: SchemaType.STRING, description: "調理手順" }
                    },
                    required: ["text"]
                },
                nullable: true
            },
            suitableForKids: {
                type: SchemaType.OBJECT,
                properties: {
                    name: { type: SchemaType.STRING, description: "子供向けなら 'Infant' など" }
                },
                nullable: true
            }
        },
        required: ["name", "cookingMode"]
    };

    try {
        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [{ text: "Extract recipe: Recipe name is Toast. It takes 5 mins." }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema as any,
            }
        });
        console.log(result.response.text());
    } catch (e: any) {
        console.error("ERROR:");
        console.error(e.message);
    }
}

test();
