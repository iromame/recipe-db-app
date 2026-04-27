import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Send, Utensils, Sparkles, Loader2, RefreshCcw } from "lucide-react";
import React from "react";

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

	// Helper to parse text with [Recipe:Name](Id) into interactive chips
	const renderContent = (content: string) => {
		const parts: React.ReactNode[] = [];
		const regex = /\[Recipe:(.+?)\]\((.+?)\)/g;
		let lastIndex = 0;
		let match;

		while ((match = regex.exec(content)) !== null) {
			// Text before the match
			if (match.index > lastIndex) {
				parts.push(content.substring(lastIndex, match.index));
			}

			// Interactive Chip
			const recipeName = match[1];
			const recipeId = match[2];
			parts.push(
				<button
					key={`recipe-${match.index}`}
					onClick={() => onSelectRecipe(recipeId)}
					className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 mb-1 mx-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm transition-colors active:scale-95 border border-primary/20 shadow-sm"
				>
					<Utensils className="w-3.5 h-3.5" />
					<span className="truncate max-w-[150px] sm:max-w-xs">{recipeName}</span>
				</button>
			);

			lastIndex = regex.lastIndex;
		}

		// Remaining text
		if (lastIndex < content.length) {
			parts.push(content.substring(lastIndex));
		}

		return parts.map((part, i) => (
			<React.Fragment key={i}>
				{typeof part === "string"
					? part.split("\n").map((line, j) => (
							<React.Fragment key={`${i}-${j}`}>
								{line}
								{j !== part.split("\n").length - 1 && <br />}
							</React.Fragment>
					  ))
					: part}
			</React.Fragment>
		));
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
								<div className="text-sm leading-relaxed whitespace-pre-wrap">
									{msg.role === "assistant" ? renderContent(msg.content) : msg.content}
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
