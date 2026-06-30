// Клиентский SSE-парсер для превью-чата в дашборде (виджет использует свою
// копию этой логики на чистом JS). Читаем поток через fetch + ReadableStream.
import { getGroqKey } from './settings';

export interface Citation {
  index: number;
  filename: string;
  score: number;
  snippet: string;
}

export interface ChatHandlers {
  onToken?: (text: string) => void;
  onCitations?: (c: Citation[]) => void;
  onDone?: (info: { conversationId?: string }) => void;
  onError?: (message: string) => void;
}

export async function streamChat(
  botId: string,
  message: string,
  conversationId: string | undefined,
  handlers: ChatHandlers,
) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-groq-key': getGroqKey(),
    },
    body: JSON.stringify({ botId, message, conversationId }),
  });

  if (!res.ok || !res.body) {
    handlers.onError?.(`Ошибка соединения (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      let event = 'message';
      const dataLines: string[] = [];
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) continue;
      let data: any = dataLines.join('\n');
      try {
        data = JSON.parse(data);
      } catch {
        /* keep string */
      }

      if (event === 'token') handlers.onToken?.(data.text ?? '');
      else if (event === 'citations') handlers.onCitations?.(data);
      else if (event === 'done') handlers.onDone?.(data);
      else if (event === 'error') handlers.onError?.(data.message ?? 'Ошибка');
    }
  }
}
