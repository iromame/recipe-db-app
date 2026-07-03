import { create } from 'zustand';

export type SortAxis = 'updatedAt' | 'createdAt' | 'lastCookedAt' | 'cookCount' | 'prepTime' | 'cookTime';
export type SortOrder = 'desc' | 'asc';

interface RecipeListState {
  searchQuery: string;
  selectedModes: string[];
  selectedTags: string[];
  sortAxis: SortAxis;
  sortOrder: SortOrder;
  scrollPosition: number;
  
  setSearchQuery: (query: string) => void;
  setSelectedModes: (modes: string[] | ((prev: string[]) => string[])) => void;
  setSelectedTags: (tags: string[] | ((prev: string[]) => string[])) => void;
  setSortAxis: (axis: SortAxis) => void;
  setSortOrder: (order: SortOrder) => void;
  setScrollPosition: (position: number) => void;
}

export const useRecipeListStore = create<RecipeListState>((set) => ({
  searchQuery: "",
  selectedModes: [],
  selectedTags: [],
  sortAxis: 'updatedAt',
  sortOrder: 'desc',
  scrollPosition: 0,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedModes: (modes) => set((state) => ({ 
    selectedModes: typeof modes === 'function' ? modes(state.selectedModes) : modes 
  })),
  setSelectedTags: (tags) => set((state) => ({ 
    selectedTags: typeof tags === 'function' ? tags(state.selectedTags) : tags 
  })),
  setSortAxis: (axis) => set({ sortAxis: axis }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setScrollPosition: (position) => set({ scrollPosition: position }),
}));
