import { useEffect, useState } from "react";
import { api } from "../api";
import { Recipe } from "../types/schema.org";

export function RecipeList({ onSelectRecipe, onCreateNew }: { onSelectRecipe: (id: string) => void, onCreateNew: () => void }) {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        api.getRecipes()
            .then(setRecipes)
            .catch(err => {
                console.error("Fetch error:", err);
                setError(err.message || "Failed to load recipes");
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-gray-500">Loading recipes...</div>;
    if (error) return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-bold">Error loading recipes:</p>
            <p className="text-sm opacity-90">{error}</p>
            <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
                Retry (Reload App)
            </button>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">My Recipes</h2>
                <button
                    onClick={onCreateNew}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm"
                >
                    + Add Recipe
                </button>
            </div>

            {recipes.length === 0 ? (
                <p className="text-gray-500 italic">No recipes found. Create one!</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recipes.map((r) => (
                        <div
                            key={r.id}
                            onClick={() => r.id && onSelectRecipe(r.id)}
                            className="bg-white p-4 border rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                        >
                            <h3 className="text-lg font-semibold">{r.name}</h3>
                            {r.recipeCategory && <p className="text-sm text-gray-500 mt-1">{r.recipeCategory}</p>}
                            <div className="flex text-xs text-gray-400 mt-4 space-x-4">
                                {r.prepTime && <span>Prep: {r.prepTime}</span>}
                                {r.cookTime && <span>Cook: {r.cookTime}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
