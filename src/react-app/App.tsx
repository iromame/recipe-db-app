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
		<div className="min-h-screen bg-gray-100 text-gray-900 font-sans p-4 md:p-8">
			<header className="max-w-4xl mx-auto mb-8">
				<div>
					<h1
						className="text-4xl font-extrabold text-blue-800 tracking-tight cursor-pointer inline-block"
						onClick={goToList}
					>
						Family Recipe Kitchen
					</h1>
					<p className="text-gray-500 mt-2">A standard-compliant recipe database.</p>
				</div>
			</header>

			<main className="max-w-4xl mx-auto">
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
