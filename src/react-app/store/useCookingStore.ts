import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CookingSession {
  id: string; // unique ID for this instance in the queue
  recipeId: string;
  recipeName: string;
  imageUrl?: string;
  createdAt: number;
  checkedIngredients: string[]; // array of ingredient names
  checkedInstructions: number[]; // array of instruction indices
}

interface CookingStoreState {
  activeSessions: CookingSession[];
  addSession: (session: Omit<CookingSession, 'id' | 'createdAt' | 'checkedIngredients' | 'checkedInstructions'>) => void;
  removeSession: (id: string) => void;
  toggleIngredient: (sessionId: string, ingredientName: string) => void;
  toggleInstruction: (sessionId: string, instructionIndex: number) => void;
}

export const useCookingStore = create<CookingStoreState>()(
  persist(
    (set) => ({
      activeSessions: [],
      
      addSession: (session) => set((state) => {
        // Prevent duplicate recipes in active session queue if preferred?
        // Let's allow duplicates in case they want to cook it twice (e.g. today and tomorrow overlap)
        return {
          activeSessions: [
            ...state.activeSessions,
            {
              ...session,
              id: crypto.randomUUID(),
              createdAt: Date.now(),
              checkedIngredients: [],
              checkedInstructions: [],
            }
          ]
        };
      }),

      removeSession: (id) => set((state) => ({
        activeSessions: state.activeSessions.filter(s => s.id !== id)
      })),

      toggleIngredient: (sessionId, ingredientName) => set((state) => ({
        activeSessions: state.activeSessions.map(session => {
          if (session.id !== sessionId) return session;
          const isChecked = session.checkedIngredients.includes(ingredientName);
          return {
            ...session,
            checkedIngredients: isChecked
              ? session.checkedIngredients.filter(i => i !== ingredientName)
              : [...session.checkedIngredients, ingredientName]
          };
        })
      })),

      toggleInstruction: (sessionId, instructionIndex) => set((state) => ({
        activeSessions: state.activeSessions.map(session => {
          if (session.id !== sessionId) return session;
          const isChecked = session.checkedInstructions.includes(instructionIndex);
          return {
            ...session,
            checkedInstructions: isChecked
              ? session.checkedInstructions.filter(i => i !== instructionIndex)
              : [...session.checkedInstructions, instructionIndex]
          };
        })
      })),
    }),
    {
      name: 'cooking-sessions-storage',
    }
  )
);
