import { useEffect, useState, useMemo } from "react";
import { api, SESSION_EXPIRED_ERROR } from "../api";
import { Recipe } from "../types/schema.org";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import removed
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Download, Plus, AlertCircle, Clock, Search, Filter, X, Tag, Utensils, Sparkles, Pin, ArrowUp, ArrowDown, ListFilter, CookingPot, Sun, Moon, Flame } from "lucide-react";
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
    const [showScrollTop, setShowScrollTop] = useState(false);
    
    type SortAxis = 'updatedAt' | 'createdAt' | 'lastCookedAt' | 'cookCount' | 'prepTime' | 'cookTime';
    type SortOrder = 'desc' | 'asc';
    const [sortAxis, setSortAxis] = useState<SortAxis>('updatedAt');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    
    const SORT_OPTIONS: { value: SortAxis; label: string }[] = [
        { value: 'updatedAt', label: '更新日時' },
        { value: 'createdAt', label: '登録日時' },
        { value: 'lastCookedAt', label: '最終調理日' },
        { value: 'cookCount', label: '調理回数' },
        { value: 'prepTime', label: '準備時間' },
        { value: 'cookTime', label: '調理時間' },
    ];
    const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortAxis)?.label || '更新日時';

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

    const isSessionExpiredError = error === SESSION_EXPIRED_ERROR;

    const filteredRecipes = useMemo(() => {
        const filtered = recipes.filter(r => {
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

        // Always sort pinned items to the top, then by selected sort axis and order
        filtered.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;

            let valA: any = 0;
            let valB: any = 0;

            switch(sortAxis) {
                case 'updatedAt':
                    valA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                    valB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                    break;
                case 'createdAt':
                    valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    break;
                case 'lastCookedAt':
                    valA = a.lastCookedAt ? new Date(a.lastCookedAt).getTime() : 0;
                    valB = b.lastCookedAt ? new Date(b.lastCookedAt).getTime() : 0;
                    break;
                case 'cookCount':
                    valA = a.cookCount || 0;
                    valB = b.cookCount || 0;
                    break;
                case 'prepTime':
                    valA = parseISOToMinutes(a.prepTime || "");
                    valB = parseISOToMinutes(b.prepTime || "");
                    break;
                case 'cookTime':
                    valA = parseISOToMinutes(a.cookTime || "");
                    valB = parseISOToMinutes(b.cookTime || "");
                    break;
            }

            if (valA < valB) return sortOrder === 'desc' ? 1 : -1;
            if (valA > valB) return sortOrder === 'desc' ? -1 : 1;
            return 0;
        });

        return filtered;
    }, [recipes, searchQuery, selectedModes, selectedTags, sortAxis, sortOrder]);

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
                    {isSessionExpiredError ? "ログインセッションが切れました" : "Error loading recipes"}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm opacity-90">
                    {isSessionExpiredError
                        ? "認証の有効期限が切れた可能性があります。再ログインしてください。"
                        : error
                    }
                </p>
            </CardContent>
            <CardFooter className="gap-3">
                {isSessionExpiredError ? (
                    <Button
                        variant="destructive"
                        onClick={() => { window.location.href = "/api/login"; }}
                    >
                        再ログイン
                    </Button>
                ) : (
                    <Button variant="destructive" onClick={() => window.location.reload()}>
                        Retry (Reload App)
                    </Button>
                )}
            </CardFooter>
        </Card>
    );

    return (
        <div className="space-y-4 pb-20">
            {/* 1. Page Title */}
            <div className="flex flex-col gap-2 pt-2">
                <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
                    レシピを探す
                </h2>
                <p className="text-muted-foreground text-sm font-medium">
                    {recipes.length} 品のレシピが登録されています
                </p>
            </div>
            {/* 2. Sticky Header (Tabs + Search & Controls) */}
            <div className="sticky top-16 z-30 flex flex-col gap-3 py-3 bg-background/95 backdrop-blur-lg -mx-2 px-2 shadow-[0_4px_20px_rgba(0,0,0,0.05)] pt-2 md:top-16">
                <div className="h-12 sm:h-14 w-full p-1 bg-muted/50 rounded-full border border-border/40 grid grid-cols-4 gap-1">
                    {[
                        { id: 'ALL', label: 'すべて' },
                        { id: 'MAKE_AHEAD', label: '作り置き' },
                        { id: 'LUNCH', label: 'お昼' },
                        { id: 'DINNER', label: '晩ごはん' }
                    ].map(tab => {
                        const isActive = selectedModes.length === 0 ? tab.id === 'ALL' : selectedModes.length === 1 && selectedModes[0] === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    if (tab.id === 'ALL') setSelectedModes([]);
                                    else setSelectedModes([tab.id]);
                                }}
                                className={cn(
                                    "flex flex-col items-center justify-center h-full rounded-full transition-all duration-200 select-none text-xs sm:text-sm",
                                    isActive 
                                        ? "bg-background text-foreground font-bold shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                                        : "text-muted-foreground font-medium hover:text-foreground/80 hover:bg-muted/40"
                                )}
                            >
                                <span className="leading-none -mt-[1px]">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

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

                {/* Sort Controls */}
                <Drawer>
                    <DrawerTrigger asChild>
                        <Button 
                            variant="outline" 
                            className={cn(
                                "h-14 px-3 min-w-[4rem] rounded-2xl flex-shrink-0 bg-muted/30 border-none shadow-inner relative transition-all active:scale-95 flex flex-col items-center justify-center gap-1",
                                sortAxis !== 'updatedAt' && "text-primary bg-primary/10 ring-2 ring-primary/20"
                            )}
                        >
                            <ListFilter className="h-5 w-5" />
                            <span className="text-[10px] font-bold leading-none">{currentSortLabel}</span>
                        </Button>
                    </DrawerTrigger>
                    <DrawerContent className="px-6 pb-12 rounded-t-[3rem]">
                        <div className="mx-auto w-full max-w-sm space-y-8 mt-4">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                    <ListFilter className="w-3 h-3" /> 並び替えの軸
                                </label>
                                <div className="flex flex-col gap-2">
                                    {SORT_OPTIONS.map(axis => (
                                        <div
                                            key={axis.value}
                                            className={cn(
                                                "px-5 py-4 rounded-2xl text-base font-bold cursor-pointer transition-all active:scale-95 border-none flex justify-between items-center",
                                                sortAxis === axis.value 
                                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                            )}
                                            onClick={() => setSortAxis(axis.value as SortAxis)}
                                        >
                                            {axis.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <DrawerClose asChild>
                                <Button className="w-full rounded-2xl h-14 font-extrabold text-lg shadow-xl shadow-primary/20">
                                    閉じる
                                </Button>
                            </DrawerClose>
                        </div>
                    </DrawerContent>
                </Drawer>

                <Button 
                    title="昇順/降順を切り替え"
                    variant="outline" 
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="h-14 px-3 min-w-[3.5rem] rounded-2xl flex-shrink-0 bg-muted/30 border-none shadow-inner relative transition-all active:scale-95 text-foreground flex flex-col items-center justify-center gap-1"
                >
                    {sortOrder === 'desc' ? <ArrowDown className="h-5 w-5" /> : <ArrowUp className="h-5 w-5" />}
                    <span className="text-[10px] font-bold leading-none text-muted-foreground/70">{sortOrder === 'desc' ? '降順' : '昇順'}</span>
                </Button>

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
                                    <Flame className="w-3 h-3" /> 調理モード
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {['MAKE_AHEAD', 'LUNCH', 'DINNER'].map(mode => (
                                        <Badge
                                            key={mode}
                                            variant="outline"
                                            className={cn(
                                                "px-5 py-2.5 rounded-2xl text-sm font-bold cursor-pointer transition-all active:scale-95 border-none",
                                                selectedModes.includes(mode) 
                                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
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
                <div className="flex flex-col border-y border-border/40 divide-y divide-border/40 bg-card rounded-2xl shadow-sm overflow-hidden ring-1 ring-border/20">
                    {filteredRecipes.map((r) => {
                        const prepMin = parseISOToMinutes(r.prepTime || "");
                        const cookMin = parseISOToMinutes(r.cookTime || "");
                        
                        return (
                            <div
                                key={r.id}
                                onClick={() => r.id && onSelectRecipe(r.id)}
                                className="group cursor-pointer flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors active:bg-muted"
                            >
                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                    <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/5 transition-shadow">
                                        {r.cookingMode === 'MAKE_AHEAD' ? <CookingPot className="w-5 h-5" /> : 
                                         r.cookingMode === 'LUNCH' ? <Sun className="w-5 h-5" /> : 
                                         <Moon className="w-5 h-5" />}
                                    </div>
                                    <div className="flex flex-col overflow-hidden flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm sm:text-base font-extrabold truncate group-hover:text-primary transition-colors text-foreground">
                                                {r.name}
                                            </h3>
                                        </div>
                                        {(prepMin > 0 || cookMin > 0 || (r.tags && r.tags.length > 0)) && (
                                            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate font-bold">
                                                {(prepMin > 0 || cookMin > 0) && (
                                                    <span className="flex items-center gap-0.5 whitespace-nowrap">
                                                        <Clock className="w-3 h-3 text-muted-foreground/70" />
                                                        {prepMin > 0 && `${prepMin}m `}
                                                        {cookMin > 0 && `${cookMin}m`}
                                                    </span>
                                                )}
                                                {r.tags && r.tags.length > 0 && (
                                                    <span className="text-muted-foreground/60 truncate">
                                                        {r.tags.map(t => `#${t}`).join(" ")}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0 ml-1">
                                    <button
                                        onClick={(e) => r.id && togglePin(r.id, !!r.pinned, e)}
                                        className={cn(
                                            "p-2 rounded-full transition-colors active:scale-90 flex items-center justify-center",
                                            r.pinned ? "text-primary" : "text-transparent group-hover:text-muted-foreground/40"
                                        )}
                                    >
                                        <Pin className={cn("w-4 h-4", r.pinned ? "fill-current" : "")} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {/* Floating FAB for Mobile */}
            <div className="fixed bottom-24 right-6 z-40 sm:hidden flex flex-col gap-4">
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
                <Button variant="ghost" onClick={() => api.exportData().catch(() => alert('Failed to export'))} className="text-muted-foreground font-bold rounded-xl hover:bg-muted/50 cursor-pointer">
                    <Download className="w-4 h-4 mr-2" />
                    JSON形式で全レシピを出力
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
                "fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300",
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
