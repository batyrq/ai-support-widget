// У подпути pdf-parse/lib/pdf-parse.js нет типов (@types/pdf-parse покрывает
// только основной вход). Объявляем модуль, чтобы tsc не падал.
declare module 'pdf-parse/lib/pdf-parse.js' {
  const pdfParse: (buffer: Buffer) => Promise<{ text: string }>;
  export default pdfParse;
}
