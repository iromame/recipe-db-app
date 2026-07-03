
async function createRecipe(i) {
  const modes = [["MAKE_AHEAD"], ["LUNCH"], ["DINNER"]];
  const allTags = ["豚肉", "鶏肉", "レンジ", "子供向け", "時短", "野菜"];
  
  const recipe = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    id: `dummy-${i}-${Date.now()}`,
    name: `テストレシピ ${i}`,
    description: `これはスクロールテスト用のダミーレシピ${i}です。`,
    cookingMode: modes[i % 3],
    tags: [allTags[i % allTags.length], allTags[(i + 1) % allTags.length]],
    recipeIngredient: [
      { name: "ダミー食材A", amount: "100g" },
      { name: "ダミー食材B", amount: "適量" }
    ],
    recipeInstructions: [
      { "@type": "HowToStep", text: "切る" },
      { "@type": "HowToStep", text: "焼く" }
    ],
    prepTime: "PT10M",
    cookTime: "PT15M",
    totalTime: "PT25M",
    recipeYield: "2人前"
  };

  try {
    const res = await fetch("http://localhost:5173/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recipe)
    });
    console.log(`Created recipe ${i}: ${res.status}`);
  } catch (err) {
    console.error(`Failed to create recipe ${i}:`, err);
  }
}

async function main() {
  console.log("Seeding 20 dummy recipes...");
  for (let i = 1; i <= 20; i++) {
    await createRecipe(i);
  }
  console.log("Done seeding.");
}

main();
