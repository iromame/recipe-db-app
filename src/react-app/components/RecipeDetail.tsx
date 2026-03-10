import { useEffect, useState } from "react";
import { api } from "../api";
import { Recipe } from "../types/schema.org";

export function RecipeDetail({ id, onBack, onEdit, onDelete }: { id: string, onBack: () => void, onEdit: (id: string) => void, onDelete: (id: string) => void }) {
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [wakeLockEnabled, setWakeLockEnabled] = useState(false);
    const [wakeLock, setWakeLock] = useState<any>(null);

    useEffect(() => {
        api.getRecipe(id)
            .then(setRecipe)
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [id]);

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this recipe?")) {
            await api.deleteRecipe(id);
            onDelete(id);
        }
    };

    useEffect(() => {
        return () => {
            if (wakeLock) wakeLock.release().catch(console.error);
        };
    }, [wakeLock]);

    const toggleWakeLock = async () => {
        if (wakeLockEnabled && wakeLock) {
            await wakeLock.release();
            setWakeLock(null);
            setWakeLockEnabled(false);
        } else {
            try {
                if ('wakeLock' in navigator) {
                    const wl = await (navigator as any).wakeLock.request('screen');
                    setWakeLock(wl);
                    setWakeLockEnabled(true);
                } else {
                    alert("Screen Wake Lock API is not supported in this browser.");
                }
            } catch (err) {
                console.error("Wake Lock error:", err);
            }
        }
    };

    const ingredients = typeof recipe?.recipeIngredient === "string"
        ? JSON.parse(recipe.recipeIngredient)
        : recipe?.recipeIngredient;

    const instructions = typeof recipe?.recipeInstructions === "string"
        ? JSON.parse(recipe.recipeInstructions)
        : recipe?.recipeInstructions;

    if (loading) return <div>Loading...</div>;
    if (!recipe) return <div>Recipe not found.</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
            <button onClick={onBack} className="text-blue-500 hover:underline mb-4">&larr; Back to list</button>

            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">{recipe.name}</h2>
                    {recipe.recipeCategory && <p className="text-sm font-medium text-gray-500 mt-1 uppercase tracking-wider">{recipe.recipeCategory}</p>}
                </div>
                <div className="space-x-2 flex items-center">
                    <button
                        onClick={toggleWakeLock}
                        className={`px-3 py-1 rounded text-sm ${wakeLockEnabled ? "bg-yellow-100 text-yellow-800 border-yellow-300" : "bg-gray-100 text-gray-600"} border`}
                        title="Keep screen on while cooking"
                    >
                        {wakeLockEnabled ? "🌞 Screen On" : "🌙 Screen Normal"}
                    </button>
                    <button onClick={() => onEdit(id)} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded">Edit</button>
                    <button onClick={handleDelete} className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded">Delete</button>
                </div>
            </div>

            <div className="flex space-x-6 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                {recipe.prepTime && <div><strong>Prep Time:</strong> {recipe.prepTime}</div>}
                {recipe.cookTime && <div><strong>Cook Time:</strong> {recipe.cookTime}</div>}
                {recipe.suitableForKids && <div><strong>Kid-Friendly:</strong> {recipe.suitableForKids.name}</div>}
            </div>

            {ingredients && ingredients.length > 0 && (
                <div>
                    <h3 className="text-xl font-semibold mb-3 border-b pb-2">Ingredients</h3>
                    <ul className="list-disc pl-5 space-y-1">
                        {ingredients.map((ing: any, idx: number) => (
                            <li key={idx}>
                                {ing.amount && <span className="font-medium mr-1">{ing.amount}</span>}
                                {ing.unit && <span className="font-medium mr-1">{ing.unit}</span>}
                                {ing.name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {instructions && instructions.length > 0 && (
                <div>
                    <h3 className="text-xl font-semibold mb-3 border-b pb-2">Instructions</h3>
                    <ol className="list-decimal pl-5 space-y-3">
                        {instructions.map((step: any, idx: number) => (
                            <li key={idx} className="pl-2">
                                {step.text}
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}
