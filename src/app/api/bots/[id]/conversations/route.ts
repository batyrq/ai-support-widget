import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/bots/:id/conversations — логи диалогов бота (для дашборда).
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const conversations = await prisma.conversation.findMany({
    where: { botId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  return NextResponse.json(conversations);
}
