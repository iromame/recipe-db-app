import { ChefHat, Download } from "lucide-react";
import { CookingHistory } from "./CookingHistory";
import { useState } from "react";

type MoreSection = "history" | null;

export function MoreMenu({ onSelectRecipe }: { onSelectRecipe: (id: string) => void }) {
    const [section, setSection] = useState<MoreSection>("history");

    return (
        <div className="bg-background min-h-screen pb-32 animate-in fade-in duration-500">
            <div className="max-w-3xl mx-auto px-2 pt-6 pb-32 space-y-6">

                {/* Page Title */}
                <div className="space-y-1 px-1">
                    <h1 className="text-3xl font-black tracking-tighter">その他</h1>
                    <p className="text-sm text-muted-foreground font-medium">履歴・データ管理</p>
                </div>

                {/* Section Tabs */}
                <div className="flex gap-2 bg-muted/40 p-1.5 rounded-2xl border border-border/40">
                    <button
                        onClick={() => setSection("history")}
                        className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-black tracking-wide transition-all ${
                            section === "history"
                                ? "bg-background text-foreground shadow-sm border border-border/40"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <ChefHat className="w-4 h-4" />
                        調理履歴
                    </button>
                    <a
                        href="/api/export"
                        download="recipes-export.json"
                        className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-black tracking-wide text-muted-foreground hover:text-foreground transition-all"
                    >
                        <Download className="w-4 h-4" />
                        エクスポート
                    </a>
                </div>

                {/* Section Content */}
                {section === "history" && (
                    <CookingHistory onSelectRecipe={onSelectRecipe} />
                )}
            </div>
        </div>
    );
}

