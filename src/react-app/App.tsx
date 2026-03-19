import { useState } from "react";
import { RecipeList } from "./components/RecipeList";
import { RecipeDetail } from "./components/RecipeDetail";
import { RecipeForm } from "./components/RecipeForm";
import "./App.css";

type ViewState = "list" | "detail" | "form";

function App() {
	const [view, setView] = useState<ViewState>("list");
	const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(null);

	const goToList = () => {
		setCurrentRecipeId(null);
		setView("list");
	};

	const goToDetail = (id: string) => {
		setCurrentRecipeId(id);
		setView("detail");
	};

	const goToForm = (id?: string) => {
		setCurrentRecipeId(id || null);
		setView("form");
	};

	return (
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10">
			<header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border/40">
				<div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
					<div className="flex flex-col">
						<h1
							className="text-2xl font-black text-primary tracking-tighter cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
							onClick={goToList}
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

			<main className="max-w-4xl mx-auto px-4 py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
				{view === "list" && (
					<RecipeList
						onSelectRecipe={goToDetail}
						onCreateNew={() => goToForm()}
					/>
				)}
				{view === "detail" && currentRecipeId && (
					<RecipeDetail
						id={currentRecipeId}
						onBack={goToList}
						onEdit={goToForm}
						onDelete={goToList}
					/>
				)}
				{view === "form" && (
					<RecipeForm
						id={currentRecipeId || undefined}
						onSave={goToList}
						onCancel={view === "form" && currentRecipeId ? () => goToDetail(currentRecipeId) : goToList}
					/>
				)}
			</main>
		</div>
	);
}

export default App;
