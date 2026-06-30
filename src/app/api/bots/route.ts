import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/bots — список ботов с количеством документов и диалогов.
export async function GET() {
  const bots = await prisma.bot.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { documents: true, conversations: true, chunks: true } },
    },
  });
  return NextResponse.json(bots);
}

// POST /api/bots — создать бота.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = (body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Нужно имя бота' }, { status: 400 });
  }
  const bot = await prisma.bot.create({
    data: {
      name,
      ...(body.systemPrompt ? { systemPrompt: body.systemPrompt } : {}),
      ...(body.accentColor ? { accentColor: body.accentColor } : {}),
      ...(body.welcomeMessage ? { welcomeMessage: body.welcomeMessage } : {}),
    },
  });
  return NextResponse.json(bot, { status: 201 });
}
