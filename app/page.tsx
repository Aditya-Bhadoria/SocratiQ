"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { Send, LogOut, MessageSquare, PlusCircle, Trash2, Edit2, Check, X, Paperclip, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

type Message = { id: string; role: string; content: string; imageUrl?: string | null };
type Chat = { id: string; title: string; messages: Message[] };

export default function SocratiQChat() {
  const { data: session, status } = useSession();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  
  // Image & Drag State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user?.email) fetchChats();
  }, [session]);

  const fetchChats = async () => {
    if (!session?.user?.email) return;
    try {
      const res = await fetch(`/api/chats?email=${session.user.email}`);
      const data = await res.json();
      if (data.chats) setChats(data.chats);
    } catch (error) {
      console.error("Failed to load chats", error);
    }
  };

  // --- IMAGE HANDLING ---
  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      alert("Please upload an image file.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const clearAllChats = async () => {
    if (!session?.user?.email) return;
    if (!confirm("Are you absolutely sure you want to delete ALL your chat history? This cannot be undone.")) return;
    try {
      await fetch(`/api/chats?email=${session.user.email}`, { method: 'DELETE' });
      setChats([]); 
      setCurrentChatId(null);
      setMessages([]);
    } catch (error) {
      console.error("Failed to clear chats", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedImage) return; 
    if (isLoading) return;

    const currentImage = selectedImage; 
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input, imageUrl: currentImage };
    
    setMessages([...messages, userMessage]);
    setInput("");
    setSelectedImage(null); 
    setIsLoading(true);

    try {
      // 1. Strip the massive image strings out of the history to prevent 4MB payload crashes!
      const cleanHistory = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: cleanHistory, // Send the lightweight history
          userEmail: session?.user?.email,
          chatId: currentChatId,
          imageBase64: currentImage // Send the new image directly
        }),
      });

      const data = await response.json();
      
      setMessages((prev) => [...prev, { id: Date.now().toString() + "a", role: "assistant", content: data.reply }]);

      if (data.chatId && !currentChatId) {
        setCurrentChatId(data.chatId);
        fetchChats(); 
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Chat management functions
  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat?")) return;
    await fetch(`/api/chats/${id}`, { method: 'DELETE' });
    setChats(chats.filter(c => c.id !== id));
    if (currentChatId === id) { setCurrentChatId(null); setMessages([]); }
  };

  const startRename = (chat: Chat, e: React.MouseEvent) => { e.stopPropagation(); setEditingId(chat.id); setEditTitle(chat.title); };

  const saveRename = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editTitle.trim()) return setEditingId(null);
    await fetch(`/api/chats/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editTitle }) });
    setChats(chats.map(c => c.id === id ? { ...c, title: editTitle } : c));
    setEditingId(null);
  };

  const loadChat = (chat: Chat) => { setCurrentChatId(chat.id); setMessages(chat.messages); setEditingId(null); setSelectedImage(null); };

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Loading...</div>;
  if (!session) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
      <h1 className="text-4xl font-bold mb-4">SocratiQ</h1>
      <Link href="/login" className="bg-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">Go to Login</Link>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col p-4">
        <h1 className="text-xl font-bold mb-6 text-blue-500">SocratiQ</h1>
        <button onClick={() => { setCurrentChatId(null); setMessages([]); setSelectedImage(null); }} className="w-full flex items-center gap-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 py-2 px-3 rounded-lg mb-6 transition">
          <PlusCircle size={18} /> New Chat
        </button>
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="flex items-center justify-between mb-4 pr-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Chats</p>
            {chats.length > 0 && (
              <button onClick={clearAllChats} className="text-gray-500 hover:text-red-400 transition" title="Clear all history">
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <div className="space-y-2">
            {chats.map(chat => (
              <div key={chat.id} className={`group relative flex items-center rounded-lg transition ${currentChatId === chat.id ? 'bg-gray-800' : 'hover:bg-gray-800/50'}`}>
                {editingId === chat.id ? (
                  <div className="flex w-full items-center gap-2 p-2">
                    <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-gray-950 text-sm text-white border border-gray-700 rounded px-2 py-1 focus:outline-none" />
                    <button onClick={(e) => saveRename(chat.id, e)} className="text-green-500 hover:text-green-400"><Check size={16} /></button>
                    <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-400"><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => loadChat(chat)} className="flex-1 flex items-center gap-3 p-3 text-sm text-left truncate text-gray-400 group-hover:text-gray-200">
                      <MessageSquare size={16} className="shrink-0" />
                      <span className="truncate pr-12">{chat.title}</span>
                    </button>
                    <div className="absolute right-2 hidden group-hover:flex items-center gap-2">
                      <button onClick={(e) => startRename(chat, e)} className="text-gray-500 hover:text-blue-400"><Edit2 size={14} /></button>
                      <button onClick={(e) => deleteChat(chat.id, e)} className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="pt-4 border-t border-gray-800 flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            {session.user?.image && <img src={session.user.image} className="w-8 h-8 rounded-full" alt="Profile" />}
            <span className="text-sm truncate max-w-[100px]">{session.user?.name}</span>
          </div>
          <button onClick={() => signOut()} className="text-gray-500 hover:text-red-400"><LogOut size={18} /></button>
        </div>
      </div>

      {/* Main Chat Area - WITH DRAG AND DROP */}
      <div 
        className="flex-1 flex flex-col relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-blue-500/10 border-4 border-dashed border-blue-500 flex flex-col items-center justify-center backdrop-blur-sm">
            <ImageIcon size={64} className="text-blue-500 mb-4 animate-bounce" />
            <h2 className="text-3xl font-bold text-blue-500">Drop image here</h2>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-40">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <h2 className="text-2xl font-semibold mb-2">What are we learning today?</h2>
              <p className="text-gray-400 max-w-sm">Upload a screenshot of a problem, or ask a question directly.</p>
            </div>
          )}
          {messages.map((m) => (
             <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[80%] p-4 rounded-2xl ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-200'}`}>
                 {m.imageUrl && (
                   <img src={m.imageUrl} alt="Uploaded attachment" className="max-w-md rounded-lg mb-3 border border-white/20 shadow-lg" />
                 )}
                 {m.role === 'user' ? (
                   <span className="whitespace-pre-wrap">{m.content}</span>
                 ) : (
                   <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 prose-a:text-blue-400">
                     <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{m.content}</ReactMarkdown>
                   </div>
                 )}
               </div>
             </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-4 rounded-2xl bg-gray-800 border border-gray-700 text-gray-400">SocratiQ is thinking...</div>
            </div>
          )}
        </div>

        {/* Input Bar with Image Preview */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
          <div className="max-w-3xl mx-auto">
            
            {/* Image Preview Window */}
            {selectedImage && (
              <div className="mb-3 relative inline-block">
                <img src={selectedImage} alt="Preview" className="h-24 w-auto rounded-lg border-2 border-blue-500 object-cover shadow-lg" />
                <button onClick={() => setSelectedImage(null)} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition shadow-lg">
                  <X size={14} />
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="relative flex items-center gap-2 shadow-xl">
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
              />
              
              <div className="relative flex-1">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute left-4 top-[18px] text-gray-400 hover:text-blue-400 transition"
                  title="Upload image"
                >
                  <Paperclip size={20} />
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question or drag an image here..."
                  disabled={isLoading}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 pl-14 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50"
                />
                <button 
                  type="submit" 
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className="absolute right-3 top-3 p-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition disabled:opacity-50 disabled:hover:bg-blue-600"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}