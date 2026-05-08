import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { Recipe } from "../types/schema.org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Plus, Scale, X, Clock, Utensils, Tag, ImageIcon, Link as LinkIcon, Check, Baby, ChevronLeft, Save, NotepadText, CookingPot, Sun, Moon, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function RecipeForm({ id, initialData, onSave, onCancel, onDirtyStateChange }: { 
	id?: string, 
	initialData?: Partial<Recipe> | null, 
	onSave: (recipe: Recipe) => void, 
	onCancel: () => void,
	onDirtyStateChange?: (isDirty: boolean) => void
}) {
	const [recipe, setRecipe] = useState<Partial<Recipe>>(initialData || {
		name: "",
		cookingMode: "MAKE_AHEAD",
		recipeCategory: "",
		tags: [],
		prepTime: "",
		cookTime: "",
		url: "",
		images: [],
		notes: "",
		suitableForKids: undefined,
		recipeYield: undefined,
	});
	const [tagInput, setTagInput] = useState("");
	const [allTags, setAllTags] = useState<string[]>([]);
	const [tagDrawerOpen, setTagDrawerOpen] = useState(false);

	const [ingredientsText, setIngredientsText] = useState("");
	const [instructionsText, setInstructionsText] = useState("");
	const [loading, setLoading] = useState(false);
	const [uploading, setUploading] = useState(false);
	const initialStateRef = useRef<string>("");
	const [isDirty, setIsDirty] = useState(false);

	const getFormState = () => JSON.stringify({
		name: recipe.name || "",
		cookingMode: recipe.cookingMode || "MAKE_AHEAD",
		recipeCategory: recipe.recipeCategory || "",
		tags: [...(recipe.tags || [])].sort(),
		prepTime: recipe.prepTime || "",
		cookTime: recipe.cookTime || "",
		url: recipe.url || "",
		images: [...(recipe.images || [])],
		notes: recipe.notes || "",
		suitableForKids: recipe.suitableForKids ? JSON.stringify(recipe.suitableForKids) : undefined,
		recipeYield: recipe.recipeYield ? JSON.stringify(recipe.recipeYield) : undefined,
		ingredientsText: ingredientsText.trim(),
		instructionsText: instructionsText.trim(),
	});

	useEffect(() => {
		if (!loading) {
			const current = getFormState();
			if (!initialStateRef.current) {
				initialStateRef.current = current;
			}
			const dirty = current !== initialStateRef.current;
			setIsDirty(dirty);
			onDirtyStateChange?.(dirty);
		}
	}, [recipe, ingredientsText, instructionsText, loading]);

	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (isDirty) {
				e.preventDefault();
				e.returnValue = "";
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [isDirty]);

	const resizeImage = (file: File): Promise<Blob> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = (event) => {
				const img = new Image();
				img.src = event.target?.result as string;
				img.onload = () => {
					const canvas = document.createElement("canvas");
					const MAX_WIDTH = 1200;
					const MAX_HEIGHT = 1200;
					let width = img.width;
					let height = img.height;
					if (width > height) {
						if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
					} else {
						if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
					}
					canvas.width = width; canvas.height = height;
					const ctx = canvas.getContext("2d");
					ctx?.drawImage(img, 0, 0, width, height);
					canvas.toBlob((blob) => {
						if (blob) resolve(blob); else reject(new Error("Canvas toBlob failed"));
					}, "image/webp", 0.8);
				};
			};
			reader.onerror = (e) => reject(e);
		});
	};

	const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;
		if (!id) {
			alert("画像を追加する前に一旦レシピを保存してください。");
			return;
		}
		const currentImages = recipe.images || [];
		if (currentImages.length >= 3) return alert("画像は最大3枚までです。");
		setUploading(true);
		try {
			for (let i = 0; i < files.length; i++) {
				if (currentImages.length + i >= 3) break;
				const resizedBlob = await resizeImage(files[i]);
				const resizedFile = new File([resizedBlob], files[i].name, { type: "image/webp" });
				const { key } = await api.uploadImage(id, resizedFile);
				setRecipe(prev => ({ ...prev, images: [...(prev.images || []), key] }));
			}
		} catch (err) { alert("アップロードに失敗しました。"); } finally { setUploading(false); }
	};

	const removeImage = (key: string) => {
		setRecipe(prev => ({ ...prev, images: (prev.images || []).filter(k => k !== key) }));
	};

	useEffect(() => {
		api.getRecipes().then(recipes => {
			const tags = new Set<string>();
			recipes.forEach(r => r.tags?.forEach(t => tags.add(t)));
			setAllTags(Array.from(tags).sort());
		}).catch(console.error);

		if (id) {
			setLoading(true);
			api.getRecipe(id).then(r => {
				setRecipe(r);
				if (r.recipeIngredient) {
					try {
						const ings = Array.isArray(r.recipeIngredient) ? r.recipeIngredient : JSON.parse(r.recipeIngredient as any);
						setIngredientsText(ings.map((i: any) => i.name).join("\n"));
					} catch (e) { console.error(e); }
				}
				if (r.recipeInstructions) {
					try {
						const insts = Array.isArray(r.recipeInstructions) ? r.recipeInstructions : JSON.parse(r.recipeInstructions as any);
						setInstructionsText(insts.map((s: any) => s.text).join("\n\n"));
					} catch (e) { console.error(e); }
				}
				if (typeof r.recipeYield === "string") {
					try { setRecipe(prev => ({ ...prev, recipeYield: JSON.parse(r.recipeYield as any) })); } catch (e) { console.error(e); }
				}
			}).finally(() => setLoading(false));
		} else if (initialData) {
			setRecipe(prev => ({ ...prev, ...initialData, cookingMode: initialData.cookingMode || "MAKE_AHEAD" }));
			if (initialData.recipeIngredient) {
				const ings = initialData.recipeIngredient;
				setIngredientsText(Array.isArray(ings) ? ings.map((i: any) => i.name).join("\n") : "");
			}
			if (initialData.recipeInstructions) {
				const insts = initialData.recipeInstructions;
				setInstructionsText(Array.isArray(insts) ? insts.map((s: any) => s.text).join("\n\n") : "");
			}
			if (typeof initialData.recipeYield === "string") {
				try { setRecipe(prev => ({ ...prev, recipeYield: JSON.parse(initialData.recipeYield as any) })); } catch (e) { console.error(e); }
			}
		}
	}, [id, initialData]);

	const addTag = (tagToAdd: string) => {
		const tag = tagToAdd.trim().toLowerCase();
		if (tag && !recipe.tags?.includes(tag)) {
			setRecipe(prev => ({ ...prev, tags: [...(prev.tags || []), tag] }));
		}
		setTagInput("");
	};

	const removeTag = (tag: string) => {
		setRecipe(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }));
	};

	const formatMinutesToISO = (minutes: number) => minutes === 0 ? "" : `PT${minutes}M`;
	const parseISOToMinutes = (iso: string) => {
		const match = iso?.match(/PT(\d+)M/);
		return match ? parseInt(match[1]) : 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!recipe.name) return alert("名前は必須です。");

		const finalRecipe: Recipe = {
			name: recipe.name!,
			cookingMode: recipe.cookingMode as any || "DINNER",
			recipeCategory: recipe.recipeCategory,
			tags: recipe.tags,
			prepTime: recipe.prepTime,
			cookTime: recipe.cookTime,
			suitableForKids: recipe.suitableForKids,
			recipeYield: recipe.recipeYield,
			url: recipe.url,
			images: recipe.images,
			recipeIngredient: ingredientsText.split("\n").filter(l => l.trim()).map(name => ({ name })),
			recipeInstructions: instructionsText.split("\n\n").filter(l => l.trim()).map(text => ({ text })),
			notes: recipe.notes || "",
		};

		if (id) {
			await api.updateRecipe(id, finalRecipe);
			onSave({ ...finalRecipe, id });
		} else {
			const savedRecipe = await api.createRecipe(finalRecipe);
			onSave(savedRecipe);
		}
	};

	const DrumRollPicker = ({ label, value, field }: { label: string, value: string, field: 'prep' | 'cook' }) => {
		const minutes = parseISOToMinutes(value);
		const quickOptions = [10, 15, 20, 30, 45, 60];
		const scrollRef = useRef<HTMLDivElement>(null);

		const fullOptions = [0, 5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50, 60, 75, 90, 120];

		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-muted-foreground/60">
						<Clock className="w-4 h-4" />
						<span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
					</div>
					<span className="text-xl font-black text-primary">{minutes > 0 ? `${minutes} 分` : "--"}</span>
				</div>

				<div className="space-y-3">
					{/* Drum Roll Simulation (Horizontal Scroll) */}
					<div
						ref={scrollRef}
						className="flex gap-2.5 overflow-x-auto pb-4 -mx-2 px-2 touch-pan-x no-scrollbar mask-fade-edges"
					>
						{fullOptions.map(m => (
							<button
								key={m}
								type="button"
								onClick={() => setRecipe(prev => ({ ...prev, [field + 'Time']: formatMinutesToISO(m) }))}
								className={cn(
									"flex-shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 active:scale-95 border-2",
									minutes === m
										? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105"
										: "bg-muted/40 text-muted-foreground/80 border-transparent hover:border-muted-foreground/20"
								)}
							>
								<span className="text-lg font-black leading-none">{m === 0 ? "--" : m}</span>
								<span className="text-[9px] font-bold uppercase opacity-60 mt-0.5">{m === 0 ? "OFF" : "MIN"}</span>
							</button>
						))}
					</div>

					{/* Quick Chips */}
					<div className="flex flex-wrap gap-2">
						{quickOptions.map(m => (
							<button
								key={m}
								type="button"
								onClick={() => setRecipe(prev => ({ ...prev, [field + 'Time']: formatMinutesToISO(m) }))}
								className={cn(
									"px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95",
									minutes === m
										? "bg-primary/10 text-primary border-primary/20"
										: "bg-transparent text-muted-foreground/60 border-border/40 hover:border-muted-foreground/30"
								)}
							>
								{m}分
							</button>
						))}
					</div>
				</div>
			</div>
		);
	};

	const YieldPicker = () => {
		const yieldVal = recipe.recipeYield?.value || 0;
		const yieldUnit = recipe.recipeYield?.unit || "L";
		const units = ["L", "食分", "個", "g"];
		
		const updateYield = (val: number | string, un: string) => {
			const num = typeof val === 'string' ? parseFloat(val) : val;
			if (isNaN(num)) {
				setRecipe(prev => ({ ...prev, recipeYield: { value: 0, unit: un } }));
			} else {
				// Round to 1 decimal place to prevent floating point issues
				const rounded = Math.round(Math.max(0, num) * 10) / 10;
				setRecipe(prev => ({ ...prev, recipeYield: { value: rounded, unit: un } }));
			}
		};

		const activeOptions = yieldUnit === "L" ? [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0] :
		                      yieldUnit === "g" ? [50, 100, 150, 200, 250, 300, 400, 500] :
		                      [1, 2, 3, 4, 5, 8, 10];

		return (
			<div className="space-y-6">
				<div className="flex items-center gap-2 text-muted-foreground/60">
					<Scale className="w-4 h-4" />
					<span className="text-[10px] font-black uppercase tracking-[0.2em]">仕上がり量</span>
				</div>
				
				<div className="space-y-5">
					{/* Hybrid Row */}
					<div className="flex flex-wrap items-center gap-4">
						<Input
							type="number"
							step={yieldUnit === "L" ? "0.1" : yieldUnit === "g" ? "10" : "1"}
							min="0"
							value={yieldVal || ""}
							onChange={e => updateYield(e.target.value, yieldUnit)}
							className="w-32 h-16 text-3xl font-black text-center bg-muted/20 border-border/40 rounded-[1.5rem] focus-visible:ring-2 focus-visible:ring-primary/20 shadow-inner p-0"
						/>
						<div className="flex items-center bg-muted/30 p-1.5 rounded-full border border-border/20 shadow-inner">
							{units.map(u => (
								<button
									key={u}
									type="button"
									onClick={() => updateYield(yieldVal, u)}
									className={cn(
										"px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all active:scale-95",
										yieldUnit === u
											? "bg-primary text-primary-foreground border-transparent shadow-md"
											: "bg-transparent text-muted-foreground/60 border-transparent hover:text-foreground"
									)}
								>
									{u}
								</button>
							))}
						</div>
					</div>

					{/* Quick Chips (Wrapped) */}
					<div className="flex flex-wrap gap-2.5">
						{activeOptions.map(m => (
							<button
								key={m}
								type="button"
								onClick={() => updateYield(m, yieldUnit)}
								className={cn(
									"px-6 py-3 rounded-[1.25rem] text-[15px] font-black uppercase border-2 transition-all active:scale-95 shadow-sm",
									yieldVal === m
										? "bg-primary/10 text-primary border-primary/30 scale-105"
										: "bg-background text-muted-foreground/80 border-border/40 hover:border-muted-foreground/30 hover:bg-muted/20"
								)}
							>
								{yieldUnit === "L" ? m.toFixed(1) : m}
							</button>
						))}
					</div>
				</div>
			</div>
		);
	};

	if (loading) return <div className="p-24 text-center animate-pulse text-muted-foreground font-black tracking-widest">LOADING...</div>;

	return (
		<div className="bg-background min-h-screen pb-40 animate-in fade-in zoom-in-95 duration-500">
			{/* Header Navigation */}
			<div className="bg-background/80 backdrop-blur-2xl border-b border-border/40 sticky top-0 z-50">
				<div className="max-w-2xl mx-auto px-2 h-16 flex justify-between items-center">
					<Button variant="ghost" size="sm" onClick={onCancel} className="gap-2 rounded-2xl -ml-2 font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
						<ChevronLeft className="w-5 h-5" />
						<span>キャンセル</span>
					</Button>
					<h2 className="text-sm font-black tracking-[0.2em] uppercase text-muted-foreground/40">{id ? "EDIT RECIPE" : "NEW RECIPE"}</h2>
					<div className="w-10 h-10 flex items-center justify-center">
						<div className="w-2 h-2 rounded-full bg-primary/20 animate-ping" />
					</div>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-2 py-12 space-y-16">
				{/* 1. Primary Identity */}
				<section className="space-y-10">
					<div className="space-y-4">
						<div className="flex items-center gap-2 text-muted-foreground/60">
							<Flame className="w-4 h-4" />
							<span className="text-[10px] font-black uppercase tracking-[0.2em]">調理モード / 活用フェーズ</span>
						</div>
						<Tabs
							value={recipe.cookingMode || "DINNER"}
							onValueChange={(val) => setRecipe({ ...recipe, cookingMode: val as any })}
							className="w-full"
						>
							<TabsList className="grid w-full grid-cols-3 h-16 p-1.5 bg-muted/40 rounded-[1.5rem] border border-border/20 shadow-inner">
								<TabsTrigger value="MAKE_AHEAD" className="rounded-[1rem] font-black text-[10px] uppercase tracking-widest transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg flex items-center gap-2">
									<CookingPot className="w-4 h-4" />
									<span className="hidden sm:inline">作り置き</span>
								</TabsTrigger>
								<TabsTrigger value="LUNCH" className="rounded-[1rem] font-black text-[10px] uppercase tracking-widest transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg flex items-center gap-2">
									<Sun className="w-4 h-4" />
									<span className="hidden sm:inline">お昼</span>
								</TabsTrigger>
								<TabsTrigger value="DINNER" className="rounded-[1rem] font-black text-[10px] uppercase tracking-widest transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg flex items-center gap-2">
									<Moon className="w-4 h-4" />
									<span className="hidden sm:inline">晩ごはん</span>
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">レシピ名</span>
							{recipe.name && <Check className="w-4 h-4 text-green-500" />}
						</div>
						<Input
							placeholder="料理名を入力..."
							value={recipe.name || ""}
							onChange={e => setRecipe({ ...recipe, name: e.target.value })}
							className="h-auto py-4 text-4xl md:text-5xl font-black border-0 border-b-4 border-muted/30 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0 transition-all placeholder:text-muted-foreground/20 leading-tight"
							required
						/>
					</div>

					<div className="flex items-center justify-between p-6 bg-primary/5 rounded-[2rem] border border-primary/10 shadow-inner group active:scale-95 transition-all">
						<div className="flex items-center gap-4 text-primary">
							<Baby className="w-6 h-6" />
							<div>
								<p className="text-sm font-black tracking-tight leading-none mb-1">子供向けレシピ</p>
								<p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">SUITABLE FOR KIDS</p>
							</div>
						</div>
						<button
							type="button"
							onClick={() => setRecipe(prev => ({ ...prev, suitableForKids: prev.suitableForKids ? undefined : { name: "Infant" } }))}
							className={cn(
								"w-14 h-8 rounded-full p-1 transition-all duration-300",
								recipe.suitableForKids ? "bg-primary" : "bg-muted"
							)}
						>
							<div className={cn(
								"w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300",
								recipe.suitableForKids ? "translate-x-6" : "translate-x-0"
							)} />
						</button>
					</div>
				</section>

				{/* 2. Media Grid */}
				<section className="space-y-6">
					<div className="flex items-center gap-2 text-muted-foreground/60">
						<ImageIcon className="w-4 h-4" />
						<span className="text-[10px] font-black uppercase tracking-[0.2em]">写真 (最大3枚)</span>
					</div>
					<div className="grid grid-cols-3 gap-4">
						{recipe.images?.map(key => (
							<div key={key} className="relative aspect-square rounded-[2rem] overflow-hidden shadow-md border border-border/20 bg-muted group rotate-0 hover:scale-105 active:scale-90 transition-all">
								<img src={`/api/images/${key}`} alt="" className="w-full h-full object-cover" />
								<button
									type="button"
									onClick={() => removeImage(key)}
									className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
						))}
						{id && (recipe.images?.length || 0) < 3 && (
							<label className="aspect-square border-4 border-dashed border-muted/60 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 hover:border-primary/40 transition-all group active:scale-95 bg-muted/10">
								<Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-2" />
								<span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">追加</span>
								<input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
							</label>
						)}
						{!id && (
							<div className="col-span-3 p-8 rounded-[2.5rem] bg-muted/30 border border-dashed border-border/40 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 italic">
								一度保存すると画像を追加できます
							</div>
						)}
					</div>
					{uploading && <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em] flex items-center gap-3 animate-pulse">
						<div className="w-2 h-2 rounded-full bg-primary animate-ping" />
						Uploading images...
					</div>}
				</section>

				{/* 3. Time Belt */}
				<section className="grid grid-cols-1 md:grid-cols-2 gap-12 p-8 md:p-10 bg-muted/20 rounded-[3rem] border border-border/40 shadow-inner">
					<DrumRollPicker label="準備" value={recipe.prepTime || ""} field="prep" />
					<DrumRollPicker label="調理" value={recipe.cookTime || ""} field="cook" />
				</section>

				{/* 4. Categorization (Tags) */}
				<section className="space-y-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 text-muted-foreground/60">
							<Tag className="w-4 h-4" />
							<span className="text-[10px] font-black uppercase tracking-[0.2em]">タグ</span>
						</div>
					</div>

					<div className="flex flex-wrap gap-2.5">
						{recipe.tags?.map(tag => (
							<Badge key={tag} variant="secondary" className="pl-4 pr-2 py-2 rounded-full text-xs font-black bg-muted/60 text-muted-foreground/90 border-transparent hover:bg-muted/80 transition-all group">
								#{tag}
								<button type="button" onClick={() => removeTag(tag)} className="ml-2 p-1.5 hover:bg-destructive hover:text-destructive-foreground rounded-full transition-all active:scale-75">
									<X className="w-3 h-3" />
								</button>
							</Badge>
						))}
						<Drawer open={tagDrawerOpen} onOpenChange={setTagDrawerOpen}>
							<DrawerTrigger asChild>
								<Button
									variant="outline"
									className="rounded-full h-10 px-5 bg-primary/10 border-primary/20 text-primary font-black text-xs hover:bg-primary/20"
								>
									<Plus className="w-4 h-4 mr-2" />
									タグを追加
								</Button>
							</DrawerTrigger>
							<DrawerContent className="bg-background/95 backdrop-blur-3xl border-none shadow-2xl rounded-t-[3rem]">
								<div className="mx-auto w-full max-w-lg p-6 pb-12 space-y-8">
									<DrawerHeader className="px-0">
										<DrawerTitle className="text-3xl font-black tracking-tighter">タグを選択・作成</DrawerTitle>
										<DrawerDescription className="text-muted-foreground font-bold">既存のタグから選ぶか、新しいタグを入力してEnterを押してください。</DrawerDescription>
									</DrawerHeader>

									<Command className="bg-transparent border-none">
										<div className="relative group">
											<CommandInput
												placeholder="鶏肉, レンジ, 時短..."
												value={tagInput}
												onValueChange={setTagInput}
												className="h-16 text-xl font-black bg-muted/40 rounded-[1.5rem] border-transparent px-6 focus:ring-2 focus:ring-primary/20"
												onKeyDown={(e) => {
													if (e.key === 'Enter' && tagInput) {
														e.preventDefault();
														addTag(tagInput);
													}
												}}
											/>
											<Tag className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground/20 group-focus-within:text-primary/40 transition-colors" />
										</div>
										<CommandList className="mt-8 max-h-[40vh] no-scrollbar">
											<CommandEmpty className="py-12 text-center">
												<p className="text-muted-foreground font-bold mb-6">一致するタグがありません。</p>
												<Button
													onClick={() => addTag(tagInput)}
													className="rounded-full h-12 px-8 font-black text-sm shadow-lg shadow-primary/20"
												>
													"{tagInput}" を新規作成
												</Button>
											</CommandEmpty>
											<CommandGroup heading="人気のタグ / 既存のタグ">
												<div className="flex flex-wrap gap-2 pt-4">
													{allTags.filter(t => t.includes(tagInput.toLowerCase()) && !recipe.tags?.includes(t)).map((tag) => (
														<CommandItem
															key={tag}
															value={tag}
															onSelect={(val) => addTag(val)}
															className="rounded-full border border-border/60 px-5 py-2 cursor-pointer font-bold text-sm hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all active:scale-95"
														>
															{tag}
														</CommandItem>
													))}
												</div>
											</CommandGroup>
										</CommandList>
									</Command>

									<DrawerFooter className="px-0 pt-8 border-t border-border/10">
										<DrawerClose asChild>
											<Button variant="secondary" className="h-16 rounded-[1.5rem] font-black tracking-widest">完了</Button>
										</DrawerClose>
									</DrawerFooter>
								</div>
							</DrawerContent>
						</Drawer>
					</div>
				</section>

				{/* 5. Content Section (Large Text Areas) */}
				<section className="space-y-12">
					<YieldPicker />
					
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-muted-foreground/60">
								<Utensils className="w-4 h-4" />
								<span className="text-[10px] font-black uppercase tracking-[0.2em]">材料 (1行に1つ)</span>
							</div>
							<span className="text-[10px] font-bold text-muted-foreground/40">{ingredientsText.split('\n').filter(l => l.trim()).length} 個</span>
						</div>
						<Textarea
							rows={6}
							value={ingredientsText}
							onChange={e => setIngredientsText(e.target.value)}
							className="rounded-[2rem] p-8 bg-muted/20 border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 text-lg font-medium leading-relaxed placeholder:text-muted-foreground/10 resize-none shadow-inner transition-all hover:bg-muted/30"
							placeholder="豚肉 200g&#10;玉ねぎ 1/2個"
						/>
					</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-muted-foreground/60">
								<Tag className="w-4 h-4" />
								<span className="text-[10px] font-black uppercase tracking-[0.2em]">作り方 (適宜改行)</span>
							</div>
							<span className="text-[10px] font-bold text-muted-foreground/40">{instructionsText.split('\n\n').filter(l => l.trim()).length} ステップ</span>
						</div>
						<Textarea
							rows={8}
							value={instructionsText}
							onChange={e => setInstructionsText(e.target.value)}
							className="rounded-[2rem] p-8 bg-muted/20 border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 text-lg font-medium leading-relaxed placeholder:text-muted-foreground/10 resize-none shadow-inner transition-all hover:bg-muted/30"
							placeholder="1. 野菜を1cm角に切る&#10;&#10;2. フライパンで炒める"
						/>
					</div>

					<div className="space-y-4">
						<div className="flex items-center gap-2 text-muted-foreground/60">
							<LinkIcon className="w-4 h-4" />
							<span className="text-[10px] font-black uppercase tracking-[0.2em]">出典 URL</span>
						</div>
						<Input
							type="url"
							placeholder="https://..."
							value={recipe.url || ""}
							onChange={e => setRecipe({ ...recipe, url: e.target.value })}
							className="h-16 rounded-[1.5rem] bg-muted/20 border-transparent px-6 font-bold text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/20 hover:bg-muted/30 transition-all"
						/>
					</div>

					<div className="space-y-4">
						<div className="flex items-center gap-2 text-muted-foreground/60">
							<NotepadText className="w-4 h-4" />
							<span className="text-[10px] font-black uppercase tracking-[0.2em]">メモ / コツ</span>
						</div>
						<Textarea
							rows={4}
							value={recipe.notes || ""}
							onChange={e => setRecipe({ ...recipe, notes: e.target.value })}
							className="rounded-[2rem] p-8 bg-muted/20 border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 text-base font-medium leading-relaxed placeholder:text-muted-foreground/10 resize-none shadow-inner hover:bg-muted/30 transition-all italic"
							placeholder="味付けは薄めがおすすめ..."
						/>
					</div>
				</section>

				{/* Fixed Bottom UI (Thumb Zone) */}
				<div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-background/80 backdrop-blur-3xl border-t border-border/20 z-50">
					<div className="max-w-2xl mx-auto grid grid-cols-2 gap-4">
						<Button
							type="button"
							variant="outline"
							onClick={onCancel}
							className="h-16 rounded-full font-black tracking-widest text-muted-foreground border-border/40 hover:bg-muted"
						>
							キャンセル
						</Button>
						<Button
							type="submit"
							className="h-16 rounded-full font-black tracking-[0.2em] text-lg shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all active:scale-95 group"
						>
							<Save className="w-5 h-5 mr-3 group-hover:animate-bounce" />
							保存する
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
}
