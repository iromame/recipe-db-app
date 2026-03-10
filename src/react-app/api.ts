import { Recipe } from "./types/schema.org";

const checkResponse = async (res: Response) => {
    // Cloudflare Access redirects unauthenticated API requests to its login page (cloudflareaccess.com).
    if (res.redirected && res.url.includes("cloudflareaccess.com")) {
        window.location.href = "/cdn-cgi/access/login";
        throw new Error("Cloudflare Access: Redirecting to login page...");
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
        // If we get HTML instead of JSON, it's almost certainly the Access login page or an error page.
        // We redirect to the login endpoint to be sure.
        console.warn("Received HTML instead of JSON. Redirecting to Access login.");
        window.location.href = "/cdn-cgi/access/login";
        throw new Error("Cloudflare Access: Session might have expired. Redirecting to login...");
    }

    if (!res.ok) {
        throw new Error(`API error (${res.status}): ${res.statusText}`);
    }

    try {
        return await res.json();
    } catch (e) {
        console.error("JSON parse error:", e);
        throw new Error(`Failed to parse API response as JSON (Content-Type: ${contentType})`);
    }
};

export const api = {
    getRecipes: async (): Promise<Recipe[]> => {
        const res = await fetch("/api/recipes");
        return checkResponse(res);
    },
    getRecipe: async (id: string): Promise<Recipe> => {
        const res = await fetch(`/api/recipes/${id}`);
        return checkResponse(res);
    },
    createRecipe: async (recipe: Recipe): Promise<Recipe> => {
        const res = await fetch("/api/recipes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(recipe),
        });
        return checkResponse(res);
    },
    updateRecipe: async (id: string, recipe: Recipe): Promise<void> => {
        const res = await fetch(`/api/recipes/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(recipe),
        });
        await checkResponse(res);
    },
    deleteRecipe: async (id: string): Promise<void> => {
        const res = await fetch(`/api/recipes/${id}`, {
            method: "DELETE",
        });
        await checkResponse(res);
    },
};
