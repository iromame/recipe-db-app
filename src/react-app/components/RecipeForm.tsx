import { useState, useEffect } from "react";
import { api } from "../api";
import { Recipe, RecipeIngredient, HowToStep } from "../types/schema.org";

export function RecipeForm({ id, onSave, onCancel }: { id?: string, onSave: (recipe: Recipe) => void, onCancel: () => void }) {
    const [recipe, setRecipe] = useState<Partial<Recipe>>({ name: "", recipeCategory: "", prepTime: "", cookTime: "", url: "" });
    const [ingredientsText, setIngredientsText] = useState("");
    const [instructionsText, setInstructionsText] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (id) {
            setLoading(true);
            api.getRecipe(id).then(r => {
                setRecipe(r);
                if (r.recipeIngredient) {
                    try {
                        const parsed1 = typeof r.recipeIngredient === "string" ? JSON.parse(r.recipeIngredient) : r.recipeIngredient;
                        const ings = typeof parsed1 === "string" ? JSON.parse(parsed1) : parsed1;
                        if (Array.isArray(ings)) {
                            setIngredientsText(ings.map((i: any) => `${i.amount || ""} ${i.unit || ""} ${i.name}`.trim()).join("\n"));
                        }
                    } catch (e) { console.error(e); }
                }
                if (r.recipeInstructions) {
                    try {
                        const parsed1 = typeof r.recipeInstructions === "string" ? JSON.parse(r.recipeInstructions) : r.recipeInstructions;
                        const insts = typeof parsed1 === "string" ? JSON.parse(parsed1) : parsed1;
                        if (Array.isArray(insts)) {
                            setInstructionsText(insts.map((s: any) => s.text).join("\n\n"));
                        }
                    } catch (e) { console.error(e); }
                }
            }).finally(() => setLoading(false));
        }
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipe.name) return alert("Name is required");

        // Parse simple text areas into Schema.org arrays
        const parsedIngredients: RecipeIngredient[] = ingredientsText
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(name => ({ name })); // MVP: just storing full string as name

        const parsedInstructions: HowToStep[] = instructionsText
            .split("\n\n")
            .map(text => text.trim())
            .filter(text => text.length > 0)
            .map(text => ({ text }));

        const finalRecipe: Recipe = {
            ...recipe as Recipe,
            recipeIngredient: parsedIngredients,
            recipeInstructions: parsedInstructions,
        };

        if (id) {
            await api.updateRecipe(id, finalRecipe);
        } else {
            await api.createRecipe(finalRecipe);
        }
        onSave(finalRecipe);
    };

    if (loading) return <div>Loading form...</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">{id ? "Edit Recipe" : "Add New Recipe"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name *</label>
                    <input
                        type="text" required
                        value={recipe.name || ""}
                        onChange={e => setRecipe({ ...recipe, name: e.target.value })}
                        className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <input
                            type="text" placeholder="e.g. Dessert"
                            value={recipe.recipeCategory || ""}
                            onChange={e => setRecipe({ ...recipe, recipeCategory: e.target.value })}
                            className="w-full p-2 border rounded-md"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (ISO 8601)</label>
                        <input
                            type="text" placeholder="e.g. PT15M"
                            value={recipe.prepTime || ""}
                            onChange={e => setRecipe({ ...recipe, prepTime: e.target.value })}
                            className="w-full p-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cook Time (ISO 8601)</label>
                        <input
                            type="text" placeholder="e.g. PT30M"
                            value={recipe.cookTime || ""}
                            onChange={e => setRecipe({ ...recipe, cookTime: e.target.value })}
                            className="w-full p-2 border rounded-md"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference URL</label>
                    <input
                        type="url" placeholder="https://example.com/recipe"
                        value={recipe.url || ""}
                        onChange={e => setRecipe({ ...recipe, url: e.target.value })}
                        className="w-full p-2 border rounded-md"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients (one per line)</label>
                    <textarea
                        rows={5}
                        value={ingredientsText}
                        onChange={e => setIngredientsText(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        placeholder="2 cups flour&#10;1 tsp sugar"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instructions (separate steps with a blank line)</label>
                    <textarea
                        rows={6}
                        value={instructionsText}
                        onChange={e => setInstructionsText(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        placeholder="Mix the dry ingredients.&#10;&#10;Add water and knead."
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Recipe</button>
                </div>
            </form>
        </div>
    );
}
