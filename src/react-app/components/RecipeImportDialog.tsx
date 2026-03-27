import { useState } from "react";
import { api } from "../api";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Link as LinkIcon, Image as ImageIcon, FileText, Loader2, ArrowRight } from "lucide-react";

export function RecipeImportDialog({ children, onExtractionSuccess }: { children: React.ReactNode, onExtractionSuccess: (data: any) => void }) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"url" | "image" | "text">("url");
    const [loading, setLoading] = useState(false);

    const [url, setUrl] = useState("");
    const [text, setText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setFile(files[0]);
            setPreviewUrl(URL.createObjectURL(files[0]));
        }
    };

    const handleExtract = async () => {
        if (mode === "url" && !url) return alert("URLを入力してください");
        if (mode === "text" && !text) return alert("テキストを入力してください");
        if (mode === "image" && !file) return alert("画像を選択してください");

        setLoading(true);
        try {
            const formData = new FormData();
            if (mode === "url") formData.append("url", url);
            if (mode === "text") formData.append("text", text);
            if (mode === "image" && file) formData.append("file", file);

            const res = await api.extractRecipe(formData);
            if (res.success && res.data) {
                setOpen(false);
                onExtractionSuccess(res.data);
                // Reset state
                setUrl(""); setText(""); setFile(null); setPreviewUrl(null);
            } else {
                alert("抽出に失敗しました: " + (res as any).error);
            }
        } catch (e: any) {
            alert("抽出エラー: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                {children}
            </DrawerTrigger>
            <DrawerContent className="bg-background/95 backdrop-blur-3xl border-none shadow-2xl rounded-t-[3rem] max-h-[90vh]">
                <div className="mx-auto w-full max-w-lg p-6 pb-12 space-y-8 overflow-y-auto no-scrollbar">
                    <DrawerHeader className="px-0 relative">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-2xl -z-10" />
                        <DrawerTitle className="text-3xl font-black tracking-tighter flex items-center gap-3">
                            <Sparkles className="w-8 h-8 text-primary" />
                            AI レシピ取り込み
                        </DrawerTitle>
                        <DrawerDescription className="text-muted-foreground font-bold">
                            URL、画像、またはテキストからレシピ情報を自動抽出します。
                        </DrawerDescription>
                    </DrawerHeader>

                    <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-14 p-1.5 bg-muted/40 rounded-2xl border border-border/20 shadow-inner mb-6">
                            <TabsTrigger value="url" className="rounded-xl font-black text-xs transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md">
                                <LinkIcon className="w-4 h-4 mr-2" /> URL
                            </TabsTrigger>
                            <TabsTrigger value="image" className="rounded-xl font-black text-xs transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md">
                                <ImageIcon className="w-4 h-4 mr-2" /> 画像
                            </TabsTrigger>
                            <TabsTrigger value="text" className="rounded-xl font-black text-xs transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md">
                                <FileText className="w-4 h-4 mr-2" /> テキスト
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="url" className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                            <div className="bg-muted/20 p-6 rounded-3xl border border-border/40 shadow-inner">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 block">
                                    レシピのURL
                                </label>
                                <Input 
                                    type="url" 
                                    placeholder="https://..." 
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                    className="h-14 rounded-2xl bg-background border-border/40 font-bold px-4"
                                />
                                <p className="text-xs text-muted-foreground mt-4 font-bold opacity-80">
                                    対応サイトのURLを貼り付けてください。タイトル、材料、手順を自動で読み取ります。
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="image" className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                            <div className="bg-muted/20 p-6 rounded-3xl border border-border/40 shadow-inner">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 block">
                                    料理本やメモの写真
                                </label>
                                {previewUrl ? (
                                    <div className="relative aspect-video rounded-2xl overflow-hidden mb-4 border border-border/40">
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <Button variant="secondary" size="sm" onClick={() => { setFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 rounded-full shadow-lg">
                                            変更
                                        </Button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-primary/20 bg-primary/5 rounded-2xl cursor-pointer hover:bg-primary/10 transition-colors active:scale-95">
                                        <ImageIcon className="w-8 h-8 text-primary/60 mb-2" />
                                        <span className="text-sm font-bold text-primary">写真を選択 / 撮影</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                    </label>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="text" className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                            <div className="bg-muted/20 p-6 rounded-3xl border border-border/40 shadow-inner">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 block">
                                    レシピのテキスト
                                </label>
                                <Textarea 
                                    placeholder="材料：&#10;豚肉 200g&#10;...&#10;&#10;作り方：&#10;1. 炒める..."
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    className="min-h-[160px] rounded-2xl bg-background border-border/40 font-bold p-4 resize-none"
                                />
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DrawerFooter className="px-0 pt-4">
                        <Button 
                            onClick={handleExtract} 
                            disabled={loading || (mode === "url" && !url) || (mode === "image" && !file) || (mode === "text" && !text)}
                            className="h-16 rounded-[1.5rem] font-black tracking-widest text-lg shadow-xl shadow-primary/20 transition-all active:scale-95 relative overflow-hidden group"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                    抽出中...
                                </>
                            ) : (
                                <>
                                    内容を抽出する
                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                            {loading && <div className="absolute inset-0 bg-primary/20 animate-pulse" />}
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="ghost" className="h-12 rounded-xl font-bold text-muted-foreground mt-2" disabled={loading}>
                                キャンセル
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
