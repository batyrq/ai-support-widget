import { randomUUID } from 'crypto';
import { prisma } from './prisma';
import { embed, toSqlVector } from './embeddings';

export interface RetrievedChunk {
  id: string;
  content: string;
  chunkIndex: number;
  documentId: string;
  filename: string;
  score: number; // косинусная близость [0..1]
}

/**
 * Векторный поиск по pgvector.
 * Храним эмбеддинги в Chunk.embedding (vector(384)). Prisma не сериализует
 * vector — поэтому здесь только raw SQL. Оператор `<=>` = косинусное РАССТОЯНИЕ
 * (0 = идентичны); близость = 1 - расстояние.
 */

/** Записать чанк вместе с эмбеддингом (raw SQL из-за типа vector). */
export async function insertChunk(params: {
  botId: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  embedding: number[];
}): Promise<void> {
  const vec = toSqlVector(params.embedding);
  await prisma.$executeRaw`
    INSERT INTO "Chunk" ("id", "botId", "documentId", "content", "chunkIndex", "embedding", "createdAt")
    VALUES (${randomUUID()}, ${params.botId}, ${params.documentId}, ${params.content}, ${params.chunkIndex}, ${vec}::vector, NOW())
  `;
}

/** Top-k чанков бота, ближайших к запросу. */
export async function search(
  botId: string,
  query: string,
  k = 4,
): Promise<RetrievedChunk[]> {
  const queryVec = toSqlVector(await embed(query));

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      content: string;
      chunkIndex: number;
      documentId: string;
      filename: string;
      distance: number;
    }>
  >`
    SELECT c."id", c."content", c."chunkIndex", c."documentId",
           d."filename" AS "filename",
           (c."embedding" <=> ${queryVec}::vector) AS "distance"
    FROM "Chunk" c
    JOIN "Document" d ON d."id" = c."documentId"
    WHERE c."botId" = ${botId} AND c."embedding" IS NOT NULL
    ORDER BY c."embedding" <=> ${queryVec}::vector
    LIMIT ${k}
  `;

  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    chunkIndex: r.chunkIndex,
    documentId: r.documentId,
    filename: r.filename,
    score: 1 - Number(r.distance),
  }));
}
