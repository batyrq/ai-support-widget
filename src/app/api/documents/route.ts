import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractText } from '@/lib/extract-text';
import { chunkText } from '@/lib/chunking';
import { embed } from '@/lib/embeddings';
import { insertChunk } from '@/lib/retrieval';

export const runtime = 'nodejs';
// Индексация может быть небыстрой (эмбеддинги) — не даём кэшировать.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// GET /api/documents?botId=... — список документов бота.
export async function GET(req: Request) {
  const botId = new URL(req.url).searchParams.get('botId');
  if (!botId) return NextResponse.json({ error: 'botId обязателен' }, { status: 400 });
  const docs = await prisma.document.findMany({
    where: { botId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(docs);
}

// POST /api/documents — multipart (botId, file).
// Полный конвейер: файл → текст → чанки → эмбеддинги → запись в pgvector.
export async function POST(req: Request) {
  const form = await req.formData();
  const botId = String(form.get('botId') || '');
  const file = form.get('file') as File | null;

  if (!botId) return NextResponse.json({ error: 'botId обязателен' }, { status: 400 });
  if (!file) return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });

  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot) return NextResponse.json({ error: 'Бот не найден' }, { status: 404 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractText(file.name, file.type, buffer);
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return NextResponse.json({ error: 'Документ пустой' }, { status: 400 });
  }

  const doc = await prisma.document.create({
    data: {
      botId,
      filename: file.name,
      mimeType: file.type || 'text/plain',
      chunkCount: chunks.length,
    },
  });

  // Для демо считаем эмбеддинги последовательно; под нагрузку — очередь.
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embed(chunks[i]);
    await insertChunk({
      botId,
      documentId: doc.id,
      content: chunks[i],
      chunkIndex: i,
      embedding,
    });
  }

  return NextResponse.json(doc, { status: 201 });
}
