import { useEffect, useState, useMemo } from "react";
import { api } from "../api";
import { Recipe } from "../types/schema.org";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Download, Plus, AlertCircle, Clock, Search, Filter, X, Tag, Utensils, Sparkles, Pin, ArrowUp } from "lucide-react";
import { RecipeImportDialog } from "./RecipeImportDialog";
import { cn } from "@/lib/utils";

export function RecipeList({ onSelectRecipe, onCreateNew, onImportSuccess }: { onSelectRecipe: (id: string) => void, onCreateNew: () => void, onImportSuccess: (data: any) => void }) {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedModes, setSelectedModes] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [showPinnedOnly, setShowPinnedOnly] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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
        const filtered = recipes.filter(r => {
            if (showPinnedOnly && !r.pinned) return false;

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

        // Always sort pinned items to the top, then by most recently updated
        filtered.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;

            const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return timeB - timeA;
        });

        return filtered;
    }, [recipes, searchQuery, selectedModes, selectedTags, showPinnedOnly]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const togglePin = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        const newStatus = !currentStatus;
        // Optimistic update
        setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, pinned: newStatus } : r)));
        try {
            await api.updateRecipe(id, { pinned: newStatus } as any);
        } catch (err) {
            console.error("Failed to toggle pin", err);
            // Revert on failure
            setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, pinned: currentStatus } : r)));
        }
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
        <div className="space-y-10 pb-20">
            {/* 1. Header & Primary Mode Tabs */}
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
                        レシピを探す
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">
                        {recipes.length} 品のレシピが登録されています
                    </p>
                </div>

                <Tabs 
                    value={selectedModes.length === 0 ? "ALL" : selectedModes.length === 1 ? selectedModes[0] : "MULTIPLE"} 
                    onValueChange={(val) => {
                        if (val === "ALL") setSelectedModes([]);
                        else if (val !== "MULTIPLE") setSelectedModes([val]);
                    }} 
                    className="w-full"
                >
                    <TabsList className="h-16 w-full p-1.5 bg-muted/40 rounded-3xl border border-border/40 backdrop-blur-sm grid grid-cols-4">
                        <TabsTrigger value="ALL" className="rounded-2xl font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary">すべて</TabsTrigger>
                        <TabsTrigger value="MAKE_AHEAD" className="rounded-2xl font-bold transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm">作り置き</TabsTrigger>
                        <TabsTrigger value="LUNCH" className="rounded-2xl font-bold transition-all data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm">お昼</TabsTrigger>
                        <TabsTrigger value="DINNER" className="rounded-2xl font-bold transition-all data-[state=active]:bg-accent/20 data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm">晩ごはん</TabsTrigger>
                    </TabsList>
                </Tabs>

            </div>

            {/* 2. Search & Controls */}
            <div className="flex flex-col gap-3 sticky top-0 md:top-20 z-30 py-3 bg-background/80 backdrop-blur-xl -mx-4 px-4 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
                <div className="flex gap-2">
                    <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="レシピ名、材料、タグで検索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 h-14 rounded-2xl bg-muted/30 border-none shadow-inner text-base focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery("")} 
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/50 transition-all"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <Drawer>
                    <DrawerTrigger asChild>
                        <Button 
                            variant="outline" 
                            className={cn(
                                "h-14 w-14 rounded-2xl flex-shrink-0 bg-muted/30 border-none shadow-inner relative transition-all active:scale-95",
                                (selectedTags.length > 0 || selectedModes.length > 1) && "text-primary bg-primary/10 ring-2 ring-primary/20"
                            )}
                        >
                            <Filter className="h-6 h-6" />
                            {(selectedTags.length > 0 || selectedModes.length > 1) && (
                                <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 bg-primary text-primary-foreground text-[10px] font-black rounded-full flex items-center justify-center border-2 border-background">
                                    {selectedTags.length + (selectedModes.length > 1 ? selectedModes.length : 0)}
                                </span>
                            )}
                        </Button>
                    </DrawerTrigger>
                    <DrawerContent className="px-6 pb-12 rounded-t-[3rem]">
                        <div className="mx-auto w-full max-w-sm space-y-8 mt-4">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                    <Utensils className="w-3 h-3" /> 調理モード
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {['MAKE_AHEAD', 'LUNCH', 'DINNER'].map(mode => (
                                        <Badge
                                            key={mode}
                                            variant="outline"
                                            className={cn(
                                                "px-5 py-2.5 rounded-2xl text-sm font-bold cursor-pointer transition-all active:scale-95 border-none",
                                                selectedModes.includes(mode) 
                                                    ? (mode === 'MAKE_AHEAD' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : mode === 'LUNCH' ? "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20" : "bg-accent text-accent-foreground shadow-lg shadow-accent/20")
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
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                    <Tag className="w-3 h-3" /> タグ
                                </label>
                                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                                    {allTags.map(tag => (
                                        <Badge
                                            key={tag}
                                            variant={selectedTags.includes(tag) ? "default" : "secondary"}
                                            className={cn(
                                                "px-4 py-2 rounded-2xl text-sm font-bold cursor-pointer transition-all",
                                                selectedTags.includes(tag) 
                                                    ? "bg-primary text-primary-foreground shadow-md"
                                                    : "bg-muted/30 text-muted-foreground border-transparent"
                                            )}
                                            onClick={() => toggleTag(tag)}
                                        >
                                            #{tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-6">
                                <Button 
                                    variant="ghost" 
                                    onClick={() => { setSelectedTags([]); setSelectedModes([]); }} 
                                    className="flex-1 rounded-2xl h-14 font-bold text-muted-foreground"
                                >
                                    リセット
                                </Button>
                                <DrawerClose asChild>
                                    <Button className="flex-[2] rounded-2xl h-14 font-extrabold text-lg shadow-xl shadow-primary/20">
                                        結果を表示 ({filteredRecipes.length})
                                    </Button>
                                </DrawerClose>
                            </div>
                        </div>
                    </DrawerContent>
                </Drawer>
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    <Badge
                        variant={showPinnedOnly ? "default" : "outline"}
                        className={cn(
                            "px-4 py-2 rounded-2xl cursor-pointer font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap",
                            showPinnedOnly 
                                ? "bg-primary text-primary-foreground border-transparent shadow-primary/20" 
                                : "bg-muted/30 text-muted-foreground hover:bg-muted/80 border-border/40"
                        )}
                        onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                    >
                        <Pin className={cn("w-4 h-4 mr-2", showPinnedOnly ? "fill-current" : "")} />
                        ピン留めのみ
                    </Badge>
                </div>
            </div>

            {/* 3. Recipe Grid */}
            {recipes.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center border-2 border-dashed rounded-[3rem] bg-muted/10 border-muted/40 animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
                        <Utensils className="w-10 h-10 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">レシピがまだありません</h3>
                    <p className="text-muted-foreground mb-8 max-w-xs">お気に入りのレシピを登録して、自分だけのデータベースを作りましょう。</p>
                    <Button onClick={onCreateNew} size="lg" className="rounded-2xl h-16 px-8 font-extrabold text-lg shadow-xl shadow-primary/20">
                        最初のレシピを追加
                    </Button>
                </div>
            ) : filteredRecipes.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center rounded-[3rem] bg-muted/5 border border-muted/20">
                    <Search className="w-16 h-16 text-muted-foreground/20 mb-6" />
                    <p className="text-xl font-bold mb-2">見つかりませんでした</p>
                    <p className="text-muted-foreground mb-8">検索条件を変えてみてください。</p>
                    <Button 
                        variant="secondary" 
                        onClick={() => { setSearchQuery(""); setSelectedModes([]); setSelectedTags([]); }} 
                        className="rounded-2xl h-12 font-bold px-6"
                    >
                        フィルターをクリア
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredRecipes.map((r) => {
                        const prepMin = parseISOToMinutes(r.prepTime || "");
                        const cookMin = parseISOToMinutes(r.cookTime || "");
                        
                        return (
                            <Card
                                key={r.id}
                                onClick={() => r.id && onSelectRecipe(r.id)}
                                className="group cursor-pointer rounded-[2.5rem] border-none bg-card hover:bg-muted/50 transition-all duration-300 active:scale-[0.97] overflow-hidden shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.1)] ring-1 ring-border/40"
                            >
                                <div className="p-8 space-y-6">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2",
                                            r.cookingMode === 'MAKE_AHEAD' ? 'border-primary/40 text-primary bg-primary/5' :
                                            r.cookingMode === 'LUNCH' ? 'border-secondary/60 text-secondary-foreground bg-secondary/10' :
                                            'border-accent/60 text-accent-foreground bg-accent/10'
                                        )}>
                                            {r.cookingMode === 'MAKE_AHEAD' ? '作り置き' : r.cookingMode === 'LUNCH' ? 'お昼' : '晩ごはん'}
                                        </Badge>
                                        <div className="flex gap-2 items-center">
                                            <button
                                                onClick={(e) => r.id && togglePin(r.id, !!r.pinned, e)}
                                                className={cn(
                                                    "p-2 rounded-full transition-colors active:scale-90",
                                                    r.pinned ? "text-primary bg-primary/10" : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted"
                                                )}
                                            >
                                                <Pin className={cn("w-5 h-5", r.pinned ? "fill-current" : "")} />
                                            </button>
                                            {r.images && r.images.length > 0 && (
                                                <div className="flex -space-x-2">
                                                    {r.images.slice(0, 3).map((img, idx) => (
                                                        <div key={idx} className="w-6 h-6 rounded-full border-2 border-background bg-muted overflow-hidden">
                                                            <img src={`/api/images/${img}`} className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-black leading-tight tracking-tight group-hover:text-primary transition-colors duration-300">
                                        {r.name}
                                    </h3>
                                    
                                    <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/40">
                                        {(prepMin > 0 || cookMin > 0) && (
                                            <div className="flex items-center gap-2 group/time">
                                                <div className="p-1.5 rounded-lg bg-muted text-muted-foreground group-hover/time:bg-primary/10 group-hover/time:text-primary transition-colors">
                                                    <Clock className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-bold tracking-tight">
                                                    {prepMin > 0 && `${prepMin}m `}
                                                    {cookMin > 0 && `${cookMin}m`}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {r.tags && r.tags.length > 0 && (
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
                                                    <Tag className="w-4 h-4" />
                                                </div>
                                                <div className="flex gap-1 overflow-hidden">
                                                    {r.tags.map(t => (
                                                        <span key={t} className="text-[10px] font-bold text-muted-foreground/60 whitespace-nowrap">#{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
            
            {/* Floating FAB for Mobile */}
            <div className="fixed bottom-8 right-6 z-40 sm:hidden flex flex-col gap-4">
                <RecipeImportDialog onExtractionSuccess={onImportSuccess}>
                    <Button 
                        variant="secondary"
                        className="w-14 h-14 rounded-[2rem] shadow-xl bg-primary/10 text-primary border-none hover:bg-primary/20 p-0 flex items-center justify-center animate-in zoom-in-50 duration-500 delay-100"
                    >
                        <Sparkles className="w-6 h-6" />
                    </Button>
                </RecipeImportDialog>
                <Button 
                    onClick={onCreateNew} 
                    className="w-16 h-16 rounded-[2rem] shadow-2xl shadow-primary/40 p-0 flex items-center justify-center animate-in zoom-in-50 duration-500"
                >
                    <Plus className="w-8 h-8" />
                </Button>
            </div>

            {/* Desktop Export & Add */}
            <div className="hidden sm:flex justify-between items-center pt-10 border-t border-border/40">
                <Button variant="ghost" asChild className="text-muted-foreground font-bold rounded-xl hover:bg-muted/50">
                    <a href="/api/export" download>
                        <Download className="w-4 h-4 mr-2" />
                        JSON形式で全レシピを出力
                    </a>
                </Button>
                <div className="flex gap-3">
                    <RecipeImportDialog onExtractionSuccess={onImportSuccess}>
                        <Button variant="secondary" size="lg" className="rounded-2xl h-14 px-6 font-extrabold shadow-sm bg-primary/10 text-primary hover:bg-primary/20">
                            <Sparkles className="w-5 h-5 mr-2" /> AI 取り込み
                        </Button>
                    </RecipeImportDialog>
                    <Button onClick={onCreateNew} size="lg" className="rounded-2xl h-14 px-8 font-extrabold shadow-xl shadow-primary/20">
                        <Plus className="w-5 h-5 mr-2" />
                        新しいレシピを作成
                    </Button>
                </div>
            </div>

            {/* Scroll to Top */}
            <div className={cn(
                "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300",
                showScrollTop ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0 pointer-events-none"
            )}>
                <Button 
                    onClick={scrollToTop} 
                    variant="outline"
                    className="rounded-full h-12 px-5 shadow-2xl backdrop-blur-md bg-background/80 text-foreground font-bold"
                >
                    <ArrowUp className="w-5 h-5 mr-2" />
                    トップへ
                </Button>
            </div>
        </div>
    );
}

// Ensure Search, Filter, X, Tag are imported from lucide-react
