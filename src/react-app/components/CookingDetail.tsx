import { useEffect, useState } from "react";
import { useCookingStore } from "../store/useCookingStore";
import { api } from "../api";
import { Recipe } from "../types/schema.org";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CheckCircle2, Circle, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

export function CookingDetail({ sessionId, onBack }: { sessionId: string, onBack: () => void }) {
    const { activeSessions, removeSession, toggleIngredient, toggleInstruction } = useCookingStore();
    const session = activeSessions.find(s => s.id === sessionId);
    
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [showConfetti, setShowConfetti] = useState(false);

    // Wake Lock
    useEffect(() => {
        let wl: any = null;
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wl = await (navigator as any).wakeLock.request('screen');
                }
            } catch (err) {
                console.error('Wake Lock request failed:', err);
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
        if (!session) {
            onBack();
            return;
        }
        api.getRecipe(session.recipeId)
            .then(setRecipe)
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [session, onBack]);

    const handleFinish = () => {
        setShowConfetti(true);
        setTimeout(() => {
            removeSession(sessionId);
            onBack();
        }, 1500);
    };

    if (!session) return null;
    if (loading) return <div className="p-12 text-center animate-pulse text-muted-foreground">Loading recipe data...</div>;
    if (!recipe) return <div className="p-12 text-center text-destructive font-bold">Failed to load recipe.</div>;

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

    const ingredients = parseJson(recipe.recipeIngredient) || [];
    const instructions = parseJson(recipe.recipeInstructions) || [];

    const allChecked = 
        (ingredients.length === 0 || ingredients.every((ing: any) => session.checkedIngredients.includes(ing.name))) &&
        (instructions.length === 0 || instructions.every((_: any, idx: number) => session.checkedInstructions.includes(idx)));

    return (
        <div className="bg-background min-h-screen pb-32 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-background/80 backdrop-blur-2xl border-b border-border/40 sticky top-0 z-40 transition-all">
                <div className="max-w-3xl mx-auto px-4 h-16 flex justify-between items-center">
                    <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 rounded-2xl -ml-2 font-bold text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="w-5 h-5" />
                        <span>中断して戻る</span>
                    </Button>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-8 space-y-12">
                <div className="space-y-4">
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-primary">
                        {recipe.name}
                    </h1>
                    <div className="inline-flex items-center bg-accent/10 text-accent-foreground px-4 py-2 rounded-2xl border border-accent/20 gap-2 shadow-sm font-black text-sm tracking-widest uppercase">
                        TODO モード
                    </div>
                </div>

                {/* Ingredients TODO */}
                <div className="space-y-6">
                    <h3 className="text-2xl font-black tracking-tight border-b pb-2">材料の準備</h3>
                    <div className="grid gap-3">
                        {ingredients.map((ing: any, idx: number) => {
                            const isChecked = session.checkedIngredients.includes(ing.name);
                            return (
                                <div 
                                    key={idx}
                                    onClick={() => toggleIngredient(sessionId, ing.name)}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-3xl border transition-all cursor-pointer active:scale-[0.98] select-none",
                                        isChecked 
                                            ? "bg-muted/50 border-transparent opacity-60" 
                                            : "bg-card border-border/60 hover:border-primary/40 shadow-sm"
                                    )}
                                >
                                    {isChecked ? (
                                        <CheckCircle2 className="w-8 h-8 text-primary flex-shrink-0" />
                                    ) : (
                                        <Circle className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <div className="flex-1 flex justify-between items-center text-lg">
                                        <span className={cn("font-bold", isChecked && "line-through")}>{ing.name}</span>
                                        <span className="font-black text-muted-foreground text-base tracking-tight">
                                            {ing.amount} <span className="text-xs">{ing.unit}</span>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Instructions TODO */}
                <div className="space-y-6">
                    <h3 className="text-2xl font-black tracking-tight border-b pb-2 mt-8">調理の手順</h3>
                    <div className="grid gap-4">
                        {instructions.map((step: any, idx: number) => {
                            const isChecked = session.checkedInstructions.includes(idx);
                            return (
                                <div 
                                    key={idx}
                                    onClick={() => toggleInstruction(sessionId, idx)}
                                    className={cn(
                                        "flex items-start gap-4 p-5 md:p-6 rounded-3xl border transition-all cursor-pointer active:scale-[0.98] select-none",
                                        isChecked 
                                            ? "bg-muted/50 border-transparent opacity-60" 
                                            : "bg-card border-border/60 hover:border-primary/40 shadow-sm"
                                    )}
                                >
                                    {isChecked ? (
                                        <CheckCircle2 className="w-8 h-8 text-primary flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full border-2 border-muted-foreground flex items-center justify-center font-black text-sm text-muted-foreground flex-shrink-0 mt-0.5">
                                            {idx + 1}
                                        </div>
                                    )}
                                    <div className="flex-1 pt-1">
                                        <p className={cn("text-lg font-medium leading-[1.6]", isChecked && "line-through text-muted-foreground")}>
                                            {step.text}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-background/90 backdrop-blur-3xl border-t border-border/40 pb-safe">
                <div className="max-w-3xl mx-auto flex justify-end">
                    <Button 
                        size="lg" 
                        onClick={handleFinish} 
                        className={cn(
                            "h-16 px-8 rounded-full font-black tracking-widest text-lg shadow-2xl transition-all gap-2",
                            allChecked 
                                ? "bg-green-500 hover:bg-green-600 text-white shadow-green-500/25 animate-pulse" 
                                : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25"
                        )}
                    >
                        {showConfetti && <PartyPopper className="w-6 h-6 animate-bounce" />}
                        {!showConfetti && <CheckCircle2 className="w-6 h-6" />}
                        <span>{allChecked ? "調理コンプリート！" : "調理を終了する"}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
