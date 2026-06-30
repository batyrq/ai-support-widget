// Локальные эмбеддинги через @xenova/transformers (Transformers.js).
// Модель all-MiniLM-L6-v2 → вектор 384-d. Ключ не нужен, работает оффлайн
// после первой загрузки весов (~90 МБ) в кэш.

let extractorPromise: Promise<any> | null = null;

async function getExtractor(): Promise<any> {
  if (!extractorPromise) {
    const modelName = process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
    // Динамический import: пакет ESM-only и вынесен во внешние
    // (serverComponentsExternalPackages), поэтому грузим его в рантайме.
    extractorPromise = import('@xenova/transformers').then((mod: any) =>
      mod.pipeline('feature-extraction', modelName),
    );
  }
  return extractorPromise;
}

/** Эмбеддинг текста → number[] длины 384 (mean pooling + L2-нормализация). */
export async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

/** Сериализация вектора в литерал pgvector: '[0.1,0.2,...]'. */
export function toSqlVector(vec: number[]): string {
  return `[${vec.join(',')}]`;
}
