"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Send, LogOut } from "lucide-react";

export default function SocratiQChat() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // 1. Add user message to UI immediately
    const userMessage = { id: Date.now().toString(), role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // 2. Send messages to our own API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();
      
      // 3. Add AI response to UI
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + "a", role: "assistant", content: data.reply },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col p-4">
        <h1 className="text-xl font-bold mb-8 text-blue-500">SocratiQ</h1>
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Recent Chats</p>
        </div>
        
        <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {session?.user?.image && <img src={session.user.image} className="w-8 h-8 rounded-full" alt="Profile" />}
            <span className="text-sm truncate max-w-[100px]">{session?.user?.name}</span>
          </div>
          <button onClick={() => signOut()} className="text-gray-500 hover:text-red-400">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <h2 className="text-2xl font-semibold mb-2">What are we learning today?</h2>
              <p className="text-gray-400 max-w-sm">Ask me a question, and I'll help you find the answer through logic and reasoning.</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl ${m.role === 'user' ? 'bg-blue-600' : 'bg-gray-800 border border-gray-700'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-4 rounded-2xl bg-gray-800 border border-gray-700 text-gray-400">
                SocratiQ is thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-6 bg-gray-950">
          <div className="max-w-3xl mx-auto relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl py-4 px-6 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
            />
            <button 
              type="submit" 
              disabled={isLoading}
              className="absolute right-3 top-3 p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:hover:bg-blue-600"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}