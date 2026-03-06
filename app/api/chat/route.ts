import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    // We now expect the frontend to pass the userEmail and the current chatId
    const { messages, userEmail, chatId } = await req.json();
    const apiKey = process.env.GOOGLE_GENERATION_AI_API_KEY;

    if (!apiKey) return NextResponse.json({ reply: "API key missing." }, { status: 500 });
    if (!userEmail) return NextResponse.json({ reply: "Please log in to chat." }, { status: 401 });

    // 1. Verify the user exists in your Supabase DB
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ reply: "User not found." }, { status: 404 });

    // 2. Check if this is a brand new chat. If so, create a new row in the Chat table.
    let currentChatId = chatId;
    const lastUserMessage = messages[messages.length - 1].content;

    if (!currentChatId) {
      const newChat = await prisma.chat.create({
        data: {
          userId: user.id,
          title: lastUserMessage.substring(0, 30) + (lastUserMessage.length > 30 ? "..." : ""),
        }
      });
      currentChatId = newChat.id;
    }

    // 3. Save the User's exact message to the DB
    await prisma.message.create({
      data: { chatId: currentChatId, role: "user", content: lastUserMessage }
    });

    // 4. Send the conversation to Gemini 2.5 Flash
    const geminiMessages = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

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
    if (!response.ok) throw new Error("Gemini Error");

    const aiReply = data.candidates[0].content.parts[0].text;

    // 5. Save the AI's reply to the DB
    await prisma.message.create({
      data: { chatId: currentChatId, role: "assistant", content: aiReply }
    });

    // 6. Return the reply AND the chat ID so the frontend can lock onto this conversation
    return NextResponse.json({ reply: aiReply, chatId: currentChatId });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ reply: "An unexpected error occurred." }, { status: 500 });
  }
}