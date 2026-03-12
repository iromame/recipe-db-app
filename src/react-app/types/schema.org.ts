export interface RecipeIngredient {
    name: string;
    amount?: string;
    unit?: string;
}

export interface HowToStep {
    text: string;
}

export interface AgeCategory {
    name: string;
    minAge?: number;
}

export interface Recipe {
    id?: string;
    name: string;
    recipeCategory?: string;
    prepTime?: string;
    cookTime?: string;
    suitableForKids?: AgeCategory;
    recipeIngredient?: RecipeIngredient[];
    recipeInstructions?: HowToStep[];
    url?: string;
    images?: string[];
    structuredData?: any;
}
