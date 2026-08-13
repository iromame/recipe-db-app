import { create } from 'zustand';

export interface ShoppingListItem {
    id: string;
    recipeId: string | null;
    recipeName: string | null;
    name: string;
    baseName: string;
    multiplier: number;
    isChecked: boolean;
    createdAt: string;
}

interface ShoppingListState {
    items: ShoppingListItem[];
    loading: boolean;
    error: string | null;
    fetchItems: () => Promise<void>;
    addItem: (item: { recipeId?: string | null, recipeName?: string | null, name: string, baseName?: string, multiplier?: number, isChecked?: boolean }) => Promise<void>;
    addMultipleItems: (items: { recipeId?: string | null, recipeName?: string | null, name: string, baseName?: string, multiplier?: number, isChecked?: boolean }[]) => Promise<void>;
    updateItem: (id: string, updates: { isChecked?: boolean; name?: string; baseName?: string; multiplier?: number }) => Promise<void>;
    bulkUpdateItems: (items: { id: string; name?: string; baseName?: string; multiplier?: number; isChecked?: boolean }[]) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    deleteRecipeItems: (recipeId: string) => Promise<void>;
    deleteCheckedItems: () => Promise<void>;
    deleteAllItems: () => Promise<void>;
}

export const useShoppingListStore = create<ShoppingListState>((set, get) => ({
    items: [],
    loading: false,
    error: null,
    fetchItems: async () => {
        set({ loading: true, error: null });
        try {
            const res = await fetch('/api/shopping-list');
            if (!res.ok) throw new Error('Failed to fetch items');
            const data = await res.json();
            set({ items: data, loading: false });
        } catch (err: any) {
            set({ error: err.message, loading: false });
        }
    },
    addItem: async (item) => {
        try {
            // Sanitize names to prevent Cloudflare WAF XSS rules blocking tags like <something>
            const sanitizedItem = { ...item };
            sanitizedItem.name = sanitizedItem.name.replace(/</g, "＜").replace(/>/g, "＞");
            if (sanitizedItem.baseName) {
                sanitizedItem.baseName = sanitizedItem.baseName.replace(/</g, "＜").replace(/>/g, "＞");
            }

            const res = await fetch('/api/shopping-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([sanitizedItem]) // API expects array or object, but array is safer based on our code
            });
            if (!res.ok) throw new Error('Failed to add item');
            await get().fetchItems();
        } catch (err: any) {
            console.error(err);
            throw err;
        }
    },
    addMultipleItems: async (items) => {
        if (items.length === 0) return;
        try {
            // Sanitize names
            const sanitizedItems = items.map(item => {
                const s = { ...item };
                s.name = s.name.replace(/</g, "＜").replace(/>/g, "＞");
                if (s.baseName) {
                    s.baseName = s.baseName.replace(/</g, "＜").replace(/>/g, "＞");
                }
                return s;
            });

            const res = await fetch('/api/shopping-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sanitizedItems)
            });
            if (!res.ok) throw new Error('Failed to add items');
            await get().fetchItems();
        } catch (err: any) {
            console.error(err);
            throw err;
        }
    },
    updateItem: async (id, updates) => {
        // Sanitize names
        const sanitizedUpdates = { ...updates };
        if (sanitizedUpdates.name) {
            sanitizedUpdates.name = sanitizedUpdates.name.replace(/</g, "＜").replace(/>/g, "＞");
        }
        if (sanitizedUpdates.baseName) {
            sanitizedUpdates.baseName = sanitizedUpdates.baseName.replace(/</g, "＜").replace(/>/g, "＞");
        }

        // Optimistic update
        set(state => ({
            items: state.items.map(item => item.id === id ? { ...item, ...sanitizedUpdates } : item)
        }));
        try {
            const res = await fetch(`/api/shopping-list/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sanitizedUpdates)
            });
            if (!res.ok) {
                await get().fetchItems();
            }
        } catch (err: any) {
            console.error(err);
            await get().fetchItems();
            throw err;
        }
    },
    bulkUpdateItems: async (items) => {
        // Sanitize names
        const sanitizedItems = items.map(item => {
            const s = { ...item };
            if (s.name) s.name = s.name.replace(/</g, "＜").replace(/>/g, "＞");
            if (s.baseName) s.baseName = s.baseName.replace(/</g, "＜").replace(/>/g, "＞");
            return s;
        });

        set(state => ({
            items: state.items.map(item => {
                const update = sanitizedItems.find(i => i.id === item.id);
                return update ? { ...item, ...update } : item;
            })
        }));
        try {
            const res = await fetch('/api/shopping-list/bulk', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sanitizedItems)
            });
            if (!res.ok) {
                await get().fetchItems();
            }
        } catch (err: any) {
            console.error(err);
            await get().fetchItems();
            throw err;
        }
    },
    deleteItem: async (id) => {
        set(state => ({
            items: state.items.filter(item => item.id !== id)
        }));
        try {
            await fetch(`/api/shopping-list/${id}`, { method: 'DELETE' });
        } catch (err: any) {
            console.error(err);
            await get().fetchItems();
        }
    },
    deleteRecipeItems: async (recipeId) => {
        set(state => ({
            items: state.items.filter(item => item.recipeId !== recipeId)
        }));
        try {
            await fetch(`/api/shopping-list/recipe/${recipeId}`, { method: 'DELETE' });
        } catch (err: any) {
            console.error(err);
            await get().fetchItems();
        }
    },
    deleteCheckedItems: async () => {
        set(state => ({
            items: state.items.filter(item => !item.isChecked)
        }));
        try {
            await fetch('/api/shopping-list/checked', { method: 'DELETE' });
        } catch (err: any) {
            console.error(err);
            await get().fetchItems();
        }
    },
    deleteAllItems: async () => {
        set({ items: [] });
        try {
            await fetch('/api/shopping-list/all', { method: 'DELETE' });
        } catch (err: any) {
            console.error(err);
            await get().fetchItems();
        }
    }
}));
