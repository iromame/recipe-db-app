import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Send, Utensils, Sparkles, Loader2, RefreshCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkBreaks from "remark-breaks";

interface ChatProps {
	onSelectRecipe: (id: string) => void;
}

export function Chat({ onSelectRecipe }: ChatProps) {
	const { messages, addMessage, clearMessages } = useChatStore();
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const endOfMessagesRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom
	useEffect(() => {
		endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isLoading]);

	const handleSend = async () => {
		if (!input.trim() || isLoading) return;

		const userText = input.trim();
		setInput("");
		
		const newUserMsg = {
			id: crypto.randomUUID(),
			role: "user" as const,
			content: userText,
			timestamp: Date.now()
		};

		addMessage(newUserMsg);
		setIsLoading(true);

		try {
			// We send the entire history plus the new user message to the API
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: [...messages, newUserMsg] }),
			});
			
			if (!res.ok) throw new Error("API Error");
			const data = await res.json();
			
			addMessage({
				id: crypto.randomUUID(),
				role: "assistant",
				content: data.response || "ごめんなさい、エラーが発生しました。",
				timestamp: Date.now()
			});
		} catch (error) {
			console.error(error);
			addMessage({
				id: crypto.randomUUID(),
				role: "assistant",
				content: "通信エラーが発生しました。もう一度試してください。",
				timestamp: Date.now()
			});
		} finally {
			setIsLoading(false);
		}
	};

	const markdownComponents: Components = {
		p: ({ children }) => <span className="block mb-2.5 last:mb-0 leading-relaxed">{children}</span>,
		ul: ({ children }) => <ul className="list-disc list-inside mb-2.5 space-y-1.5 leading-relaxed">{children}</ul>,
		ol: ({ children }) => <ol className="list-decimal list-inside mb-2.5 space-y-1.5 leading-relaxed">{children}</ol>,
		li: ({ children }) => <li className="mb-1 ml-1 pl-0.5">{children}</li>,
		h1: ({ children }) => <h1 className="text-base font-bold mt-4 mb-2">{children}</h1>,
		h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-1.5">{children}</h2>,
		h3: ({ children }) => <h3 className="text-sm font-semibold mt-2.5 mb-1">{children}</h3>,
		strong: ({ children }) => <strong className="font-bold">{children}</strong>,
		a: ({ href, children }) => {
			if (!children) return <a href={href} className="text-primary underline hover:text-primary/80" target="_blank" rel="noreferrer">{children}</a>;
			
			const text = Array.isArray(children) ? children.join('') : String(children);
			if (text.startsWith("Recipe:")) {
				const recipeName = text.replace("Recipe:", "");
				return (
					<button
						onClick={() => href && onSelectRecipe(href)}
						className="inline-flex items-center gap-1.5 px-3 py-1 my-0.5 mx-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm transition-colors active:scale-95 border border-primary/20 shadow-sm align-middle"
					>
						<Utensils className="w-3.5 h-3.5 shrink-0" />
						<span className="truncate max-w-[150px] sm:max-w-xs">{recipeName}</span>
					</button>
				);
			}
			return <a href={href} className="text-primary underline hover:text-primary/80" target="_blank" rel="noreferrer">{children}</a>;
		}
	};

	return (
		<div className="flex flex-col h-[calc(100dvh-12rem)] md:h-[calc(100dvh-13rem)] relative rounded-[2rem] bg-card border border-border/40 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-500">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-border/40 bg-muted/20 backdrop-blur-md">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
						<Sparkles className="w-4 h-4 text-primary" />
					</div>
					<h2 className="font-black text-lg tracking-tight">AIアシスタント</h2>
				</div>
                {messages.length > 0 && (
                    <button 
                        onClick={clearMessages}
                        className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                        title="履歴をクリア"
                    >
                        <RefreshCcw className="w-4 h-4" />
                    </button>
                )}
			</div>

			{/* Chat Area */}
			<div className="flex-1 overflow-y-auto p-4 space-y-6">
				{messages.length === 0 ? (
					<div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-muted-foreground p-6">
						<div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
							<Sparkles className="w-8 h-8 text-primary/40" />
						</div>
						<div className="space-y-2">
							<p className="font-bold text-foreground">何でも聞いてください！</p>
							<p className="text-sm">「最近作った料理は？」<br/>「暑い日におすすめのレシピは？」</p>
						</div>
					</div>
				) : (
					messages.map((msg) => (
						<div
							key={msg.id}
							className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
						>
							<div
								className={`max-w-[85%] rounded-2xl p-4 ${
									msg.role === "user"
										? "bg-primary text-primary-foreground rounded-tr-sm"
										: "bg-muted/50 border border-border/40 text-foreground rounded-tl-sm shadow-sm"
								}`}
							>
								{msg.role === "assistant" && (
									<div className="flex items-center gap-2 mb-2 opacity-60">
										<Sparkles className="w-3.5 h-3.5" />
										<span className="text-[10px] font-bold uppercase tracking-wider">AI Assistant</span>
									</div>
								)}
								<div className={`text-sm leading-relaxed break-words ${msg.role === "user" ? "whitespace-pre-wrap" : "whitespace-normal"}`}>
									{msg.role === "assistant" ? (
										<ReactMarkdown components={markdownComponents} remarkPlugins={[remarkBreaks]}>
											{msg.content}
										</ReactMarkdown>
									) : (
										msg.content
									)}
								</div>
							</div>
						</div>
					))
				)}
				
				{isLoading && (
					<div className="flex justify-start">
						<div className="max-w-[85%] rounded-2xl rounded-tl-sm p-4 bg-muted/50 border border-border/40 shadow-sm flex items-center gap-3">
							<Loader2 className="w-4 h-4 animate-spin text-primary" />
							<span className="text-sm font-bold text-muted-foreground animate-pulse">考え中...</span>
						</div>
					</div>
				)}
				<div ref={endOfMessagesRef} />
			</div>

			{/* Input Area */}
			<div className="p-3 bg-background border-t border-border/40 pb- safe">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleSend();
					}}
					className="flex items-center gap-2"
				>
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="何かお手伝いしますか？..."
						className="flex-1 h-12 rounded-full bg-muted/50 border-transparent px-5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
						disabled={isLoading}
					/>
					<button
						type="submit"
						disabled={!input.trim() || isLoading}
						className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:active:scale-100 active:scale-95 transition-all shadow-sm"
					>
						<Send className="w-5 h-5 ml-0.5" />
					</button>
				</form>
			</div>
		</div>
	);
}
