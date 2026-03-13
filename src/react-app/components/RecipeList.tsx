import { useEffect, useState } from "react";
import { api } from "../api";
import { Recipe } from "../types/schema.org";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Plus, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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

    const parseISOToMinutes = (iso: string) => {
        const match = iso?.match(/PT(\d+)M/);
        return match ? parseInt(match[1]) : 0;
    };

    if (loading) return <div className="p-12 text-center animate-pulse text-muted-foreground">Loading recipes...</div>;
    
    if (error) return (
        <Card className="border-destructive bg-destructive/5 text-destructive">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertCircle className="w-5 h-5" />
                    Error loading recipes
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm opacity-90">{error}</p>
            </CardContent>
            <CardFooter>
                <Button variant="destructive" onClick={() => window.location.reload()}>
                    Retry (Reload App)
                </Button>
            </CardFooter>
        </Card>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-extrabold tracking-tight">My Recipes</h2>
                <div className="flex gap-2">
                    <Button variant="outline" asChild className="gap-2 hidden sm:flex">
                        <a href="/api/export" download title="Export all recipes as JSON">
                            <Download className="w-4 h-4" />
                            <span>Export</span>
                        </a>
                    </Button>
                    <Button onClick={onCreateNew} className="gap-2 shadow-lg hover:shadow-xl transition-shadow rounded-xl">
                        <Plus className="w-5 h-5" />
                        <span className="font-bold">Add Recipe</span>
                    </Button>
                </div>
            </div>

            {recipes.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-3xl bg-muted/20">
                    <p className="text-muted-foreground italic mb-4">No recipes found. Create one!</p>
                    <Button onClick={onCreateNew} variant="secondary" className="gap-2 rounded-xl">
                        <Plus className="w-4 h-4" />
                        Add First Recipe
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recipes.map((r) => {
                        const prepMin = parseISOToMinutes(r.prepTime || "");
                        const cookMin = parseISOToMinutes(r.cookTime || "");
                        
                        return (
                            <Card
                                key={r.id}
                                onClick={() => r.id && onSelectRecipe(r.id)}
                                className="group cursor-pointer hover:shadow-md transition-all active:scale-[0.98] border-muted overflow-hidden bg-card"
                            >
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        <Badge variant="outline" className={cn(
                                            "px-2 py-0 border text-[9px] font-black uppercase tracking-widest",
                                            r.cookingMode === 'MAKE_AHEAD' ? 'border-primary/50 text-primary bg-primary/10' :
                                            r.cookingMode === 'LUNCH' ? 'border-secondary/50 text-secondary-foreground bg-secondary/50' :
                                            'border-accent/50 text-accent-foreground bg-accent/50'
                                        )}>
                                            {r.cookingMode?.replace('_', ' ') || 'DINNER'}
                                        </Badge>
                                        {r.tags?.slice(0, 3).map(t => (
                                            <Badge key={t} variant="secondary" className="px-2 py-0 text-[9px] font-bold bg-muted/60 text-muted-foreground">
                                                #{t}
                                            </Badge>
                                        ))}
                                        {(r.tags?.length || 0) > 3 && (
                                            <span className="text-[10px] text-muted-foreground font-medium pl-1 self-center">
                                                +{r.tags!.length - 3}
                                            </span>
                                        )}
                                    </div>
                                    <CardTitle className="text-lg leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
                                        {r.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardFooter className="p-4 pt-4 border-t border-muted/30 bg-muted/10 flex justify-between items-center text-xs text-muted-foreground font-medium">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Prep: {prepMin > 0 ? `${prepMin}m` : '--'}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Cook: {cookMin > 0 ? `${cookMin}m` : '--'}</span>
                                    </div>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}
            
            {/* Mobile Export Button */}
            {recipes.length > 0 && (
                <div className="sm:hidden flex justify-center pt-8 pb-4">
                    <Button variant="outline" asChild className="gap-2 rounded-full text-muted-foreground bg-background">
                        <a href="/api/export" download>
                            <Download className="w-4 h-4" />
                            <span>Export All Recipes as JSON</span>
                        </a>
                    </Button>
                </div>
            )}
        </div>
    );
}
