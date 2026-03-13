import { useState, useEffect } from "react";
import { api } from "../api";
import { Recipe } from "../types/schema.org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Clock, Utensils, Tag, ImageIcon, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

    const formatMinutesToISO = (minutes: number) => `PT${minutes}M`;
    const parseISOToMinutes = (iso: string) => {
        const match = iso?.match(/PT(\d+)M/);
        return match ? parseInt(match[1]) : 0;
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

    const TimePicker = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
        const minutes = parseISOToMinutes(value);
        const options = [0, 5, 10, 15, 20, 30, 45, 60, 90, 120];

        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <label className="text-sm font-semibold tracking-tight">{label}</label>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 touch-pan-x no-scrollbar scroll-smooth snap-x">
                    {options.map(m => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => onChange(formatMinutesToISO(m))}
                            className={cn(
                                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all snap-start",
                                minutes === m
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "bg-background text-muted-foreground border-input hover:border-primary/50"
                            )}
                        >
                            {m === 0 ? "未設定" : m >= 60 ? `${Math.floor(m / 60)}h${m % 60 || ""}` : `${m}分`}
                        </button>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0 rounded-full h-9"
                        onClick={(e) => {
                            e.preventDefault();
                            const custom = prompt("分を入力してください", minutes.toString());
                            if (custom && !isNaN(parseInt(custom))) onChange(formatMinutesToISO(parseInt(custom)));
                        }}
                    >
                        カスタム
                    </Button>
                </div>
            </div>
        );
    };

    if (loading) return <div className="p-12 text-center animate-pulse text-muted-foreground">Loading recipe data...</div>;

    return (
        <div className="bg-background min-h-screen pb-32">
            <div className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-30">
                <div className="max-w-xl mx-auto px-4 h-16 flex justify-between items-center">
                    <h2 className="text-lg font-bold tracking-tight">{id ? "Edit Recipe" : "New Recipe"}</h2>
                    <Button type="button" variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-4 space-y-10">
                {/* 1. Cooking Mode */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-muted-foreground" />
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cooking Mode</label>
                    </div>
                    <Tabs
                        value={recipe.cookingMode || "DINNER"}
                        onValueChange={(val) => setRecipe({ ...recipe, cookingMode: val as any })}
                        className="w-full"
                    >
                        <TabsList className="grid w-full grid-cols-3 h-12 p-1 bg-muted/50 rounded-xl">
                            <TabsTrigger value="MAKE_AHEAD" className="rounded-lg font-bold text-xs">作り置き</TabsTrigger>
                            <TabsTrigger value="LUNCH" className="rounded-lg font-bold text-xs">お昼</TabsTrigger>
                            <TabsTrigger value="DINNER" className="rounded-lg font-bold text-xs">晩ごはん</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </section>

                {/* 2. Basic Info */}
                <section className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recipe Name *</label>
                        <Input
                            placeholder="e.g. 肉じゃが"
                            value={recipe.name || ""}
                            onChange={e => setRecipe({ ...recipe, name: e.target.value })}
                            className="h-14 text-xl font-medium border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0 transition-all"
                            required
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-muted-foreground" />
                            <label className="text-sm font-semibold tracking-tight">Tags</label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {recipe.tags?.map(tag => (
                                <Badge key={tag} variant="secondary" className="pl-3 pr-1 py-1 rounded-full text-xs font-medium bg-secondary/50 hover:bg-secondary">
                                    #{tag}
                                    <button type="button" onClick={() => removeTag(tag)} className="ml-1 p-0.5 hover:bg-muted rounded-full transition-colors">
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add tag (e.g. レンジ, 時短)"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                className="h-11 rounded-xl bg-muted/30 border-muted"
                            />
                            <Button type="button" variant="secondary" onClick={addTag} className="rounded-xl h-11 px-6 font-bold">Add</Button>
                        </div>
                    </div>
                </section>

                {/* 3. Time Pickers */}
                <section className="grid grid-cols-1 gap-8 pt-4">
                    <TimePicker
                        label="Prep Time (準備時間)"
                        value={recipe.prepTime || ""}
                        onChange={val => setRecipe({ ...recipe, prepTime: val })}
                    />
                    <TimePicker
                        label="Cook Time (調理時間)"
                        value={recipe.cookTime || ""}
                        onChange={val => setRecipe({ ...recipe, cookTime: val })}
                    />
                </section>

                {/* 4. Ingredients & Instructions */}
                <section className="space-y-8 pt-4">
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ingredients</label>
                        <Textarea
                            rows={5}
                            value={ingredientsText}
                            onChange={e => setIngredientsText(e.target.value)}
                            className="rounded-2xl p-4 bg-muted/20 border-muted focus-visible:ring-offset-0 focus-visible:ring-primary/20"
                            placeholder="豚肉 200g&#10;玉ねぎ 1個"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Instructions</label>
                        <Textarea
                            rows={8}
                            value={instructionsText}
                            onChange={e => setInstructionsText(e.target.value)}
                            className="rounded-2xl p-4 bg-muted/20 border-muted focus-visible:ring-offset-0 focus-visible:ring-primary/20"
                            placeholder="1. 野菜を切る&#10;&#10;2. 炒める"
                        />
                    </div>
                </section>

                {/* 5. Photos */}
                <section className="space-y-4 pt-4">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        <label className="text-sm font-semibold tracking-tight">Photos (Max 3)</label>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {recipe.images?.map(key => (
                            <div key={key} className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-sm border bg-muted">
                                <img src={`/api/images/${key}`} alt="" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeImage(key)}
                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {id && (recipe.images?.length || 0) < 3 && (
                            <label className="w-28 h-28 border-2 border-dashed border-muted rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-all group">
                                <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className="text-[10px] text-muted-foreground mt-1 font-bold">追加</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        )}
                    </div>
                    {uploading && <div className="text-[10px] text-primary mt-2 font-bold animate-pulse uppercase tracking-widest">Uploading...</div>}
                </section>

                {/* 6. URL */}
                <section className="space-y-3 pt-4">
                    <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-muted-foreground" />
                        <label className="text-sm font-semibold tracking-tight">Source URL</label>
                    </div>
                    <Input
                        type="url" placeholder="https://..."
                        value={recipe.url || ""}
                        onChange={e => setRecipe({ ...recipe, url: e.target.value })}
                        className="rounded-xl bg-muted/30 border-muted italic text-muted-foreground"
                    />
                </section>

                {/* Fixed Bottom Action Bar */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/90 backdrop-blur-lg border-t shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] z-40">
                    <div className="max-w-xl mx-auto flex gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            className="flex-1 h-14 rounded-2xl font-bold text-muted-foreground border-muted shadow-sm"
                        >
                            閉じる
                        </Button>
                        <Button
                            type="submit"
                            className="flex-[2] h-14 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
                        >
                            レシピを保存
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
