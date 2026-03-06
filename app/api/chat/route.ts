import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    // We now accept an optional imageBase64 string from the frontend
    const { messages, userEmail, chatId, imageBase64 } = await req.json();
    const apiKey = process.env.GOOGLE_GENERATION_AI_API_KEY;

    if (!apiKey) return NextResponse.json({ reply: "API key missing." }, { status: 500 });
    if (!userEmail) return NextResponse.json({ reply: "Please log in." }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ reply: "User not found." }, { status: 404 });

    let currentChatId = chatId;
    const lastUserMessage = messages[messages.length - 1].content;

    if (!currentChatId) {
      const newChat = await prisma.chat.create({
        data: { userId: user.id, title: lastUserMessage.substring(0, 30) + "..." }
      });
      currentChatId = newChat.id;
    }

    // Save User's message AND the image to the database
    await prisma.message.create({
      data: { 
        chatId: currentChatId, 
        role: "user", 
        content: lastUserMessage,
        imageUrl: imageBase64 || null // <-- Saves the image!
      }
    });

    // Format for Gemini
    const geminiMessages = messages.map((m: any, index: number) => {
      // FIX: Gemini API crashes if text is entirely empty, so we default to a space
      const parts: any[] = [{ text: m.content || " " }]; 
      
      if (index === messages.length - 1 && imageBase64) {
        const matches = imageBase64.match(/^data:(image\/[a-z]+);base64,(.+)$/i);
        if (matches && matches.length === 3) {
          parts.push({
            inlineData: { mimeType: matches[1], data: matches[2] }
          });
        }
      }
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { 
          parts: [{
              text: `You are SocratiQ, an empathetic and intelligent Socratic tutor. Your primary goal is to guide students to answers using thought-provoking questions, but you must balance pedagogy with user experience.

              Strictly adhere to these rules:

              1. Pacing: Ask only ONE concise question at a time. Never overwhelm the student with multiple questions in a single response.

              2. Validation: If the student gives a partially correct answer (like estimating the Earth's circumference at 40,000km), validate it enthusiastically, fill in the exact details, and gently expand on it. Do not string them along if they already grasp the core concept.

              3. The Escape Hatch: If the student explicitly states they are in a hurry, getting frustrated, or directly demands the final answer, instantly drop the Socratic method and provide a clear, concise, and direct answer.

              4. The 3-Question Limit: Never drag a single concept out for more than 2 or 3 back-and-forth exchanges. If they are struggling after 3 questions, just give them the answer with a kind explanation.`
            }
          ]
         },
        contents: geminiMessages,
        generationConfig: { temperature: 0.7 }
      }),
    });

    const data = await response.json();
    
    // GRACEFUL ERROR HANDLING
    if (!response.ok) {
      const errorMessage = data.error?.message || "";
      console.error("🔥 RAW GOOGLE ERROR:", JSON.stringify(data, null, 2));
      
      // Catch your personal rate limit
      if (errorMessage.toLowerCase().includes("quota") || response.status === 429) {
        return NextResponse.json({ 
          reply: "Whoa there! I'm processing a lot of thoughts right now and need a quick 60-second breather. Let's pause for a moment, and try asking me again in a minute!" 
        }, { status: 429 });
      }

      // Catch Google's global server overload
      if (errorMessage.toLowerCase().includes("high demand") || response.status === 503) {
        return NextResponse.json({ 
          reply: "My brain is experiencing a global traffic jam right now! Google's servers are super busy. Let's give it a couple of minutes and try again." 
        }, { status: 503 });
      }

      // Generic fallback
      return NextResponse.json({ 
        reply: `Oops, my circuits got crossed. (Error: ${errorMessage})` 
      }, { status: 500 });
    }

    const aiReply = data.candidates[0].content.parts[0].text;

    await prisma.message.create({
      data: { chatId: currentChatId, role: "assistant", content: aiReply }
    });

    return NextResponse.json({ reply: aiReply, chatId: currentChatId });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ reply: "An error occurred." }, { status: 500 });
  }
}