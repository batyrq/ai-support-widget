import { prisma } from '@/lib/prisma';
import { search } from '@/lib/retrieval';
import { resolveGroqKey, isKeyValid, streamGroq, ChatMsg } from '@/lib/groq';
import { corsHeaders } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Preflight для кросс-доменных запросов виджета.
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/chat — RAG-ответ потоком (SSE).
 *
 * Конвейер: эмбеддинг вопроса → поиск top-k чанков в pgvector → промпт с
 * контекстом → стриминг ответа Groq токен за токеном → цитаты → сохранение
 * диалога. Ключ Groq берётся из заголовка x-groq-key (BYOK) или env-фоллбэка
 * и нигде не сохраняется/не логируется.
 *
 * SSE-события: token (кусок текста) · citations (источники) · done · error.
 */
export async function POST(req: Request) {
  const headerKey = req.headers.get('x-groq-key');
  const body = await req.json().catch(() => ({}) as any);
  const botId = String(body.botId || '');
  const message = String(body.message || '').trim();
  let conversationId: string | undefined = body.conversationId || undefined;
  const visitorId = body.visitorId ? String(body.visitorId) : null;

  const bot = botId
    ? await prisma.bot.findUnique({ where: { id: botId } })
    : null;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );

      try {
        if (!bot) {
          send('error', { message: 'Бот не найден' });
          controller.close();
          return;
        }
        if (!message) {
          send('error', { message: 'Пустое сообщение' });
          controller.close();
          return;
        }

        const apiKey = resolveGroqKey(headerKey);
        if (!isKeyValid(apiKey)) {
          send('error', {
            message:
              'Groq API key не задан. Введите ключ в дашборде (поле «Groq key») ' +
              'или задайте GROQ_API_KEY на сервере. Ключ не сохраняется на сервере.',
          });
          controller.close();
          return;
        }

        // 1) Поиск релевантных фрагментов в базе знаний бота.
        const found = await search(botId, message, 4);
        const citations = found.map((c, i) => ({
          index: i + 1,
          filename: c.filename,
          documentId: c.documentId,
          chunkId: c.id,
          chunkIndex: c.chunkIndex,
          score: c.score,
          snippet: c.content.slice(0, 280),
        }));

        const context =
          found.length > 0
            ? found
                .map((c, i) => `[${i + 1}] (источник: ${c.filename})\n${c.content}`)
                .join('\n\n')
            : 'База знаний пуста.';

        // 2) Промпт: характер бота + инструкция цитировать + контекст.
        const system =
          `${bot.systemPrompt}\n\n` +
          'Отвечай ТОЛЬКО на основе контекста ниже. Если используешь информацию ' +
          'из источника — ставь ссылку [1], [2] сразу после утверждения. ' +
          'Если ответа в контексте нет — честно скажи, что не знаешь.\n\n' +
          `Контекст:\n${context}`;

        // Немного истории для связности диалога.
        let history: ChatMsg[] = [];
        if (conversationId) {
          const prev = await prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: 6,
          });
          prev.reverse();
          history = prev.map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          }));
        }

        const messages: ChatMsg[] = [
          { role: 'system', content: system },
          ...history,
          { role: 'user', content: message },
        ];

        // 3) Стриминг ответа Groq.
        let answer = '';
        for await (const delta of streamGroq(apiKey, messages)) {
          answer += delta;
          send('token', { text: delta });
        }

        // 4) Цитаты.
        send('citations', citations);

        // 5) Сохранение диалога (для логов в дашборде).
        if (!conversationId) {
          const conv = await prisma.conversation.create({
            data: { botId, visitorId },
          });
          conversationId = conv.id;
        }
        await prisma.message.create({
          data: { conversationId, role: 'user', content: message },
        });
        const saved = await prisma.message.create({
          data: {
            conversationId,
            role: 'assistant',
            content: answer,
            meta: { citations } as any,
          },
        });

        send('done', { conversationId, messageId: saved.id });
        controller.close();
      } catch (err: any) {
        const m = String(err?.message || '');
        const hint = /api key|401|unauthor|invalid/i.test(m)
          ? 'Groq отклонил ключ. Проверьте Groq API key.'
          : m || 'Неизвестная ошибка';
        send('error', { message: hint });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      ...corsHeaders,
    },
  });
}
