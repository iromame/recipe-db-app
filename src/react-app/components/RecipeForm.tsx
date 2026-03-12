import { useState, useEffect } from "react";
import { api } from "../api";
import { Recipe, RecipeIngredient, HowToStep } from "../types/schema.org";

export function RecipeForm({ id, onSave, onCancel }: { id?: string, onSave: (recipe: Recipe) => void, onCancel: () => void }) {
    const [recipe, setRecipe] = useState<Partial<Recipe>>({ name: "", recipeCategory: "", prepTime: "", cookTime: "", url: "", images: [] });
    const [ingredientsText, setIngredientsText] = useState("");
    const [instructionsText, setInstructionsText] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const resizeImage = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error("Canvas toBlob failed"));
                    }, "image/webp", 0.8);
                };
            };
            reader.onerror = (e) => reject(e);
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        if (!id) {
            alert("Please save the recipe basics first before adding images (or we can implement staging).");
            return;
        }

        const currentImages = recipe.images || [];
        if (currentImages.length >= 3) {
            alert("Maximum 3 images allowed.");
            return;
        }

        setUploading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                if (currentImages.length + i >= 3) break;
                const resizedBlob = await resizeImage(files[i]);
                const resizedFile = new File([resizedBlob], files[i].name, { type: "image/webp" });
                const { key } = await api.uploadImage(id, resizedFile);
                setRecipe(prev => ({ ...prev, images: [...(prev.images || []), key] }));
            }
        } catch (err) {
            console.error(err);
            alert("Failed to upload image.");
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (key: string) => {
        setRecipe(prev => ({ ...prev, images: (prev.images || []).filter(k => k !== key) }));
    };

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
                if (r.images) {
                    try {
                        const parsed = typeof r.images === "string" ? JSON.parse(r.images) : r.images;
                        setRecipe(prev => ({ ...prev, images: Array.isArray(parsed) ? parsed : [] }));
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Photos (Max 3)</label>
                    {!id && <p className="text-xs text-amber-600 mb-2">Save the recipe name first to enable image uploads.</p>}
                    <div className="flex flex-wrap gap-2 mb-2">
                        {recipe.images?.map(key => (
                            <div key={key} className="relative group w-24 h-24">
                                <img src={`/api/images/${key}`} alt="" className="w-full h-full object-cover rounded-md border" />
                                <button
                                    type="button"
                                    onClick={() => removeImage(key)}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        {id && (recipe.images?.length || 0) < 3 && (
                            <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                <span className="text-2xl text-gray-400">+</span>
                                <span className="text-[10px] text-gray-400">Add Photo</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        )}
                    </div>
                    {uploading && <div className="text-xs text-blue-600 animate-pulse">Resizing and uploading...</div>}
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
