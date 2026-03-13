import { useEffect, useState } from "react";
import { api } from "../api";
import { Recipe } from "../types/schema.org";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, Edit, Trash2, Sun, ExternalLink, Clock, Utensils, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export function RecipeDetail({ id, onBack, onEdit, onDelete }: { id: string, onBack: () => void, onEdit: (id: string) => void, onDelete: (id: string) => void }) {
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [wakeLockEnabled, setWakeLockEnabled] = useState(false);

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

    const parseJson = (val: any) => {
        try {
            if (typeof val === "string") {
                const parsed = JSON.parse(val);
                return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
            }
            return val;
        } catch (e) {
            console.error("Failed to parse JSON", e);
            return null;
        }
    };

    const ingredients = parseJson(recipe?.recipeIngredient);
    const instructions = parseJson(recipe?.recipeInstructions);

    if (loading) return <div className="p-12 text-center animate-pulse text-muted-foreground">Loading recipe details...</div>;
    if (!recipe) return <div className="p-12 text-center text-destructive font-bold">Recipe not found.</div>;

    const parseISOToMinutes = (iso: string) => {
        const match = iso?.match(/PT(\d+)M/);
        return match ? parseInt(match[1]) : 0;
    };

    const prepMin = parseISOToMinutes(recipe.prepTime || "");
    const cookMin = parseISOToMinutes(recipe.cookTime || "");

    return (
        <div className="bg-background min-h-screen pb-24">
            <div className="bg-background/80 backdrop-blur-lg border-b sticky top-0 z-30">
                <div className="max-w-3xl mx-auto px-4 h-16 flex justify-between items-center">
                    <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 rounded-full -ml-2">
                        <ChevronLeft className="w-4 h-4" />
                        <span>戻る</span>
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(id)} className="rounded-full text-muted-foreground hover:text-primary transition-colors">
                            <Edit className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleDelete} className="rounded-full text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
                {/* Header Section */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <Badge variant="outline" className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2",
                                recipe.cookingMode === 'MAKE_AHEAD' ? 'border-primary/50 text-primary bg-primary/10' :
                                    recipe.cookingMode === 'LUNCH' ? 'border-secondary/50 text-secondary-foreground bg-secondary/50' :
                                        'border-accent/50 text-accent-foreground bg-accent/50'
                            )}>
                                {recipe.cookingMode?.replace('_', ' ') || 'DINNER'}
                            </Badge>
                            {recipe.tags?.map(t => (
                                <Badge key={t} variant="secondary" className="px-3 py-1 bg-secondary/50 text-muted-foreground rounded-full text-[10px] font-semibold">
                                    #{t}
                                </Badge>
                            ))}
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">{recipe.name}</h1>
                    </div>

                    {wakeLockEnabled && (
                        <Badge className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-2xl border-primary/30 gap-2 border shadow-sm animate-in fade-in slide-in-from-top-2">
                            <Sun className="w-4 h-4 fill-primary text-primary animate-spin-slow" />
                            <span className="text-xs font-black uppercase tracking-widest">料理中スリープ防止 ON</span>
                        </Badge>
                    )}
                </div>

                {/* Images Section */}
                {recipe.images && recipe.images.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {recipe.images.map((key) => (
                            <Dialog key={key}>
                                <DialogTrigger asChild>
                                    <div className="aspect-[4/3] relative overflow-hidden rounded-3xl border bg-muted shadow-sm group cursor-pointer active:scale-95 transition-all">
                                        <img
                                            src={`/api/images/${key}`}
                                            alt={recipe.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl p-1 bg-black/10 backdrop-blur-xl border-none shadow-none">
                                    <img
                                        src={`/api/images/${key}`}
                                        alt={recipe.name}
                                        className="w-full h-auto max-h-[90vh] object-contain rounded-2xl"
                                    />
                                </DialogContent>
                            </Dialog>
                        ))}
                    </div>
                )}

                {/* Meta Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-muted/30 rounded-[2rem] border border-muted-foreground/5 items-center">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Prep</span>
                        </div>
                        <p className="text-sm font-semibold">{prepMin > 0 ? `${prepMin} min` : "--"}</p>
                    </div>
                    <div className="space-y-1 border-l pl-4 border-muted">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Cook</span>
                        </div>
                        <p className="text-sm font-semibold">{cookMin > 0 ? `${cookMin} min` : "--"}</p>
                    </div>
                    {recipe.url && (
                        <div className="col-span-2 space-y-1 border-l sm:pl-4 border-muted">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Source</span>
                            </div>
                            <a href={recipe.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline truncate block max-w-full">
                                {new URL(recipe.url).hostname}
                            </a>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                    {/* Ingredients */}
                    <Card className="lg:col-span-2 rounded-[2rem] border-muted bg-card shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <Utensils className="w-5 h-5 text-primary" />
                                <span>材料</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                {ingredients?.map((ing: any, idx: number) => (
                                    <li key={idx} className="flex justify-between items-baseline border-b border-dashed border-muted pb-2 last:border-0 last:pb-0">
                                        <span className="text-sm font-medium">{ing.name}</span>
                                        <span className="text-sm text-muted-foreground font-semibold">
                                            {ing.amount} {ing.unit}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Instructions */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Tag className="w-5 h-5 text-primary" />
                            <h3 className="text-xl font-bold">作り方</h3>
                        </div>
                        <div className="space-y-8">
                            {instructions?.map((step: any, idx: number) => (
                                <div key={idx} className="relative pl-12 group">
                                    <span className="absolute left-0 top-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                        {idx + 1}
                                    </span>
                                    <p className="text-base text-muted-foreground leading-relaxed pt-1">
                                        {step.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
