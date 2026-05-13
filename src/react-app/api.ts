import { Recipe } from "./types/schema.org";

// Wrap fetch() to catch network-level errors (e.g. "Failed to fetch", "NetworkError").
// These happen BEFORE checkResponse is reached, typically when Cloudflare Access
// rejects an unauthenticated request with a CORS-blocked redirect on mobile.
const SESSION_EXPIRED_ERROR = "SESSION_EXPIRED";

const safeFetch = async (input: string, init?: RequestInit): Promise<Response> => {
    try {
        return await fetch(input, init);
    } catch (e: any) {
        console.error("Network-level fetch error (possible session expiry):", e);
        // Throw a special marker so the UI can show a re-login prompt
        // instead of a generic "Failed to fetch" message.
        const err = new Error(SESSION_EXPIRED_ERROR);
        (err as any).isSessionExpired = true;
        throw err;
    }
};

const checkResponse = async (res: Response) => {
    // Cloudflare Access redirects unauthenticated API requests to its login page (cloudflareaccess.com).
    if (res.redirected && res.url.includes("cloudflareaccess.com")) {
        window.location.href = "/api/login";
        throw new Error("Cloudflare Access: Redirecting to login page...");
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
        // If we get HTML instead of JSON, it's almost certainly the Access login page or an error page.
        // We redirect to the login endpoint to be sure.
        console.warn("Received HTML instead of JSON. Redirecting to Access login.");
        window.location.href = "/api/login";
        throw new Error("Cloudflare Access: Session might have expired. Redirecting to login...");
    }

    if (!res.ok) {
        let errorMsg = res.statusText;
        try {
            const errBody = await res.json();
            if (errBody && errBody.error) {
                errorMsg = errBody.error;
            }
        } catch (_) {
            // Ignore parse errors for error objects
        }
        throw new Error(`API error (${res.status}): ${errorMsg}`);
    }

    try {
        return await res.json();
    } catch (e) {
        console.error("JSON parse error:", e);
        throw new Error(`Failed to parse API response as JSON (Content-Type: ${contentType})`);
    }
};

export { SESSION_EXPIRED_ERROR };

export const api = {
    getRecipes: async (): Promise<Recipe[]> => {
        const res = await safeFetch("/api/recipes");
        return checkResponse(res);
    },
    getRecipe: async (id: string): Promise<Recipe> => {
        const res = await safeFetch(`/api/recipes/${id}`);
        return checkResponse(res);
    },
    createRecipe: async (recipe: Recipe): Promise<Recipe> => {
        const res = await safeFetch("/api/recipes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(recipe),
        });
        return checkResponse(res);
    },
    updateRecipe: async (id: string, recipe: Recipe): Promise<void> => {
        const res = await safeFetch(`/api/recipes/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(recipe),
        });
        await checkResponse(res);
    },
    deleteRecipe: async (id: string): Promise<void> => {
        const res = await safeFetch(`/api/recipes/${id}`, {
            method: "DELETE",
        });
        await checkResponse(res);
    },
    uploadImage: async (recipeId: string, file: File): Promise<{ key: string }> => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await safeFetch(`/api/recipes/${recipeId}/images`, {
            method: "POST",
            body: formData,
        });
        return checkResponse(res);
    },
    extractRecipe: async (formData: FormData): Promise<{ success: boolean; data: any }> => {
        const res = await safeFetch("/api/recipes/extract", {
            method: "POST",
            body: formData,
        });
        return checkResponse(res);
    },
    trackCookingHistory: async (recipeId: string): Promise<{ success: boolean; id: string }> => {
        const res = await safeFetch("/api/cooking-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipeId }),
        });
        return checkResponse(res);
    },
    getCookingHistory: async (): Promise<{ id: string; recipeId: string; recipeName: string; createdAt: string }[]> => {
        const res = await safeFetch("/api/cooking-history");
        return checkResponse(res);
    },
    exportData: async (): Promise<void> => {
        const res = await safeFetch("/api/export");
        if (res.redirected && res.url.includes("cloudflareaccess.com")) {
            window.location.href = "/api/login";
            throw new Error("Cloudflare Access: Redirecting to login page...");
        }
        if (!res.ok) throw new Error("Export failed");
        
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "recipes-export.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
};
