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
            const res = await fetch('/api/shopping-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([item]) // API expects array or object, but array is safer based on our code
            });
            if (!res.ok) throw new Error('Failed to add item');
            await get().fetchItems();
        } catch (err: any) {
            console.error(err);
        }
    },
    addMultipleItems: async (items) => {
        if (items.length === 0) return;
        try {
            const res = await fetch('/api/shopping-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(items)
            });
            if (!res.ok) throw new Error('Failed to add items');
            await get().fetchItems();
        } catch (err: any) {
            console.error(err);
        }
    },
    updateItem: async (id, updates) => {
        // Optimistic update
        set(state => ({
            items: state.items.map(item => item.id === id ? { ...item, ...updates } : item)
        }));
        try {
            const res = await fetch(`/api/shopping-list/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) {
                await get().fetchItems();
            }
        } catch (err: any) {
            console.error(err);
            await get().fetchItems();
        }
    },
    bulkUpdateItems: async (items) => {
        set(state => ({
            items: state.items.map(item => {
                const update = items.find(i => i.id === item.id);
                return update ? { ...item, ...update } : item;
            })
        }));
        try {
            const res = await fetch('/api/shopping-list/bulk', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(items)
            });
            if (!res.ok) {
                await get().fetchItems();
            }
        } catch (err: any) {
            console.error(err);
            await get().fetchItems();
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
    }
}));
