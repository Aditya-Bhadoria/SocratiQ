import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fetch all chats for this user, including the messages inside them
    const chats = await prisma.chat.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: { 
        messages: { orderBy: { createdAt: 'asc' } } 
      }
    });

    return NextResponse.json({ chats });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
  }
}