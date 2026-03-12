import { useState, useEffect } from "react";
import { api } from "../api";
import { Recipe } from "../types/schema.org";

export function RecipeForm({ id, onSave, onCancel }: { id?: string, onSave: (recipe: Recipe) => void, onCancel: () => void }) {
    const [recipe, setRecipe] = useState<Partial<Recipe>>({
        name: "",
        cookingMode: "MAKE_AHEAD",
        recipeCategory: "",
        tags: [],
        prepTime: "",
        cookTime: "",
        url: "",
        images: []
    });
    const [tagInput, setTagInput] = useState("");
    const [ingredientsText, setIngredientsText] = useState("");
    const [instructionsText, setInstructionsText] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // ... (resizeImage and handleImageUpload remain the same) ...
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
            alert("Please save the recipe basics first to enable image grouping.");
            return;
        }
        const currentImages = recipe.images || [];
        if (currentImages.length >= 3) return alert("Max 3 images.");
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
            alert("Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (key: string) => {
        setRecipe(prev => ({ ...prev, images: (prev.images || []).filter(k => k !== key) }));
    };

    const addTag = () => {
        const tag = tagInput.trim().toLowerCase();
        if (tag && !recipe.tags?.includes(tag)) {
            setRecipe(prev => ({ ...prev, tags: [...(prev.tags || []), tag] }));
            setTagInput("");
        }
    };

    const removeTag = (tag: string) => {
        setRecipe(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }));
    };

    useEffect(() => {
        if (id) {
            setLoading(true);
            api.getRecipe(id).then(r => {
                setRecipe(r);
                if (r.recipeIngredient) {
                    try {
                        const ings = Array.isArray(r.recipeIngredient) ? r.recipeIngredient : JSON.parse(r.recipeIngredient as any);
                        setIngredientsText(ings.map((i: any) => i.name).join("\n"));
                    } catch (e) { console.error(e); }
                }
                if (r.recipeInstructions) {
                    try {
                        const insts = Array.isArray(r.recipeInstructions) ? r.recipeInstructions : JSON.parse(r.recipeInstructions as any);
                        setInstructionsText(insts.map((s: any) => s.text).join("\n\n"));
                    } catch (e) { console.error(e); }
                }
            }).finally(() => setLoading(false));
        }
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipe.name) return alert("Name is required");

        const finalRecipe: Recipe = {
            name: recipe.name!,
            cookingMode: recipe.cookingMode as any || "DINNER",
            recipeCategory: recipe.recipeCategory,
            tags: recipe.tags,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            url: recipe.url,
            images: recipe.images,
            recipeIngredient: ingredientsText.split("\n").filter(l => l.trim()).map(name => ({ name })),
            recipeInstructions: instructionsText.split("\n\n").filter(l => l.trim()).map(text => ({ text })),
        };

        if (id) {
            await api.updateRecipe(id, finalRecipe);
        } else {
            await api.createRecipe(finalRecipe);
        }
        onSave(finalRecipe);
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading recipe data...</div>;

    return (
        <div className="bg-gray-50 min-h-screen pb-24"> {/* Extra padding for bottom buttons */}
            <div className="bg-white p-6 shadow-sm sticky top-0 z-10">
                <div className="max-w-xl mx-auto flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">{id ? "Edit Recipe" : "New Recipe"}</h2>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-4 space-y-8">
                {/* 1. Cooking Mode - Large buttons for thumbs */}
                <section>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Cooking Mode</label>
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        {(["MAKE_AHEAD", "LUNCH", "DINNER"] as const).map(mode => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setRecipe({ ...recipe, cookingMode: mode })}
                                className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${recipe.cookingMode === mode
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                {mode === "MAKE_AHEAD" ? "作り置き" : mode === "LUNCH" ? "お昼" : "晩ごはん"}
                            </button>
                        ))}
                    </div>
                </section>

                {/* 2. Basic Info */}
                <section className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Recipe Name *</label>
                        <input
                            type="text" required
                            placeholder="e.g. 肉じゃが"
                            value={recipe.name || ""}
                            onChange={e => setRecipe({ ...recipe, name: e.target.value })}
                            className="w-full p-4 bg-white border-0 border-b-2 border-gray-100 focus:border-blue-500 text-lg transition-colors outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tags</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {recipe.tags?.map(tag => (
                                <span key={tag} className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                    #{tag}
                                    <button type="button" onClick={() => removeTag(tag)} className="ml-2 text-blue-300 hover:text-blue-500">&times;</button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Add tag (e.g. レンジ, 時短)"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                className="flex-1 p-3 bg-white border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            />
                            <button type="button" onClick={addTag} className="bg-gray-100 px-4 py-3 rounded-lg text-sm font-bold text-gray-600">Add</button>
                        </div>
                    </div>
                </section>

                {/* 3. Time Pickers */}
                <section className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Prep Time</label>
                        <input
                            type="text" placeholder="PT15M"
                            value={recipe.prepTime || ""}
                            onChange={e => setRecipe({ ...recipe, prepTime: e.target.value })}
                            className="w-full p-3 bg-white border rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Cook Time</label>
                        <input
                            type="text" placeholder="PT30M"
                            value={recipe.cookTime || ""}
                            onChange={e => setRecipe({ ...recipe, cookTime: e.target.value })}
                            className="w-full p-3 bg-white border rounded-lg text-sm"
                        />
                    </div>
                </section>

                {/* 4. Ingredients & Instructions */}
                <section className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Ingredients</label>
                        <textarea
                            rows={5}
                            value={ingredientsText}
                            onChange={e => setIngredientsText(e.target.value)}
                            className="w-full p-4 bg-white border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="豚肉 200g&#10;玉ねぎ 1個"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Instructions</label>
                        <textarea
                            rows={8}
                            value={instructionsText}
                            onChange={e => setInstructionsText(e.target.value)}
                            className="w-full p-4 bg-white border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="1. 野菜を切る&#10;&#10;2. 炒める"
                        />
                    </div>
                </section>

                {/* 5. Photos */}
                <section>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Photos (Max 3)</label>
                    <div className="flex flex-wrap gap-3">
                        {recipe.images?.map(key => (
                            <div key={key} className="relative w-24 h-24 rounded-xl overflow-hidden shadow-sm border bg-white">
                                <img src={`/api/images/${key}`} alt="" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeImage(key)}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xl opacity-0 hover:opacity-100 transition-opacity"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                        {id && (recipe.images?.length || 0) < 3 && (
                            <label className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors">
                                <span className="text-2xl text-gray-300 font-light">+</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        )}
                    </div>
                    {uploading && <div className="text-[10px] text-blue-500 mt-2 font-bold animate-pulse uppercase tracking-wider">Uploading...</div>}
                </section>

                {/* 6. URL */}
                <section>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Source URL</label>
                    <input
                        type="url" placeholder="https://..."
                        value={recipe.url || ""}
                        onChange={e => setRecipe({ ...recipe, url: e.target.value })}
                        className="w-full p-3 bg-white border rounded-lg text-sm text-gray-500 italic"
                    />
                </section>

                {/* Fixed Bottom Action Bar for Thumb Access */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t shadow-lg z-20">
                    <div className="max-w-xl mx-auto flex gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-4 text-sm font-bold text-gray-500 bg-gray-50 rounded-xl border border-gray-100"
                        >
                            閉じる
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] py-4 text-sm font-bold text-white bg-blue-600 rounded-xl shadow-blue-200 shadow-lg hover:shadow-xl transition-all active:scale-95"
                        >
                            レシピを保存
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
