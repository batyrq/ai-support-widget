// Разбиение текста на чанки для RAG: режем по абзацам/предложениям и склеиваем
// в куски ~900 символов с перекрытием 150 — чтобы мысль на границе не потерялась.
// Простой предсказуемый алгоритм без токенайзеров — легко чинить под клиента.
export function chunkText(text: string, chunkSize = 900, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n\s*\n/);
  const pieces: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= chunkSize) {
      pieces.push(p.trim());
    } else {
      const sentences = p.split(/(?<=[.!?。])\s+/);
      let buf = '';
      for (const s of sentences) {
        if ((buf + ' ' + s).length > chunkSize && buf) {
          pieces.push(buf.trim());
          buf = s;
        } else {
          buf = buf ? `${buf} ${s}` : s;
        }
      }
      if (buf.trim()) pieces.push(buf.trim());
    }
  }

  const chunks: string[] = [];
  let current = '';
  for (const piece of pieces) {
    if ((current + '\n\n' + piece).length > chunkSize && current) {
      chunks.push(current.trim());
      const tail = current.slice(-overlap);
      current = `${tail}\n\n${piece}`;
    } else {
      current = current ? `${current}\n\n${piece}` : piece;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.filter((c) => c.length > 0);
}
