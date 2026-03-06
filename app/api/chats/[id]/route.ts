import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE A CHAT
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.chat.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
  }
}

// RENAME A CHAT
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { title } = await req.json();
    
    const updatedChat = await prisma.chat.update({
      where: { id },
      data: { title },
    });
    return NextResponse.json({ chat: updatedChat });
  } catch (error) {
    console.error("Rename error:", error);
    return NextResponse.json({ error: "Failed to rename chat" }, { status: 500 });
  }
}