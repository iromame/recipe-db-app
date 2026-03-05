import { Recipe } from "./types/schema.org";

export const api = {
    getRecipes: async (): Promise<Recipe[]> => {
        const res = await fetch("/api/recipes");
        if (!res.ok) throw new Error("Failed to fetch recipes");
        return res.json();
    },
    getRecipe: async (id: string): Promise<Recipe> => {
        const res = await fetch(`/api/recipes/${id}`);
        if (!res.ok) throw new Error("Failed to fetch recipe");
        return res.json();
    },
    createRecipe: async (recipe: Recipe): Promise<Recipe> => {
        const res = await fetch("/api/recipes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(recipe),
        });
        if (!res.ok) throw new Error("Failed to create recipe");
        return res.json();
    },
    updateRecipe: async (id: string, recipe: Recipe): Promise<void> => {
        const res = await fetch(`/api/recipes/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(recipe),
        });
        if (!res.ok) throw new Error("Failed to update recipe");
    },
    deleteRecipe: async (id: string): Promise<void> => {
        const res = await fetch(`/api/recipes/${id}`, {
            method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete recipe");
    },
};
