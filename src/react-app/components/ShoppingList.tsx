import { useEffect, useState, useRef } from "react";
import { useShoppingListStore, ShoppingListItem } from "../store/useShoppingListStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, List, Layers, X, Copy, ChevronDown, AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const applyMultiplier = (text: string, multiplier: number): string => {
    if (multiplier === 1) return text;
    return text.replace(/[0-9０-９]+(?:\.[0-9０-９]+)?/g, (match) => {
        const halfWidthMatch = match.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
        const num = parseFloat(halfWidthMatch);
        if (isNaN(num)) return match;
        
        const newNum = num * multiplier;
        const resultStr = Number.isInteger(newNum) ? newNum.toString() : newNum.toFixed(1).replace(/\.0$/, '');
        
        if (/^[０-９]/.test(match)) {
            return resultStr.replace(/[0-9]/g, (s) => String.fromCharCode(s.charCodeAt(0) + 0xFEE0));
        }
        return resultStr;
    });
};

function EditableItem({ item }: { item: ShoppingListItem }) {
    const { updateItem } = useShoppingListStore();
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(item.baseName || item.name);
    const inputRef = useRef<HTMLInputElement>(null);

    
    const handleSave = () => {
        if (editValue.trim() && editValue !== item.baseName) {
            updateItem(item.id, { 
                baseName: editValue,
                name: applyMultiplier(editValue, item.multiplier || 1)
            });
        } else {
            setEditValue(item.baseName || item.name);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setEditValue(item.baseName || item.name);
            setIsEditing(false);
        }
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    return (
        <div className="flex items-center gap-3 py-3 px-1 border-b border-border/40 last:border-0 group bg-background relative z-10">
            <Checkbox 
                    checked={item.isChecked}
                    onCheckedChange={(checked: boolean) => updateItem(item.id, { isChecked: checked === true })}
                    className="w-6 h-6 rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                />
                {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                        <Input 
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleSave}
                            onKeyDown={handleKeyDown}
                            className="h-8 text-base border-primary/50 focus-visible:ring-primary/30"
                        />
                    </div>
                ) : (
                    <div 
                        className={cn(
                            "flex-1 text-base font-medium transition-all cursor-text py-1 select-none",
                            item.isChecked ? "text-muted-foreground line-through opacity-60" : "text-foreground"
                        )}
                        onClick={() => setIsEditing(true)}
                    >
                        {item.name}
                    </div>
                )}
            </div>
    );
}

export function ShoppingList() {
    const { 
        items, loading, fetchItems, addItem, bulkUpdateItems,
        deleteRecipeItems, deleteAllItems
    } = useShoppingListStore();
    
    const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
    const [newItemName, setNewItemName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copiedToast, setCopiedToast] = useState(false);
    const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

    useEffect(() => {
        fetchItems();
    }, []);

    const handleManualAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim() || isSubmitting) return;
        setIsSubmitting(true);
        await addItem({ name: newItemName, baseName: newItemName, multiplier: 1 });
        setNewItemName("");
        setIsSubmitting(false);
    };

    const handleMultiplierChange = async (newMultiplier: number, groupItems: ShoppingListItem[]) => {
        const updatedItems = groupItems.map(item => ({
            id: item.id,
            multiplier: newMultiplier,
            name: applyMultiplier(item.baseName || item.name, newMultiplier)
        }));
        await bulkUpdateItems(updatedItems);
    };

    const handleCopyAll = () => {
        const text = items.filter(i => !i.isChecked).map(i => i.name).join('\n');
        navigator.clipboard.writeText(text);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2000);
    };

    const groupedItems = items.reduce((acc, item) => {
        const key = item.recipeId || "manual";
        if (!acc[key]) {
            acc[key] = {
                recipeName: item.recipeName || "その他（手動追加）",
                items: [],
                multiplier: item.multiplier || 1
            };
        }
        acc[key].items.push(item);
        // Take the multiplier of the first item as the group multiplier (they should all be the same)
        acc[key].multiplier = acc[key].items[0].multiplier || 1;
        return acc;
    }, {} as Record<string, { recipeName: string, items: ShoppingListItem[], multiplier: number }>);

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter">買い物メモ</h1>
            </div>

            {/* View Toggle & Actions */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                <div className="flex bg-muted p-1 rounded-xl">
                    <Button 
                        variant={viewMode === "grouped" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grouped")}
                        className={cn("rounded-lg gap-2", viewMode === "grouped" ? "shadow-sm" : "")}
                    >
                        <Layers className="w-4 h-4" /> レシピ別
                    </Button>
                    <Button 
                        variant={viewMode === "flat" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("flat")}
                        className={cn("rounded-lg gap-2", viewMode === "flat" ? "shadow-sm" : "")}
                    >
                        <List className="w-4 h-4" /> すべて
                    </Button>
                </div>
                
                {items.length > 0 && (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowDeleteAllConfirm(true)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 gap-2 font-bold"
                    >
                        <Trash2 className="w-4 h-4" />
                        すべて削除
                    </Button>
                )}
            </div>

            {/* Manual Add Input */}
            <form onSubmit={handleManualAdd} className="flex gap-2">
                <Input 
                    placeholder="手動で追加 (例: 牛乳 1本)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="h-12 rounded-2xl bg-muted/50 border-none focus-visible:ring-primary/20 text-base"
                />
                <Button 
                    type="submit" 
                    disabled={!newItemName.trim() || isSubmitting}
                    className="h-12 rounded-2xl px-6 bg-primary text-primary-foreground font-bold shadow-xl shadow-primary/20"
                >
                    <Plus className="w-5 h-5 mr-1" /> 追加
                </Button>
            </form>

            {/* List */}
            <div className="space-y-8">
                {loading && items.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground animate-pulse">Loading...</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16 bg-muted/20 rounded-[2.5rem] border border-dashed border-border/60">
                        <p className="text-muted-foreground font-bold">買い物メモは空です。</p>
                        <p className="text-sm text-muted-foreground/60 mt-1">レシピ詳細画面のカートボタンから材料を追加できます。</p>
                    </div>
                ) : (
                    <>
                        {viewMode === "grouped" ? (
                            Object.entries(groupedItems).map(([recipeId, group]) => (
                                <div key={recipeId} className="bg-background border border-border/40 rounded-[2rem] overflow-hidden shadow-sm">
                                    <div className="bg-muted/30 px-5 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-border/40">
                                        <h3 className="font-black text-lg tracking-tight truncate pr-4">{group.recipeName}</h3>
                                        {recipeId !== "manual" && (
                                            <div className="flex items-center gap-2 self-end md:self-auto">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-8 rounded-xl font-bold gap-1 bg-background">
                                                            {group.multiplier}倍量 <ChevronDown className="w-3 h-3" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-2xl w-32">
                                                        {[1, 1.5, 2, 3, 4, 5].map(m => (
                                                            <DropdownMenuItem 
                                                                key={m} 
                                                                onClick={() => handleMultiplierChange(m, group.items)}
                                                                className={cn("font-bold cursor-pointer rounded-xl", group.multiplier === m && "bg-muted text-primary")}
                                                            >
                                                                {m}倍量
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>

                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => setRecipeToDelete(recipeId)}
                                                    className="h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 gap-1 rounded-xl"
                                                >
                                                    <X className="w-4 h-4" /> 削除
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-6 py-2">
                                        {group.items.map(item => (
                                            <EditableItem key={item.id} item={item} />
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-background border border-border/40 rounded-[2rem] px-6 py-2 shadow-sm">
                                {items.map(item => (
                                    <EditableItem key={item.id} item={item} />
                                ))}
                            </div>
                        )}
                        
                        <div className="flex justify-center mt-8">
                            <Button
                                size="lg"
                                onClick={handleCopyAll}
                                className="h-14 px-8 rounded-full shadow-xl shadow-secondary/20 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-black tracking-widest gap-2"
                            >
                                <Copy className="w-5 h-5" />
                                <span>すべてコピー</span>
                            </Button>
                        </div>
                    </>
                )}
            </div>
            
            <AlertDialog open={recipeToDelete !== null} onOpenChange={(open) => !open && setRecipeToDelete(null)}>
                <AlertDialogContent className="rounded-[2rem] border-none bg-background/95 backdrop-blur-3xl shadow-2xl">
                    <AlertDialogHeader className="space-y-4">
                        <AlertDialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6 text-destructive" />
                            本当に削除しますか？
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground font-bold">
                            このレシピの買い物メモをすべて削除します。この操作は取り消せません。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8 gap-3">
                        <AlertDialogCancel className="h-14 rounded-full font-black tracking-widest border-border/40 hover:bg-muted">
                            キャンセル
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (recipeToDelete) {
                                    deleteRecipeItems(recipeToDelete);
                                    setRecipeToDelete(null);
                                }
                            }}
                            className="h-14 rounded-full font-black tracking-widest bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            削除する
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
                <AlertDialogContent className="rounded-[2rem] border-none bg-background/95 backdrop-blur-3xl shadow-2xl">
                    <AlertDialogHeader className="space-y-4">
                        <AlertDialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6 text-destructive" />
                            すべてのメモを削除しますか？
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground font-bold">
                            買い物メモにあるすべてのアイテムを削除します。この操作は取り消せません。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8 gap-3">
                        <AlertDialogCancel className="h-14 rounded-full font-black tracking-widest border-border/40 hover:bg-muted">
                            キャンセル
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                deleteAllItems();
                                setShowDeleteAllConfirm(false);
                            }}
                            className="h-14 rounded-full font-black tracking-widest bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            すべて削除する
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Floating Toast for Copy */}
            <div className={cn(
                "fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none",
                copiedToast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}>
                <div className="bg-foreground text-background px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl">
                    未チェックの材料をコピーしました
                </div>
            </div>
        </div>
    );
}
