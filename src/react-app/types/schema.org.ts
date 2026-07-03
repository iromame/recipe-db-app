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
    ageRange?: string;
}

export interface Recipe {
    id?: string;
    name: string;
    cookingMode: ("MAKE_AHEAD" | "LUNCH" | "DINNER")[];
    recipeCategory?: string;
    tags?: string[];
    prepTime?: string;
    cookTime?: string;
    suitableForKids?: AgeCategory;
    pinned?: boolean;
    recipeYield?: { value: number; unit: string };
    recipeIngredient?: RecipeIngredient[];
    recipeInstructions?: HowToStep[];
    url?: string;
    images?: string[];
    structuredData?: any;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
    cookCount?: number;
    lastCookedAt?: string;
}
