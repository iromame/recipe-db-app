import { useEffect, useState } from "react";
import { api } from "../api";
import { Recipe } from "../types/schema.org";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Checkbox } from "@/components/ui/checkbox";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import { ChevronLeft, Edit, Sun, ExternalLink, Clock, Utensils, Tag, NotepadText, Copy, Check, Share2, Scale, Pin, CookingPot, Moon, ShoppingCart, Flame, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCookingStore } from "../store/useCookingStore";
import { useShoppingListStore } from "../store/useShoppingListStore";

function CopyButton({ text, label }: { text: string, label?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2 text-muted-foreground hover:text-primary gap-1.5" title={`${label}をコピー`}>
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            <span className="text-xs font-semibold">{copied ? "Copied!" : "Copy"}</span>
        </Button>
    );
}

export function RecipeDetail({ id, onBack, onEdit }: { id: string, onBack: () => void, onEdit: (id: string) => void }) {
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [wakeLockEnabled, setWakeLockEnabled] = useState(false);
    const [carouselApi, setCarouselApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isAddingToQueue, setIsAddingToQueue] = useState(false);
    const [addedToast, setAddedToast] = useState(false);
    const [cartToast, setCartToast] = useState<{show: boolean, msg: string}>({show: false, msg: ""});
    const [mdCopied, setMdCopied] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [addShopping, setAddShopping] = useState(true);
    const [addCooking, setAddCooking] = useState(true);
    const { addSession } = useCookingStore();
    const { addMultipleItems } = useShoppingListStore();

    useEffect(() => {
        if (!carouselApi) return;
        
        setCurrent(carouselApi.selectedScrollSnap() + 1);
        carouselApi.on("select", () => {
            setCurrent(carouselApi.selectedScrollSnap() + 1);
        });
    }, [carouselApi]);

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



    const handleTogglePin = async () => {
        if (!recipe) return;
        const newStatus = !recipe.pinned;
        setRecipe({ ...recipe, pinned: newStatus });
        try {
            await api.updateRecipe(id, { pinned: newStatus } as any);
        } catch (err) {
            console.error("Failed to toggle pin", err);
            setRecipe({ ...recipe, pinned: !newStatus });
        }
    };

    const handleShare = async () => {
        if (!recipe) return;
        const shareTitle = `${recipe.name} - Mame`;
        const shareUrl = window.location.href;
        const shareText = `${recipe.name}\n${shareUrl}`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: shareTitle,
                    text: recipe.name,
                    url: shareUrl,
                });
            } else {
                await navigator.clipboard.writeText(shareText);
                alert("レシピとリンクをコピーしました");
            }
        } catch (err: any) {
            console.error("Error sharing:", err);
            // Ignore AbortError which happens if user cancels the share dialog
            if (err.name !== 'AbortError') {
                await navigator.clipboard.writeText(shareText).catch(() => {});
                alert("レシピとリンクをコピーしました");
            }
        }
    };

    const handleAddToCookingList = async () => {
        if (!recipe) return;
        setIsAddingToQueue(true);
        try {
            // Log to DB
            await api.trackCookingHistory(id);
            // Add to Local Storage
            addSession({
                recipeId: id,
                recipeName: recipe.name,
                imageUrl: recipe.images && recipe.images.length > 0 ? recipe.images[0] : undefined
            });
            // Show toast/success
            setAddedToast(true);
            setTimeout(() => setAddedToast(false), 3000);
        } catch (err) {
            console.error("Failed to add to cooking list", err);
            alert("調理リストへの追加に失敗しました");
        } finally {
            setIsAddingToQueue(false);
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
    const yieldData = parseJson(recipe?.recipeYield);

    const handleAddToCart = async () => {
        if (!recipe || !ingredients) return;
        const items = ingredients.map((ing: any) => {
            const parts = [ing.name];
            if (ing.amount) parts.push(ing.amount);
            if (ing.unit) parts.push(ing.unit);
            const baseText = parts.join(" ");
            
            return {
                recipeId: recipe.id,
                recipeName: recipe.name,
                name: baseText,
                baseName: baseText,
                multiplier: 1,
                isChecked: false
            };
        });
        
        try {
            await addMultipleItems(items);
            setCartToast({ show: true, msg: `買い物リストに追加しました` });
            setTimeout(() => setCartToast({ show: false, msg: "" }), 3000);
        } catch (err) {
            console.error("Failed to add to cart", err);
            alert("買い物リストへの追加に失敗しました");
        }
    };

    const handleAddToLists = async () => {
        if (!recipe || (!addShopping && !addCooking)) return;
        
        if (addShopping) {
            await handleAddToCart();
        }
        if (addCooking) {
            await handleAddToCookingList();
        }
        
        setIsDrawerOpen(false);
        setTimeout(() => {
            setAddShopping(true);
            setAddCooking(true);
        }, 300);
    };

    if (loading) return <div className="p-12 text-center animate-pulse text-muted-foreground">Loading recipe details...</div>;
    if (!recipe) return <div className="p-12 text-center text-destructive font-bold">Recipe not found.</div>;

    const parseISOToMinutes = (iso: string) => {
        const match = iso?.match(/PT(\d+)M/);
        return match ? parseInt(match[1]) : 0;
    };

    const prepMin = parseISOToMinutes(recipe.prepTime || "");
    const cookMin = parseISOToMinutes(recipe.cookTime || "");

    const getIngredientsText = () => {
        if (!ingredients) return "";
        return ingredients.map((ing: any) => {
            const parts = [ing.name];
            if (ing.amount) parts.push(ing.amount);
            if (ing.unit) parts.push(ing.unit);
            return `- ${parts.join(" ")}`;
        }).join("\n");
    };

    const getInstructionsText = () => {
        if (!instructions) return "";
        return instructions.map((step: any, idx: number) => `${idx + 1}. ${step.text}`).join("\n");
    };

    const getRecipeMdText = () => {
        const parts = [];
        parts.push(`# ${recipe.name}\n`);
        if (recipe.url) {
            parts.push(`**出典:** ${recipe.url}\n`);
        }
        parts.push(`## 材料\n${getIngredientsText() || "材料なし"}\n`);
        parts.push(`## 作り方\n${getInstructionsText() || "手順なし"}\n`);
        if (recipe.notes) {
            parts.push(`## メモ\n${recipe.notes}\n`);
        }
        return parts.join("\n");
    };

    const handleCopyMD = async () => {
        try {
            await navigator.clipboard.writeText(getRecipeMdText());
            setMdCopied(true);
            setTimeout(() => setMdCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy MD", err);
        }
    };

	return (
		<div className="bg-background min-h-screen pb-48 animate-in fade-in duration-500">
			{/* 1. Header Navigation */}
			<div className="bg-background/80 backdrop-blur-2xl border-b border-border/40 sticky top-0 z-40 transition-all">
				<div className="max-w-3xl mx-auto px-2 h-16 flex justify-between items-center">
					<Button variant="ghost" size="sm" onClick={onBack} className="gap-2 rounded-2xl -ml-2 font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
						<ChevronLeft className="w-5 h-5" />
						<span>戻る</span>
					</Button>
					<div className="flex gap-1.5">
                        <Button variant="ghost" size="icon" onClick={handleCopyMD} className="rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all" title="RecipeMD形式でコピー">
                            {mdCopied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                        </Button>
						<Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={handleTogglePin} 
                            className={cn("rounded-xl transition-all", recipe?.pinned ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5")} 
                            title={recipe?.pinned ? "ピン留めを解除" : "ピン留め"}
                        >
							<Pin className={cn("w-5 h-5", recipe?.pinned ? "fill-current" : "")} />
						</Button>
						<Button variant="ghost" size="icon" onClick={handleShare} className="rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all" title="レシピを共有">
							<Share2 className="w-5 h-5" />
						</Button>
						<Button variant="ghost" size="icon" onClick={() => onEdit(id)} className="rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all" title="編集">
							<Edit className="w-5 h-5" />
						</Button>

					</div>
				</div>
			</div>

			<div className="max-w-3xl mx-auto px-2 py-8 md:py-12 space-y-12 md:space-y-16">
				{/* 2. Title & Status Section */}
				<div className="space-y-6 md:space-y-8">
					<div className="space-y-4">
						<div className="flex flex-wrap items-center gap-2 md:gap-3">
							{(recipe.cookingMode || []).map(mode => (
								<Badge key={mode} variant="outline" className="px-3 md:px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border-2 bg-primary/5 border-primary/40 text-primary flex items-center gap-2">
									{mode === 'MAKE_AHEAD' ? <><CookingPot className="w-3 h-3" /> 作り置き</> : 
									 mode === 'LUNCH' ? <><Sun className="w-3 h-3" /> お昼</> : 
									 <><Moon className="w-3 h-3" /> 晩ごはん</>}
								</Badge>
							))}
							{recipe.tags?.map(t => (
								<Badge key={t} variant="secondary" className="px-3 md:px-4 py-1.5 bg-muted/40 text-muted-foreground/80 rounded-full text-[10px] font-bold tracking-tight border-none">
									#{t}
								</Badge>
							))}
						</div>
						<h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-[1.1] drop-shadow-sm">
							{recipe.name}
						</h1>
					</div>

					{wakeLockEnabled && (
						<div className="inline-flex items-center bg-primary/10 text-primary px-4 md:px-5 py-2 md:py-2.5 rounded-2xl border border-primary/20 gap-2 md:gap-3 shadow-sm animate-in slide-in-from-left-4 duration-500">
							<div className="relative">
								<Sun className="w-4 h-4 md:w-5 md:h-5 fill-primary text-primary animate-spin-slow" />
								<div className="absolute inset-0 bg-primary/20 blur-md rounded-full animate-pulse" />
							</div>
							<span className="text-[10px] md:text-xs font-black uppercase tracking-[0.15em]">料理中スリープ防止 ON</span>
						</div>
					)}
				</div>

				{/* 3. Media Grid */}
				{recipe.images && recipe.images.length > 0 && (
					<>
						<div className={cn(
							"grid gap-4",
							recipe.images.length === 1 ? "grid-cols-1" : recipe.images.length === 2 ? "grid-cols-2" : "grid-cols-3"
						)}>
							{recipe.images.map((key, index) => (
								<div 
									key={key} 
									className="aspect-[16/11] relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border-none bg-muted shadow-lg group cursor-pointer active:scale-95 transition-all duration-500"
									onClick={() => {
										setSelectedIndex(index);
										setIsOpen(true);
									}}
								>
									<img
										src={`/api/images/${key}`}
										alt={recipe.name}
										className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
									/>
									<div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
								</div>
							))}
						</div>

						<Dialog open={isOpen} onOpenChange={setIsOpen}>
							<DialogContent className="max-w-4xl p-2 bg-transparent border-none shadow-none flex flex-col items-center justify-center">
								<Carousel setApi={setCarouselApi} opts={{ startIndex: selectedIndex }} className="w-full max-w-3xl">
									<CarouselContent>
										{recipe.images.map((key) => (
											<CarouselItem key={key} className="flex items-center justify-center">
												<div className="relative group">
													<img
														src={`/api/images/${key}`}
														alt={recipe.name}
														className="w-full h-auto max-h-[75vh] object-contain rounded-[2rem] shadow-2xl"
													/>
												</div>
											</CarouselItem>
										))}
									</CarouselContent>
									{recipe.images.length > 1 && (
										<>
											<div className="hidden md:block">
												<CarouselPrevious className="bg-background/20 backdrop-blur-xl border-white/10 text-white hover:bg-background/40 -left-16" />
												<CarouselNext className="bg-background/20 backdrop-blur-xl border-white/10 text-white hover:bg-background/40 -right-16" />
											</div>
											<div className="mt-4 flex flex-col items-center gap-2">
												<div className="px-4 py-1.5 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl flex items-center gap-3">
													{recipe.images.map((_, i) => (
														<div 
															key={i} 
															className={cn(
																"w-1.5 h-1.5 rounded-full transition-all duration-300",
																current === i + 1 ? "bg-white w-4" : "bg-white/30"
															)}
														/>
													))}
												</div>
												<span className="text-[10px] font-black text-white/50 tracking-[0.2em] uppercase">
													{current} / {recipe.images.length}
												</span>
											</div>
										</>
									)}
								</Carousel>
							</DialogContent>
						</Dialog>
					</>
				)}

				{/* 4. Essential Info Belt */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 p-6 md:p-8 bg-muted/30 rounded-[2.5rem] md:rounded-[3rem] border border-border/40 shadow-inner">
					<div className="space-y-1 md:space-y-2">
						<div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground/60">
							<Clock className="w-3 md:w-4 h-3 md:h-4" />
							<span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">準備</span>
						</div>
						<p className="text-lg md:text-xl font-black">{prepMin > 0 ? `${prepMin} 分` : "--"}</p>
					</div>
					<div className="space-y-1 md:space-y-2 border-l pl-4 md:pl-6 border-border/40">
						<div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground/60">
							<Clock className="w-3 md:w-4 h-3 md:h-4" />
							<span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">調理</span>
						</div>
						<p className="text-lg md:text-xl font-black">{cookMin > 0 ? `${cookMin} 分` : "--"}</p>
					</div>
					{yieldData && (
						<div className="space-y-1 md:space-y-2 border-l pl-4 md:pl-6 border-border/40">
							<div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground/60">
								<Scale className="w-3 md:w-4 h-3 md:h-4" />
								<span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">仕上がり量</span>
							</div>
							<p className="text-lg md:text-xl font-black">
								{yieldData.unit === "L" ? Number(yieldData.value).toFixed(1) : yieldData.value} <span className="text-sm">{yieldData.unit}</span>
							</p>
						</div>
					)}
					{recipe.url && (
						<div className={cn("space-y-1 md:space-y-2 border-l sm:pl-4 md:pl-6 border-border/40 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0", yieldData ? "col-span-1" : "col-span-2")}>
							<div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground/60">
								<ExternalLink className="w-3 md:w-4 h-3 md:h-4" />
								<span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">出典</span>
							</div>
							<a href={recipe.url} target="_blank" rel="noopener noreferrer" className="text-xs md:text-sm font-bold text-primary hover:underline underline-offset-4 truncate block transition-all">
								{new URL(recipe.url).hostname}
							</a>
						</div>
					)}
				</div>

				{/* 5. Main Content Sections */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16">
					{/* Ingredients Column */}
					<div className="lg:col-span-12 xl:col-span-5 space-y-6 md:space-y-8">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
									<Utensils className="w-5 h-5 text-primary" />
								</div>
								<h3 className="text-xl md:text-2xl font-black tracking-tight">材料</h3>
							</div>
							<CopyButton text={getIngredientsText()} label="材料" />
						</div>
						<div className="space-y-1 bg-muted/20 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem]">
							{ingredients?.map((ing: any, idx: number) => (
								<div key={idx} className="flex justify-between items-center py-4 border-b border-dashed border-border/60 last:border-0 last:pb-0">
									<span className="text-base font-bold text-foreground/80">{ing.name}</span>
									<span className="text-base text-muted-foreground font-black tracking-tight">
										{ing.amount} <span className="text-xs">{ing.unit}</span>
									</span>
								</div>
							))}
							{(!ingredients || ingredients.length === 0) && (
								<p className="text-muted-foreground italic text-sm py-4">材料が登録されていません。</p>
							)}
						</div>
					</div>

					{/* Instructions Column */}
					<div className="lg:col-span-12 xl:col-span-7 space-y-8 md:space-y-10">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
									<Tag className="w-5 h-5 text-primary" />
								</div>
								<h3 className="text-xl md:text-2xl font-black tracking-tight">作り方</h3>
							</div>
							<CopyButton text={getInstructionsText()} label="作り方" />
						</div>
						<div className="space-y-10 md:space-y-12">
							{instructions?.map((step: any, idx: number) => (
								<div key={idx} className="relative pl-14 md:pl-16 group">
									<div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-muted group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center font-black text-lg transition-all duration-300 shadow-sm">
										{idx + 1}
									</div>
									<div className="space-y-2 pt-1.5">
										<p className="text-base md:text-lg text-foreground/90 font-medium leading-[1.6]">
											{step.text}
										</p>
									</div>
								</div>
							))}
							{(!instructions || instructions.length === 0) && (
								<p className="text-muted-foreground italic text-lg opacity-60">手順が登録されていません。</p>
							)}
						</div>

						{/* Notes Section */}
						{recipe.notes && (
							<div className="pt-12 md:pt-16 mt-12 md:mt-16 border-t border-border/40">
								<div className="flex items-center justify-between mb-6 md:mb-8">
									<div className="flex items-center gap-3 text-muted-foreground">
										<NotepadText className="w-6 h-6" />
										<h3 className="text-xl md:text-2xl font-black tracking-tight">メモ</h3>
									</div>
									<CopyButton text={recipe.notes || ""} label="メモ" />
								</div>
								<div className="p-6 md:p-8 bg-muted/40 rounded-[2rem] md:rounded-[2.5rem] border-none text-base md:text-lg text-foreground/90 font-medium whitespace-pre-wrap leading-relaxed shadow-inner">
									{recipe.notes}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

            {/* Floating Action Button for Cooking Queue & Shopping Cart */}
            <div className="fixed bottom-24 right-6 md:bottom-24 md:right-8 z-50 flex flex-col items-end gap-3 pointer-events-none">
                {addedToast && (
                    <div className="bg-foreground text-background px-4 py-2 rounded-xl text-sm font-bold shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-300 pointer-events-auto">
                        調理リストに追加しました
                    </div>
                )}
                {cartToast.show && (
                    <div className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-300 pointer-events-auto">
                        {cartToast.msg}
                    </div>
                )}
                
                <div className="flex items-center shadow-2xl shadow-primary/30 rounded-full bg-primary text-primary-foreground overflow-hidden pointer-events-auto">
                    <Button 
                        size="lg" 
                        variant="ghost"
                        onClick={() => setIsDrawerOpen(true)} 
                        disabled={isAddingToQueue}
                        className="h-14 px-8 rounded-none font-black tracking-widest gap-2 hover:bg-primary-foreground/10 text-primary-foreground"
                    >
                        {isAddingToQueue ? (
                            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Plus className="w-5 h-5" />
                        )}
                        <span>追加する</span>
                    </Button>
                </div>
            </div>
            
            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <DrawerContent className="rounded-t-[2.5rem] bg-background/95 backdrop-blur-3xl border-border/40">
                    <div className="max-w-md mx-auto w-full px-6 pt-2 pb-28 sm:pb-8">
                        <div className="mx-auto w-12 h-1.5 rounded-full bg-muted-foreground/20 mb-6" />
                        
                        <div className="text-center space-y-2 mb-6">
                            <h2 className="text-2xl font-black tracking-tighter truncate px-4">{recipe?.name}</h2>
                            <p className="text-sm text-muted-foreground font-bold">どこに追加しますか？</p>
                        </div>
                        
                        <div className="grid gap-4 mb-8">
                            <label className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                                addShopping 
                                    ? "border-primary/20 bg-primary/5 shadow-sm" 
                                    : "border-border/30 bg-background hover:border-border/50"
                            )}>
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                        addShopping ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                                    )}>
                                        <ShoppingCart className="w-5 h-5" />
                                    </div>
                                    <span className={cn("font-bold text-lg transition-colors", addShopping ? "text-foreground" : "text-muted-foreground")}>買い物メモに追加</span>
                                </div>
                                <Checkbox 
                                    checked={addShopping} 
                                    onCheckedChange={(c) => setAddShopping(!!c)} 
                                    className="w-6 h-6 rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                            </label>

                            <label className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                                addCooking 
                                    ? "border-primary/20 bg-primary/5 shadow-sm" 
                                    : "border-border/30 bg-background hover:border-border/50"
                            )}>
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                        addCooking ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                                    )}>
                                        <Flame className="w-5 h-5" />
                                    </div>
                                    <span className={cn("font-bold text-lg transition-colors", addCooking ? "text-foreground" : "text-muted-foreground")}>調理リストに追加</span>
                                </div>
                                <Checkbox 
                                    checked={addCooking} 
                                    onCheckedChange={(c) => setAddCooking(!!c)} 
                                    className="w-6 h-6 rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                            </label>
                        </div>

                        <div className="grid gap-3">
                            <Button 
                                size="lg" 
                                disabled={!addShopping && !addCooking}
                                onClick={handleAddToLists}
                                className="h-14 rounded-2xl font-bold text-lg bg-primary text-primary-foreground shadow-xl shadow-primary/20"
                            >
                                追加する
                            </Button>

                            <Button 
                                variant="ghost" 
                                size="lg" 
                                onClick={() => setIsDrawerOpen(false)}
                                className="h-14 rounded-2xl font-bold hover:bg-muted text-lg text-muted-foreground"
                            >
                                キャンセル
                            </Button>
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>
		</div>
	);
}
