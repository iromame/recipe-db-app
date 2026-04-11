import { useState, useEffect, useRef } from "react";
import { RecipeList } from "./components/RecipeList";
import { RecipeDetail } from "./components/RecipeDetail";
import { RecipeForm } from "./components/RecipeForm";
import { CookingQueue } from "./components/CookingQueue";
import { CookingDetail } from "./components/CookingDetail";
import { MoreMenu } from "./components/MoreMenu";
import { useCookingStore } from "./store/useCookingStore";
import { Utensils, BookOpen, MoreHorizontal, Check } from "lucide-react";
import { Recipe } from "./types/schema.org";
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
import "./App.css";

type ViewState = "list" | "detail" | "form" | "cookingQueue" | "cookingDetail" | "more";

function App() {
	const [view, setView] = useState<ViewState>(() => {
		const params = new URLSearchParams(window.location.search);
		return params.get("id") ? "detail" : "list";
	});
	const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(() => {
		const params = new URLSearchParams(window.location.search);
		return params.get("id");
	});
	const [importData, setImportData] = useState<Partial<Recipe> | null>(null);
	const [isFormDirty, setIsFormDirty] = useState(false);
	const [showDiscardDialog, setShowDiscardDialog] = useState(false);
	const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const { activeSessions } = useCookingStore();
	const currentUrlRef = useRef(window.location.href);

	useEffect(() => {
		const processNavigation = () => {
			const params = new URLSearchParams(window.location.search);
			const id = params.get("id");
            const viewParam = params.get("view");
            const sessionId = params.get("sessionId");

            if (viewParam === "cookingQueue") {
                setView("cookingQueue");
            } else if (viewParam === "cookingDetail" && sessionId) {
                setCurrentRecipeId(sessionId); // using currentRecipeId as sessionId in this mode
                setView("cookingDetail");
            } else if (viewParam === "more") {
                setView("more");
            } else if (id) {
				setCurrentRecipeId(id);
				setImportData(null);
				setView("detail");
			} else {
				setCurrentRecipeId(null);
				setImportData(null);
				setView("list");
			}
			currentUrlRef.current = window.location.href;
		};

		const handlePopState = () => {
			if (isFormDirty) {
				// Revert URL to where we were (on the form)
				const targetUrl = window.location.href;
				window.history.pushState(null, "", currentUrlRef.current);
				
				setPendingAction(() => () => {
					// After confirmation, go to the target URL
					window.history.replaceState(null, "", targetUrl);
					processNavigation();
				});
				setShowDiscardDialog(true);
				return;
			}
			processNavigation();
		};
		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [isFormDirty]);

	const handleSafeNavigation = (action: () => void, force = false) => {
		if (isFormDirty && !force) {
			setPendingAction(() => action);
			setShowDiscardDialog(true);
		} else {
			action();
		}
	};

	const showToast = (message: string, type: "success" | "error" = "success") => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 3000);
	};

	const goToList = (force = false) => {
		handleSafeNavigation(() => {
			if (window.location.search !== "") {
				window.history.pushState({}, "", window.location.pathname);
			}
			setCurrentRecipeId(null);
			setImportData(null);
			setIsFormDirty(false);
			setView("list");
			currentUrlRef.current = window.location.href;
		}, force);
	};

	const goToDetail = (id: string, force = false) => {
		handleSafeNavigation(() => {
			const newUrl = `${window.location.pathname}?id=${id}`;
			if (window.location.search !== `?id=${id}`) {
				window.history.pushState({}, "", newUrl);
			}
			setCurrentRecipeId(id);
			setImportData(null);
			setIsFormDirty(false);
			setView("detail");
			currentUrlRef.current = window.location.href;
		}, force);
	};

	const goToForm = (id?: string) => {
		// Navigation to form doesn't need force usually, but let's keep it consistent
		handleSafeNavigation(() => {
			setCurrentRecipeId(id || null);
			setImportData(null);
			setIsFormDirty(false);
			setView("form");
			currentUrlRef.current = window.location.href;
		});
	};

	const goToFormWithData = (data: Partial<Recipe>) => {
		handleSafeNavigation(() => {
			setCurrentRecipeId(null);
			setImportData(data);
			setIsFormDirty(false);
			setView("form");
			currentUrlRef.current = window.location.href;
		});
	};

    const goToCookingQueue = () => {
		handleSafeNavigation(() => {
			const newUrl = `${window.location.pathname}?view=cookingQueue`;
			if (window.location.search !== `?view=cookingQueue`) {
				window.history.pushState({}, "", newUrl);
			}
			setCurrentRecipeId(null);
			setIsFormDirty(false);
			setView("cookingQueue");
			currentUrlRef.current = window.location.href;
		});
	};

	const goToCookingDetail = (sessionId: string) => {
		handleSafeNavigation(() => {
			const newUrl = `${window.location.pathname}?view=cookingDetail&sessionId=${sessionId}`;
			if (window.location.search !== `?view=cookingDetail&sessionId=${sessionId}`) {
				window.history.pushState({}, "", newUrl);
			}
			setCurrentRecipeId(sessionId); // Track session ID here
			setIsFormDirty(false);
			setView("cookingDetail");
			currentUrlRef.current = window.location.href;
		});
	};

	const goToMore = () => {
		handleSafeNavigation(() => {
			const newUrl = `${window.location.pathname}?view=more`;
			if (window.location.search !== `?view=more`) {
				window.history.pushState({}, "", newUrl);
			}
			setCurrentRecipeId(null);
			setIsFormDirty(false);
			setView("more");
			currentUrlRef.current = window.location.href;
		});
	};

	return (
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10">
			<header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border/40">
				<div className="max-w-4xl mx-auto px-2 h-16 flex items-center justify-between">
					<div className="flex flex-col">
						<h1
							className="text-2xl font-black text-primary tracking-tighter cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
							onClick={() => goToList()}
						>
							<div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
								<span className="text-primary-foreground text-lg leading-none">M</span>
							</div>
							Mame
						</h1>
					</div>
					<div className="flex items-center gap-3">
						<p className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
							Recipe Database
						</p>
					</div>
				</div>
			</header>

			<main className="max-w-4xl mx-auto px-2 py-8 md:py-12 pb-24 md:pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
				{view === "list" && (
					<RecipeList
						onSelectRecipe={goToDetail}
						onCreateNew={() => goToForm()}
						onImportSuccess={goToFormWithData}
					/>
				)}
				{view === "detail" && currentRecipeId && (
					<RecipeDetail
						id={currentRecipeId}
						onBack={() => goToList()}
						onEdit={goToForm}
						onDelete={() => goToList(true)}
					/>
				)}
				{view === "form" && (
					<RecipeForm
						id={currentRecipeId || undefined}
						initialData={importData}
						onSave={(_recipe) => {
							// Using true to bypass the dirty check during save
							if (_recipe.id) {
								showToast("レシピを保存しました");
								goToDetail(_recipe.id, true);
							} else {
								goToList(true);
							}
						}}
						onCancel={() => {
							if (view === "form" && currentRecipeId) {
								goToDetail(currentRecipeId);
							} else {
								goToList();
							}
						}}
						onDirtyStateChange={setIsFormDirty}
					/>
				)}
                {view === "cookingQueue" && (
                    <CookingQueue
                        onBack={() => goToList()}
                        onSelectSession={goToCookingDetail}
                    />
                )}
                {view === "cookingDetail" && currentRecipeId && (
                    <CookingDetail
                        sessionId={currentRecipeId}
                        onBack={() => goToCookingQueue()}
                    />
                )}
                {view === "more" && (
                    <MoreMenu
                        onSelectRecipe={goToDetail}
                    />
                )}
			</main>

			{/* Bottom Navigation */}
			{(view === "list" || view === "detail" || view === "cookingQueue" || view === "cookingDetail" || view === "more") && (
				<div className="fixed bottom-0 left-0 right-0 z-[100] bg-background/90 backdrop-blur-xl border-t border-border/40 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
					<div className="max-w-4xl mx-auto flex h-16">
						{/* レシピ */}
						<button
							onClick={() => goToList()}
							className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
								view === "list" || view === "detail" ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/50"
							}`}
						>
							<BookOpen className="w-5 h-5 transition-transform active:scale-90" />
							<span className="text-[10px] font-black tracking-widest uppercase">レシピ</span>
						</button>
						{/* 調理中 */}
						<button
							onClick={() => goToCookingQueue()}
							className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all relative ${
								view === "cookingQueue" || view === "cookingDetail" ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/50"
							}`}
						>
							<div className="relative">
								<Utensils className="w-5 h-5 transition-transform active:scale-90" />
								{activeSessions.length > 0 && (
									<span className="absolute -top-2 -right-3 min-w-[1rem] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-black animate-in zoom-in border border-background">
										{activeSessions.length}
									</span>
								)}
							</div>
							<span className="text-[10px] font-black tracking-widest uppercase">調理中</span>
						</button>
						{/* その他 */}
						<button
							onClick={() => goToMore()}
							className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
								view === "more" ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/50"
							}`}
						>
							<MoreHorizontal className="w-5 h-5 transition-transform active:scale-90" />
							<span className="text-[10px] font-black tracking-widest uppercase">その他</span>
						</button>
					</div>
				</div>
			)}

			<AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
				<AlertDialogContent className="rounded-[2rem] border-none bg-background/95 backdrop-blur-3xl shadow-2xl">
					<AlertDialogHeader className="space-y-4">
						<AlertDialogTitle className="text-2xl font-black tracking-tight">変更を破棄しますか？</AlertDialogTitle>
						<AlertDialogDescription className="text-muted-foreground font-bold">
							編集中の内容が保存されていません。このまま閉じると変更は失われます。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="mt-8 gap-3">
						<AlertDialogCancel className="h-14 rounded-full font-black tracking-widest border-border/40 hover:bg-muted">
							キャンセル
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (pendingAction) {
									setIsFormDirty(false); // Reset before executing action
									pendingAction();
									setPendingAction(null);
								}
							}}
							className="h-14 rounded-full font-black tracking-widest bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							破棄する
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Toast Notification */}
			{toast && (
				<div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
					<div className="bg-foreground/95 backdrop-blur-xl text-background px-6 py-4 rounded-[1.5rem] font-black text-sm shadow-2xl flex items-center gap-3 border border-white/10">
						<div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
							<Check className="w-4 h-4 text-primary-foreground stroke-[3px]" />
						</div>
						<span className="tracking-tight">{toast.message}</span>
					</div>
				</div>
			)}
		</div>
	);
}

export default App;
