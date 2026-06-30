import Groq from 'groq-sdk';

/**
 * BYOK: ключ берётся из заголовка x-groq-key (приоритет) или из серверного
 * env GROQ_API_KEY (опциональный фоллбэк). Нигде не сохраняется и не логируется.
 */
export function resolveGroqKey(headerKey?: string | null): string {
  const fromHeader = (headerKey || '').trim();
  const key = fromHeader || process.env.GROQ_API_KEY || '';
  return key;
}

export function isKeyValid(key: string): boolean {
  return key.length > 0 && !key.includes('replace');
}

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Стримящий вызов Groq. Возвращает async-итератор текстовых дельт. */
export async function* streamGroq(
  apiKey: string,
  messages: ChatMsg[],
): AsyncGenerator<string> {
  const client = new Groq({ apiKey });
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.3,
    stream: true,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}
