// Достаёт текст из загруженного файла по типу (PDF / TXT / MD).
export async function extractText(
  filename: string,
  mimeType: string,
  buffer: Buffer,
): Promise<string> {
  const name = (filename || '').toLowerCase();
  const isPdf = mimeType === 'application/pdf' || name.endsWith('.pdf');

  if (isPdf) {
    // Импортируем сам парсер напрямую (минуя index.js пакета — у него есть
    // баг с чтением тестового файла при require).
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default as any;
    const data = await pdfParse(buffer);
    return data.text || '';
  }

  // .txt / .md / прочий текст.
  return buffer.toString('utf-8');
}
