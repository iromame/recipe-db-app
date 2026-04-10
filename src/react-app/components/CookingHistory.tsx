import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../api";
import { ChefHat, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

interface HistoryEntry {
    id: string;
    recipeId: string;
    recipeName: string;
    createdAt: string;
}

interface MonthGroup {
    key: string;       // "2025-05"
    label: string;     // "2025年5月"
    shortLabel: string; // "5月" (same year) or "2025/5" (different year)
    entries: DayGroup[];
    totalCount: number;
}

interface DayGroup {
    dateLabel: string; // "5月12日（月）"
    entries: HistoryEntry[];
}

function buildMonthGroups(entries: HistoryEntry[]): MonthGroup[] {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Group by month key
    const monthMap = new Map<string, HistoryEntry[]>();
    for (const entry of entries) {
        const d = new Date(entry.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!monthMap.has(key)) monthMap.set(key, []);
        monthMap.get(key)!.push(entry);
    }

    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

    return Array.from(monthMap.entries()).map(([key, monthEntries]) => {
        const [year, month] = key.split("-").map(Number);

        // Group day entries within the month
        const dayMap = new Map<string, HistoryEntry[]>();
        for (const entry of monthEntries) {
            const d = new Date(entry.createdAt);
            const dayKey = `${d.getMonth() + 1}月${d.getDate()}日（${weekDays[d.getDay()]}）`;
            if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
            dayMap.get(dayKey)!.push(entry);
        }

        const dayGroups: DayGroup[] = Array.from(dayMap.entries()).map(([dateLabel, dayEntries]) => ({
            dateLabel,
            entries: dayEntries,
        }));

        return {
            key,
            label: `${year}年${month}月`,
            shortLabel: year === currentYear ? `${month}月` : `${year}/${month}`,
            entries: dayGroups,
            totalCount: monthEntries.length,
        };
    });
}

export function CookingHistory({ onSelectRecipe }: { onSelectRecipe: (id: string) => void }) {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeMonthKey, setActiveMonthKey] = useState<string>("");

    const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const pillsRef = useRef<HTMLDivElement>(null);
    const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    useEffect(() => {
        api.getCookingHistory()
            .then((data) => {
                setHistory(data);
                if (data.length > 0) {
                    const first = new Date(data[0].createdAt);
                    const key = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}`;
                    setActiveMonthKey(key);
                }
            })
            .catch((err) => {
                console.error(err);
                setError("履歴の読み込みに失敗しました");
            })
            .finally(() => setLoading(false));
    }, []);

    // IntersectionObserver: update active pill as user scrolls
    const observerRef = useRef<IntersectionObserver | null>(null);
    const setupObserver = useCallback(() => {
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver(
            (entries) => {
                // Find the topmost section that's intersecting
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

                if (visible.length > 0) {
                    const key = (visible[0].target as HTMLDivElement).dataset.monthKey;
                    if (key) setActiveMonthKey(key);
                }
            },
            { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
        );

        sectionRefs.current.forEach((el) => {
            if (el) observerRef.current?.observe(el);
        });
    }, []);

    useEffect(() => {
        if (history.length > 0) {
            // Small delay to ensure refs are populated after render
            const t = setTimeout(setupObserver, 100);
            return () => clearTimeout(t);
        }
    }, [history, setupObserver]);

    // Sync active pill into view horizontally
    useEffect(() => {
        const pill = pillRefs.current.get(activeMonthKey);
        const container = pillsRef.current;
        if (pill && container) {
            const pillLeft = pill.offsetLeft;
            const pillWidth = pill.offsetWidth;
            const containerWidth = container.offsetWidth;
            const scrollTarget = pillLeft - containerWidth / 2 + pillWidth / 2;
            container.scrollTo({ left: scrollTarget, behavior: "smooth" });
        }
    }, [activeMonthKey]);

    const scrollToMonth = (key: string) => {
        const section = sectionRefs.current.get(key);
        if (section) {
            section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
                <ChefHat className="w-10 h-10 opacity-40" />
                <span className="font-bold text-sm">読み込み中...</span>
            </div>
        );
    }

    if (error) {
        return <div className="py-20 text-center text-destructive font-bold">{error}</div>;
    }

    if (history.length === 0) {
        return (
            <div className="py-20 flex flex-col items-center gap-4 text-muted-foreground">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                    <ChefHat className="w-10 h-10 opacity-40" />
                </div>
                <p className="font-bold text-sm">まだ調理が記録されていません</p>
                <p className="text-xs text-muted-foreground/60 text-center max-w-[200px]">
                    レシピ詳細の「調理する」ボタンで記録が始まります
                </p>
            </div>
        );
    }

    const monthGroups = buildMonthGroups(history);
    const activeGroup = monthGroups.find((g) => g.key === activeMonthKey);

    return (
        <div className="space-y-0">
            {/* ── Month Selector (sticky) ── */}
            <div className="sticky top-[4rem] z-30 -mx-2 px-2 py-3 bg-background/95 backdrop-blur-xl border-b border-border/30">
                {/* Active month headline */}
                <div className="flex items-baseline gap-2 mb-3 px-1">
                    <span className="text-xl font-black tracking-tight">
                        {activeGroup?.label ?? ""}
                    </span>
                    {activeGroup && (
                        <span className="text-sm font-bold text-muted-foreground/60">
                            {activeGroup.totalCount}回調理
                        </span>
                    )}
                </div>

                {/* Horizontal scrollable pills */}
                <div className="relative">
                    {/* Left fade */}
                    <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-background/95 to-transparent z-10" />
                    {/* Right fade */}
                    <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-background/95 to-transparent z-10" />

                    <div
                        ref={pillsRef}
                        className="flex gap-2 overflow-x-auto scrollbar-none px-1 scroll-smooth"
                        style={{ scrollbarWidth: "none" }}
                    >
                        {monthGroups.map((group) => {
                            const isActive = group.key === activeMonthKey;
                            return (
                                <button
                                    key={group.key}
                                    ref={(el) => {
                                        if (el) pillRefs.current.set(group.key, el);
                                        else pillRefs.current.delete(group.key);
                                    }}
                                    onClick={() => scrollToMonth(group.key)}
                                    className={`
                                        flex-shrink-0 flex flex-col items-center px-4 py-2 rounded-2xl
                                        border text-xs font-black transition-all duration-200
                                        ${isActive
                                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105"
                                            : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/70"
                                        }
                                    `}
                                >
                                    <span>{group.shortLabel}</span>
                                    <span className={`text-[9px] font-bold mt-0.5 ${isActive ? "text-primary-foreground/70" : "text-muted-foreground/50"}`}>
                                        {group.totalCount}回
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Timeline ── */}
            <div className="space-y-10 pt-6">
                {monthGroups.map((monthGroup) => (
                    <div
                        key={monthGroup.key}
                        data-month-key={monthGroup.key}
                        ref={(el) => {
                            if (el) sectionRefs.current.set(monthGroup.key, el);
                            else sectionRefs.current.delete(monthGroup.key);
                        }}
                        className="space-y-6 scroll-mt-40"
                    >
                        {/* Month Section Header */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-6 rounded-full bg-primary/70" />
                                <h2 className="text-lg font-black tracking-tight">{monthGroup.label}</h2>
                            </div>
                            <div className="flex-1 h-px bg-border/40" />
                            <span className="text-xs font-bold text-muted-foreground/50 tabular-nums">
                                {monthGroup.totalCount}回
                            </span>
                        </div>

                        {/* Day Groups */}
                        <div className="space-y-6">
                            {monthGroup.entries.map((dayGroup) => (
                                <div key={dayGroup.dateLabel} className="space-y-2">
                                    {/* Day Header */}
                                    <div className="flex items-center gap-2 px-1">
                                        <span className="text-[11px] font-black text-muted-foreground/50 tracking-wide">
                                            {dayGroup.dateLabel}
                                        </span>
                                        <div className="flex-1 h-px bg-border/30 border-dashed border" />
                                    </div>

                                    {/* Entry Cards */}
                                    <div className="space-y-2">
                                        {dayGroup.entries.map((entry) => {
                                            const time = new Date(entry.createdAt).toLocaleTimeString("ja-JP", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            });
                                            return (
                                                <button
                                                    key={entry.id}
                                                    onClick={() => onSelectRecipe(entry.recipeId)}
                                                    className="w-full flex items-center gap-4 p-4 bg-card hover:bg-muted/30 active:scale-[0.98] border border-border/50 rounded-2xl transition-all duration-200 group text-left shadow-sm"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                                        <ChefHat className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-base truncate text-foreground">
                                                            {entry.recipeName}
                                                        </p>
                                                        <p className="text-[11px] font-bold text-muted-foreground/50 font-mono mt-0.5">
                                                            {time}
                                                        </p>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Footer */}
                <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground/30">
                    <ChevronLeft className="w-3 h-3" />
                    <span className="text-[10px] font-black tracking-widest uppercase">
                        {history.length}件の記録
                    </span>
                    <ChevronRight className="w-3 h-3" />
                </div>
            </div>
        </div>
    );
}
