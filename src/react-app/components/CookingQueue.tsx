import { useCookingStore } from "../store/useCookingStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Flame, X } from "lucide-react";

export function CookingQueue({ onBack, onSelectSession }: { onBack: () => void, onSelectSession: (id: string) => void }) {
    const { activeSessions, removeSession } = useCookingStore();

    return (
        <div className="bg-background min-h-screen pb-32 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-background/80 backdrop-blur-2xl border-b border-border/40 sticky top-0 z-40 transition-all">
                <div className="max-w-3xl mx-auto px-2 h-16 flex justify-between items-center">
                    <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 rounded-2xl -ml-2 font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                        <ChevronLeft className="w-5 h-5" />
                        <span>戻る</span>
                    </Button>
                    <h2 className="font-black tracking-tight text-lg flex items-center gap-2">
                        <Flame className="w-5 h-5 text-primary" />
                        <span>調理リスト</span>
                    </h2>
                    <div className="w-16" /> {/* Spacer for centering */}
                </div>
            </div>

            <div className="max-w-xl mx-auto px-2 py-8 space-y-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tighter">今日の献立キュー</h1>
                    <p className="text-muted-foreground font-medium">現在ストックされている調理予定です。</p>
                </div>

                {activeSessions.length === 0 ? (
                    <div className="text-center py-20 px-6 bg-muted/30 rounded-[2.5rem] border border-border/40 border-dashed">
                        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Flame className="w-8 h-8 text-primary opacity-80" />
                        </div>
                        <h3 className="text-lg font-black mb-2">リストは空です</h3>
                        <p className="text-muted-foreground text-sm">
                            レシピ詳細画面の「＋調理リストに追加」ボタンから追加してください。
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeSessions.map((session) => (
                            <div 
                                key={session.id} 
                                className="group relative bg-card hover:bg-muted/30 border border-border/60 p-4 rounded-[1.5rem] flex items-center gap-4 transition-all pr-14 cursor-pointer shadow-sm hover:shadow-md"
                                onClick={() => onSelectSession(session.id)}
                            >
                                {session.imageUrl ? (
                                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                                        <img src={`/api/images/${session.imageUrl}`} alt={session.recipeName} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-primary/10 flex items-center justify-center">
                                        <Flame className="w-6 h-6 text-primary/50" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-lg truncate pr-2">{session.recipeName}</h3>
                                    <p className="text-xs text-muted-foreground font-bold font-mono">
                                        Added: {new Date(session.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute right-4 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm("この項目をリストから削除しますか？")) {
                                            removeSession(session.id);
                                        }
                                    }}
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
