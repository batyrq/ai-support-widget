import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/bots/:id — бот с документами и счётчиками.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const bot = await prisma.bot.findUnique({
    where: { id: params.id },
    include: {
      documents: { orderBy: { createdAt: 'desc' } },
      _count: { select: { documents: true, conversations: true, chunks: true } },
    },
  });
  if (!bot) return NextResponse.json({ error: 'Бот не найден' }, { status: 404 });
  return NextResponse.json(bot);
}

// PATCH /api/bots/:id — обновить настройки бота.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => ({}));
  const bot = await prisma.bot.update({
    where: { id: params.id },
    data: {
      name: body.name,
      systemPrompt: body.systemPrompt,
      accentColor: body.accentColor,
      welcomeMessage: body.welcomeMessage,
    },
  });
  return NextResponse.json(bot);
}

// DELETE /api/bots/:id — удалить бота (каскадом доки, чанки, диалоги).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  await prisma.bot.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
