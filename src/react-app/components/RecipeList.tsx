import { useEffect, useState, useMemo } from "react";
import { api } from "../api";
import { Recipe } from "../types/schema.org";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Download, Plus, AlertCircle, Clock, Search, Filter, X, Tag, Utensils, CalendarClock, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function RecipeList({ onSelectRecipe, onCreateNew }: { onSelectRecipe: (id: string) => void, onCreateNew: () => void }) {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedModes, setSelectedModes] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        api.getRecipes()
            .then(data => {
                setRecipes(data);
                const tags = new Set<string>();
                data.forEach(r => r.tags?.forEach(t => tags.add(t)));
                setAllTags(Array.from(tags).sort());
            })
            .catch(err => {
                console.error("Fetch error:", err);
                setError(err.message || "Failed to load recipes");
            })
            .finally(() => setLoading(false));
    }, []);

    const filteredRecipes = useMemo(() => {
        return recipes.filter(r => {
            // Mode filter (OR condition for multiple selected modes)
            if (selectedModes.length > 0) {
                if (!r.cookingMode || !selectedModes.includes(r.cookingMode)) return false;
            }
            
            // Tags filter (AND condition)
            if (selectedTags.length > 0) {
                if (!r.tags) return false;
                const hasAllTags = selectedTags.every(t => r.tags!.includes(t));
                if (!hasAllTags) return false;
            }

            // Text search (Name, Category, Tags, Ingredient names)
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const nameMatch = r.name.toLowerCase().includes(q);
                const tagMatch = r.tags?.some(t => t.toLowerCase().includes(q));
                let ingMatch = false;
                if (r.recipeIngredient) {
                    try {
                        const ings = typeof r.recipeIngredient === 'string' ? JSON.parse(r.recipeIngredient) : r.recipeIngredient;
                        if (Array.isArray(ings)) {
                            ingMatch = ings.some((i: any) => i.name && typeof i.name === 'string' && i.name.toLowerCase().includes(q));
                        }
                    } catch (e) { console.error("Filter JSON parse error:", e); }
                }
                if (!nameMatch && !tagMatch && !ingMatch) return false;
            }
            return true;
        });
    }, [recipes, searchQuery, selectedModes, selectedTags]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

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

            {recipes.length > 0 && (
                <div className="space-y-4 mb-8">
                    {/* Search Bar & Filter Drawer */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Search recipes, ingredients, tags..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 h-12 rounded-2xl bg-card border-none shadow-sm text-base focus-visible:ring-1 focus-visible:ring-primary/50"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery("")} 
                                    className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <Drawer>
                            <DrawerTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    className={cn(
                                        "h-12 w-12 rounded-2xl flex-shrink-0 bg-card border-none shadow-sm relative",
                                        (selectedTags.length > 0 || selectedModes.length > 0) && "text-primary bg-primary/10"
                                    )}
                                >
                                    <Filter className="h-5 w-5" />
                                    {(selectedTags.length > 0 || selectedModes.length > 0) && (
                                        <span className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] px-1 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                                            {selectedTags.length + selectedModes.length}
                                        </span>
                                    )}
                                </Button>
                            </DrawerTrigger>
                            <DrawerContent className="px-4">
                                <div className="mx-auto w-full max-w-sm">
                                    <DrawerHeader className="px-0 pb-2">
                                        <DrawerTitle className="text-left flex items-center gap-2">
                                            <Utensils className="w-5 h-5 text-primary" /> Cooking Mode
                                        </DrawerTitle>
                                    </DrawerHeader>
                                    <div className="pb-4 flex flex-wrap gap-2 border-b border-muted">
                                        {['MAKE_AHEAD', 'LUNCH', 'DINNER'].map(mode => (
                                            <Badge
                                                key={mode}
                                                variant="outline"
                                                className={cn(
                                                    "px-3 py-1.5 text-sm font-semibold cursor-pointer transition-all active:scale-95 border-none",
                                                    selectedModes.includes(mode) 
                                                        ? (mode === 'MAKE_AHEAD' ? "bg-primary/20 text-primary shadow-sm" : mode === 'LUNCH' ? "bg-secondary/80 text-secondary-foreground shadow-sm" : "bg-accent/80 text-accent-foreground shadow-sm")
                                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                                )}
                                                onClick={() => {
                                                    setSelectedModes(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]);
                                                }}
                                            >
                                                {mode === 'MAKE_AHEAD' ? '作り置き' : mode === 'LUNCH' ? 'お昼' : '晩ごはん'}
                                            </Badge>
                                        ))}
                                    </div>

                                    <DrawerHeader className="px-0 pt-4 pb-2">
                                        <DrawerTitle className="text-left flex items-center gap-2">
                                            <Tag className="w-5 h-5 text-primary" /> Tags
                                        </DrawerTitle>
                                    </DrawerHeader>
                                    <div className="pb-4 flex flex-wrap gap-2">
                                        {allTags.length === 0 ? (
                                            <p className="text-sm text-muted-foreground italic">No tags combined.</p>
                                        ) : (
                                            allTags.map(tag => (
                                                <Badge
                                                    key={tag}
                                                    variant={selectedTags.includes(tag) ? "default" : "secondary"}
                                                    className={cn(
                                                        "px-3 py-1.5 text-sm font-semibold cursor-pointer transition-all active:scale-95",
                                                        selectedTags.includes(tag) 
                                                            ? "bg-primary text-primary-foreground shadow-md"
                                                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                                    )}
                                                    onClick={() => toggleTag(tag)}
                                                >
                                                    #{tag}
                                                </Badge>
                                            ))
                                        )}
                                    </div>
                                    <DrawerFooter className="px-0 pt-2 pb-6 flex flex-row gap-2">
                                        <Button 
                                            variant="outline" 
                                            onClick={() => { setSelectedTags([]); setSelectedModes([]); }} 
                                            className="flex-1 rounded-full text-muted-foreground"
                                            disabled={selectedTags.length === 0 && selectedModes.length === 0}
                                        >
                                            Clear Filters
                                        </Button>
                                        <DrawerClose asChild>
                                            <Button className="flex-[2] rounded-full font-bold shadow-md shadow-primary/20">
                                                Show Results ({filteredRecipes.length})
                                            </Button>
                                        </DrawerClose>
                                    </DrawerFooter>
                                </div>
                            </DrawerContent>
                        </Drawer>
                    </div>

                    {/* Mode Tabs */}
                    <div className="overflow-x-auto pb-1 no-scrollbar flex -mx-1 px-1">
                        <Tabs value={selectedModes.length === 0 ? "ALL" : selectedModes.length === 1 ? selectedModes[0] : "MULTIPLE"} onValueChange={(val) => {
                            if (val === "ALL") setSelectedModes([]);
                            else if (val !== "MULTIPLE") setSelectedModes([val]);
                        }} className="w-full">
                            <TabsList className="h-12 p-1 bg-muted/50 rounded-2xl w-max grid grid-cols-4 min-w-full relative">
                                <TabsTrigger value="ALL" className="rounded-xl font-bold text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">すべて</TabsTrigger>
                                <TabsTrigger value="MAKE_AHEAD" className="rounded-xl font-bold text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-sm">作り置き</TabsTrigger>
                                <TabsTrigger value="LUNCH" className="rounded-xl font-bold text-xs data-[state=active]:bg-secondary/50 data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm">お昼</TabsTrigger>
                                <TabsTrigger value="DINNER" className="rounded-xl font-bold text-xs data-[state=active]:bg-accent/50 data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm">晩ごはん</TabsTrigger>
                                <TabsTrigger value="MULTIPLE" className="hidden">複数</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>
            )}

            {recipes.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-3xl bg-muted/20">
                    <p className="text-muted-foreground italic mb-4">No recipes found. Create one!</p>
                    <Button onClick={onCreateNew} variant="secondary" className="gap-2 rounded-xl">
                        <Plus className="w-4 h-4" />
                        Add First Recipe
                    </Button>
                </div>
            ) : filteredRecipes.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-muted/10 border border-muted/30">
                    <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground font-semibold mb-1">No matches found</p>
                    <p className="text-sm text-muted-foreground/80 mb-4">Try adjusting your filters or search terms.</p>
                    <Button 
                        variant="outline" 
                        onClick={() => {
                            setSearchQuery("");
                            setSelectedModes([]);
                            setSelectedTags([]);
                        }} 
                        className="gap-2 rounded-full text-xs font-bold"
                    >
                        <X className="w-3.5 h-3.5" />
                        Clear all filters
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {filteredRecipes.map((r) => {
                        const prepMin = parseISOToMinutes(r.prepTime || "");
                        const cookMin = parseISOToMinutes(r.cookTime || "");
                        
                        return (
                            <Card
                                key={r.id}
                                onClick={() => r.id && onSelectRecipe(r.id)}
                                className="group cursor-pointer hover:shadow-md transition-all active:scale-[0.98] border-muted overflow-hidden bg-card"
                            >
                                <div className="px-3.5 py-2.5 flex flex-col justify-center">
                                    <h3 className="text-[15px] font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors mb-1 flex items-start gap-1.5">
                                        {r.cookingMode === 'MAKE_AHEAD' ? (
                                            <CalendarClock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                        ) : r.cookingMode === 'LUNCH' ? (
                                            <Sun className="w-4 h-4 text-secondary-foreground mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <Moon className="w-4 h-4 text-accent-foreground mt-0.5 flex-shrink-0" />
                                        )}
                                        <span>{r.name}</span>
                                    </h3>
                                    
                                    {((prepMin > 0 || cookMin > 0) || (r.tags && r.tags.length > 0)) && (
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground w-full">
                                            {(prepMin > 0 || cookMin > 0) && (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3 opacity-70" />
                                                    <span className="font-semibold text-[10px] uppercase truncate max-w-[100px]">
                                                        {prepMin > 0 ? `P:${prepMin}m ` : ''}
                                                        {cookMin > 0 ? `C:${cookMin}m` : ''}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {(r.tags && r.tags.length > 0) && (
                                                <div className={cn("flex items-center gap-1 truncate max-w-[120px]", (prepMin > 0 || cookMin > 0) && "border-l pl-2 border-muted/50")}>
                                                    <Tag className="w-3 h-3 opacity-70 flex-shrink-0" />
                                                    <span className="font-semibold text-[10px] truncate">
                                                        {r.tags.map(t => `#${t}`).join(', ')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
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

// Ensure Search, Filter, X, Tag are imported from lucide-react
