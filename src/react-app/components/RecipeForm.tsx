import { useState, useEffect } from "react";
import { api } from "../api";
import { Recipe } from "../types/schema.org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, Clock, Utensils, Tag, ImageIcon, Link as LinkIcon, ChevronsUpDown, Check, AlertCircle } from "lucide-react";
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
        images: [],
        notes: ""
    });
    const [tagInput, setTagInput] = useState("");
    const [allTags, setAllTags] = useState<string[]>([]);
    const [tagOpen, setTagOpen] = useState(false);
    const [customTimeOpen, setCustomTimeOpen] = useState<'prep' | 'cook' | null>(null);
    const [customTimeInput, setCustomTimeInput] = useState("");

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
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob); else reject(new Error("Canvas toBlob failed"));
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
            alert("Please save the recipe basics first to add photos.");
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
        } catch (err) { alert("Upload failed."); } finally { setUploading(false); }
    };

    const removeImage = (key: string) => {
        setRecipe(prev => ({ ...prev, images: (prev.images || []).filter(k => k !== key) }));
    };

    useEffect(() => {
        // Fetch existing tags for autocomplete
        api.getRecipes().then(recipes => {
            const tags = new Set<string>();
            recipes.forEach(r => r.tags?.forEach(t => tags.add(t)));
            setAllTags(Array.from(tags).sort());
        }).catch(console.error);

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

    const addTag = (tagToAdd: string) => {
        const tag = tagToAdd.trim().toLowerCase();
        if (tag && !recipe.tags?.includes(tag)) {
            setRecipe(prev => ({ ...prev, tags: [...(prev.tags || []), tag] }));
        }
        setTagInput("");
    };

    const removeTag = (tag: string) => {
        setRecipe(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }));
    };

    const formatMinutesToISO = (minutes: number) => `PT${minutes}M`;
    const parseISOToMinutes = (iso: string) => {
        const match = iso?.match(/PT(\d+)M/);
        return match ? parseInt(match[1]) : 0;
    };

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
            notes: recipe.notes || "",
        };

        if (id) {
            await api.updateRecipe(id, finalRecipe);
        } else {
            await api.createRecipe(finalRecipe);
        }
        onSave(finalRecipe);
    };

    const TimePicker = ({ label, value, field }: { label: string, value: string, field: 'prep' | 'cook' }) => {
        const minutes = parseISOToMinutes(value);
        const options = [0, 5, 10, 15, 20, 30, 45, 60];

        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <label className="text-sm font-semibold tracking-tight">{label}</label>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 touch-pan-x no-scrollbar scroll-smooth">
                    {options.map(m => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setRecipe(prev => ({ ...prev, [field + 'Time']: formatMinutesToISO(m) }))}
                            className={cn(
                                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition-all active:scale-95",
                                minutes === m
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "bg-muted/50 text-muted-foreground border-transparent hover:border-border"
                            )}
                        >
                            {m === 0 ? "未設定" : `${m}分`}
                        </button>
                    ))}
                    <Popover open={customTimeOpen === field} onOpenChange={(open) => {
                        setCustomTimeOpen(open ? field : null);
                        setCustomTimeInput(minutes ? minutes.toString() : "");
                    }}>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-shrink-0 rounded-full h-10 px-4 bg-muted/50 border-transparent font-bold text-muted-foreground"
                            >
                                カスタム
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-4 bg-popover/95 backdrop-blur-md rounded-2xl border-border shadow-xl">
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">分数を入力</h4>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        value={customTimeInput}
                                        onChange={e => setCustomTimeInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = parseInt(customTimeInput);
                                                if (!isNaN(val)) setRecipe(prev => ({ ...prev, [field + 'Time']: formatMinutesToISO(val) }));
                                                setCustomTimeOpen(null);
                                            }
                                        }}
                                        className="h-10 text-center font-bold bg-muted/50 border-transparent focus-visible:ring-primary/50"
                                        autoFocus
                                    />
                                    <Button size="icon" className="h-10 w-10 shrink-0" onClick={() => {
                                        const val = parseInt(customTimeInput);
                                        if (!isNaN(val)) setRecipe(prev => ({ ...prev, [field + 'Time']: formatMinutesToISO(val) }));
                                        setCustomTimeOpen(null);
                                    }}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
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
                        <X className="w-5 h-5 text-muted-foreground" />
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-4 space-y-10">
                {/* 1. Cooking Mode */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Utensils className="w-4 h-4" />
                        <label className="text-[10px] font-bold uppercase tracking-widest">Cooking Mode</label>
                    </div>
                    <Tabs
                        value={recipe.cookingMode || "DINNER"}
                        onValueChange={(val) => setRecipe({ ...recipe, cookingMode: val as any })}
                        className="w-full"
                    >
                        <TabsList className="grid w-full grid-cols-3 h-14 p-1.5 bg-muted/60 rounded-2xl">
                            <TabsTrigger value="MAKE_AHEAD" className="rounded-xl font-bold text-xs data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">作り置き</TabsTrigger>
                            <TabsTrigger value="LUNCH" className="rounded-xl font-bold text-xs data-[state=active]:bg-background data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm">お昼</TabsTrigger>
                            <TabsTrigger value="DINNER" className="rounded-xl font-bold text-xs data-[state=active]:bg-background data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm">晩ごはん</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </section>

                {/* 2. Basic Info */}
                <section className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recipe Name *</label>
                        <Input
                            placeholder="e.g. じゃがいものガレット"
                            value={recipe.name || ""}
                            onChange={e => setRecipe({ ...recipe, name: e.target.value })}
                            className="h-16 text-2xl font-extrabold border-0 border-b-2 border-muted/50 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0 transition-all placeholder:text-muted-foreground/40"
                            required
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-muted-foreground" />
                            <label className="text-sm font-semibold tracking-tight">Tags</label>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {recipe.tags?.map(tag => (
                                <Badge key={tag} variant="secondary" className="pl-3 pr-1 py-1.5 rounded-full text-xs font-bold bg-muted/60 text-muted-foreground border-transparent hover:bg-muted transition-colors">
                                    #{tag}
                                    <button type="button" onClick={() => removeTag(tag)} className="ml-1.5 p-0.5 hover:bg-background rounded-full transition-colors active:scale-90">
                                        <X className="w-3.5 h-3.5 opacity-70" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        
                        <Popover open={tagOpen} onOpenChange={setTagOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={tagOpen}
                                    className="w-full justify-between h-12 rounded-xl bg-muted/30 border-transparent hover:bg-muted/50 hover:text-foreground text-muted-foreground font-semibold"
                                >
                                    Select or create tags...
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0 bg-popover/95 backdrop-blur-xl border-border/50 rounded-xl overflow-hidden shadow-2xl" align="start">
                                <Command className="bg-transparent">
                                    <CommandInput 
                                        placeholder="Search or add new tag..." 
                                        value={tagInput}
                                        onValueChange={setTagInput}
                                        className="h-12 border-none focus:ring-0" 
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && tagInput) {
                                                e.preventDefault();
                                                addTag(tagInput);
                                            }
                                        }}
                                    />
                                    <CommandList className="max-h-64 overflow-y-auto w-full">
                                        <CommandEmpty className="py-6 text-center text-sm">
                                            <p className="text-muted-foreground mb-4">No matching tags found.</p>
                                            <Button 
                                                variant="secondary" 
                                                size="sm"
                                                onClick={() => addTag(tagInput)}
                                                className="rounded-full shadow-sm font-bold"
                                            >
                                                Create "{tagInput}"
                                            </Button>
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {allTags.filter(t => t.includes(tagInput.toLowerCase()) && !recipe.tags?.includes(t)).map((tag) => (
                                                <CommandItem
                                                    key={tag}
                                                    value={tag}
                                                    className="w-[calc(100vw-4rem)] sm:w-[500px] h-11 cursor-pointer font-medium"
                                                    onSelect={(currentValue) => {
                                                        addTag(currentValue);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", recipe.tags?.includes(tag) ? "opacity-100 text-primary" : "opacity-0")} />
                                                    {tag}
                                                </CommandItem>
                                            ))}
                                            {tagInput && !allTags.includes(tagInput.toLowerCase()) && (
                                                <CommandItem
                                                    value={tagInput}
                                                    className="w-[calc(100vw-4rem)] sm:w-[500px] h-11 text-primary font-bold cursor-pointer bg-primary/5"
                                                    onSelect={(currentValue) => {
                                                        addTag(currentValue);
                                                    }}
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Create "{tagInput}"
                                                </CommandItem>
                                            )}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </section>

                {/* 3. Time Pickers */}
                <section className="grid grid-cols-1 gap-8 pt-4">
                    <TimePicker label="Prep Time (準備時間)" value={recipe.prepTime || ""} field="prep" />
                    <TimePicker label="Cook Time (調理時間)" value={recipe.cookTime || ""} field="cook" />
                </section>

                {/* 4. Ingredients & Instructions */}
                <section className="space-y-6 pt-4">
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ingredients</label>
                        <Textarea
                            rows={6}
                            value={ingredientsText}
                            onChange={e => setIngredientsText(e.target.value)}
                            className="rounded-3xl p-5 bg-muted/20 border-transparent focus-visible:ring-1 focus-visible:ring-primary/50 text-base leading-relaxed placeholder:text-muted-foreground/40 resize-none shadow-inner"
                            placeholder="豚肉 200g&#10;玉ねぎ 1個"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Instructions</label>
                        <Textarea
                            rows={8}
                            value={instructionsText}
                            onChange={e => setInstructionsText(e.target.value)}
                            className="rounded-3xl p-5 bg-muted/20 border-transparent focus-visible:ring-1 focus-visible:ring-primary/50 text-base leading-relaxed placeholder:text-muted-foreground/40 resize-none shadow-inner"
                            placeholder="1. 野菜を切る&#10;&#10;2. 炒める"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes / Memo</label>
                        <Textarea
                            rows={4}
                            value={recipe.notes || ""}
                            onChange={e => setRecipe({ ...recipe, notes: e.target.value })}
                            className="rounded-3xl p-5 bg-muted/20 border-transparent focus-visible:ring-1 focus-visible:ring-primary/50 text-base leading-relaxed placeholder:text-muted-foreground/40 resize-none shadow-inner"
                            placeholder="・塩加減は適度に調整&#10;・子供用にはコショウを控える"
                        />
                    </div>
                </section>

                {/* 5. Photos */}
                <section className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <ImageIcon className="w-4 h-4" />
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Photos (Max 3)</label>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {recipe.images?.map(key => (
                            <div key={key} className="relative w-28 h-28 rounded-3xl overflow-hidden shadow-sm border border-border/50 bg-muted group">
                                <img src={`/api/images/${key}`} alt="" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeImage(key)}
                                    className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:scale-110 active:scale-90"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {id && (recipe.images?.length || 0) < 3 && (
                            <label className="w-28 h-28 border-2 border-dashed border-muted/80 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/40 hover:border-primary/50 transition-all group active:scale-95 bg-muted/10">
                                <span className="bg-background rounded-full p-2 mb-2 shadow-sm group-hover:shadow transition-shadow">
                                    <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </span>
                                <span className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase group-hover:text-primary/80 transition-colors">追加</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        )}
                        {!id && (
                            <div className="w-full p-4 rounded-2xl bg-muted/30 border border-muted/50 text-center text-xs font-semibold text-muted-foreground flex items-center justify-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                レシピを一度保存すると画像を追加できます
                            </div>
                        )}
                    </div>
                    {uploading && <div className="text-[10px] text-primary mt-2 font-bold animate-pulse uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary animate-ping" />Uploading...</div>}
                </section>

                {/* 6. URL */}
                <section className="space-y-3 pt-4 border-t border-muted/30">
                    <div className="flex items-center gap-2 text-muted-foreground pt-2">
                        <LinkIcon className="w-4 h-4" />
                        <label className="text-sm font-semibold tracking-tight">Source URL</label>
                    </div>
                    <Input
                        type="url" placeholder="https://..."
                        value={recipe.url || ""}
                        onChange={e => setRecipe({ ...recipe, url: e.target.value })}
                        className="h-14 rounded-2xl bg-muted/20 border-transparent text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/50"
                    />
                </section>

                <div className="h-10" /> {/* Bottom padding to prevent overlap with fixed bar */}

                {/* Fixed Bottom Action Bar */}
                <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-background/80 backdrop-blur-xl border-t border-border/50 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.15)] z-40">
                    <div className="max-w-xl mx-auto flex gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onCancel}
                            className="flex-[0.8] h-14 rounded-full font-bold text-muted-foreground hover:bg-muted/80 shadow-sm transition-all"
                        >
                            閉じる
                        </Button>
                        <Button
                            type="submit"
                            className="flex-[1.2] h-14 rounded-full font-extrabold text-lg shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all"
                        >
                            レシピを保存
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
