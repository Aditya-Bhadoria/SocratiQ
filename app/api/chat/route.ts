import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.GOOGLE_GENERATION_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ reply: "Gemini API key missing in .env file." }, { status: 500 });
    }

    // Format your React messages into the exact structure Gemini requires
    const geminiMessages = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Make a direct web request to Google's Gemini REST API
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

    // IF GOOGLE REJECTS IT, SHOW THE EXACT ERROR IN THE CHAT
    if (!response.ok) {
      console.error("🔥 GEMINI API ERROR:", JSON.stringify(data, null, 2));
      return NextResponse.json({ 
        reply: `Google Error: ${data.error?.message || "Unknown error. Check VS Code terminal."}` 
      }, { status: 500 });
    }

    // Extract the AI's message and send it back to your React frontend
    const reply = data.candidates[0].content.parts[0].text;
    return NextResponse.json({ reply });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ reply: "An unexpected server error occurred." }, { status: 500 });
  }
}