import { useEffect, useState } from "react";
import { api } from "../api";
import { Recipe } from "../types/schema.org";

export function RecipeDetail({ id, onBack, onEdit, onDelete }: { id: string, onBack: () => void, onEdit: (id: string) => void, onDelete: (id: string) => void }) {
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [wakeLockEnabled, setWakeLockEnabled] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Wake Lock to prevent screen dimming during cooking
    useEffect(() => {
        let wl: any = null;

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wl = await (navigator as any).wakeLock.request('screen');
                    setWakeLockEnabled(true);
                    console.log('Wake Lock acquired');

                    wl.addEventListener('release', () => {
                        console.log('Wake Lock was released');
                        setWakeLockEnabled(false);
                    });
                }
            } catch (err) {
                console.error('Wake Lock request failed:', err);
                setWakeLockEnabled(false);
            }
        };

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                await requestWakeLock();
            }
        };

        requestWakeLock();
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleVisibilityChange);
            if (wl) {
                wl.release().catch(console.error);
            }
        };
    }, []);

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

    let ingredients = null;
    try {
        if (typeof recipe?.recipeIngredient === "string") {
            const parsed = JSON.parse(recipe.recipeIngredient);
            ingredients = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
        } else {
            ingredients = recipe?.recipeIngredient;
        }
    } catch (e) {
        console.error("Failed to parse ingredients", e);
    }

    let instructions = null;
    try {
        if (typeof recipe?.recipeInstructions === "string") {
            const parsed = JSON.parse(recipe.recipeInstructions);
            instructions = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
        } else {
            instructions = recipe?.recipeInstructions;
        }
    } catch (e) {
        console.error("Failed to parse instructions", e);
    }

    if (loading) return <div className="p-8 text-center text-gray-400">Loading recipe...</div>;
    if (!recipe) return <div className="p-8 text-center text-gray-400">Recipe not found.</div>;

    return (
        <div className="bg-white min-h-screen pb-12">
            <div className="p-4 flex items-center justify-between border-b sticky top-0 bg-white/90 backdrop-blur-md z-10">
                <button onClick={onBack} className="text-gray-500 flex items-center gap-1 text-sm font-medium">
                    <span className="text-xl">&larr;</span> 戻る
                </button>
                <div className="flex gap-2">
                    <button onClick={() => onEdit(id)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-8">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{recipe.name}</h2>
                        <div className="flex flex-wrap gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${recipe.cookingMode === 'MAKE_AHEAD' ? 'bg-purple-100 text-purple-700' :
                                recipe.cookingMode === 'LUNCH' ? 'bg-orange-100 text-orange-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                {recipe.cookingMode?.replace('_', ' ')}
                            </span>
                            {recipe.tags?.map(t => (
                                <span key={t} className="px-2.5 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold">
                                    #{t}
                                </span>
                            ))}
                            {wakeLockEnabled && (
                                <span className="px-2.5 py-0.5 bg-yellow-50 text-yellow-600 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span> 料理中スリープ防止 ON
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {recipe.images && recipe.images.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {recipe.images.map((key) => (
                            <div key={key} className="aspect-square relative overflow-hidden rounded-xl border group cursor-pointer">
                                <img
                                    src={`/api/images/${key}`}
                                    alt={recipe.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onClick={() => setSelectedImage(key)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Image Modal */}
                {selectedImage && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 transition-opacity"
                        onClick={() => setSelectedImage(null)}
                    >
                        <div className="relative max-w-4xl w-full h-full flex items-center justify-center">
                            <img
                                src={`/api/images/${selectedImage}`}
                                alt="Enlarged"
                                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            />
                            <button
                                className="absolute top-0 right-0 m-4 text-white text-3xl font-bold bg-black/20 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/40"
                                onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex space-x-6 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                    {recipe.prepTime && <div><strong>Prep Time:</strong> {recipe.prepTime}</div>}
                    {recipe.cookTime && <div><strong>Cook Time:</strong> {recipe.cookTime}</div>}
                    {recipe.suitableForKids && <div><strong>Kid-Friendly:</strong> {recipe.suitableForKids.name}</div>}
                    {recipe.url && (
                        <div className="flex-1 text-right">
                            <strong>Source:</strong> <a href={recipe.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{recipe.url}</a>
                        </div>
                    )}
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
        </div>
    );
}
