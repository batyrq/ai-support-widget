/**
 * Seed: создаёт демо-бота «Acme Cloud» с парой документов, чтобы виджет и
 * демо-страница работали из коробки. Идемпотентен.
 *
 * Запуск: npm run seed
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { chunkText } from '../src/lib/chunking';
import { embed, toSqlVector } from '../src/lib/embeddings';

const prisma = new PrismaClient();

async function ingest(
  botId: string,
  filename: string,
  mimeType: string,
  text: string,
) {
  const chunks = chunkText(text);
  const doc = await prisma.document.create({
    data: { botId, filename, mimeType, chunkCount: chunks.length },
  });
  for (let i = 0; i < chunks.length; i++) {
    const vec = toSqlVector(await embed(chunks[i]));
    await prisma.$executeRaw`
      INSERT INTO "Chunk" ("id","botId","documentId","content","chunkIndex","embedding","createdAt")
      VALUES (${randomUUID()}, ${botId}, ${doc.id}, ${chunks[i]}, ${i}, ${vec}::vector, NOW())
    `;
  }
  console.log(`  • ${filename}: ${chunks.length} чанков`);
}

const DOC_PRICING = `Acme Cloud — тарифы

Free — $0/мес: 1 проект, 1 ГБ хранилища, поддержка по email.
Pro — $12/мес: 10 проектов, 50 ГБ хранилища, приоритетная поддержка.
Business — $49/мес: без лимитов на проекты и хранилище, SLA 99.9%, выделенный менеджер.

Оплата помесячно или раз в год (при годовой оплате — скидка 20%).
Сменить тариф можно в любой момент в настройках аккаунта.`;

const DOC_SUPPORT = `Acme Cloud — поддержка и возвраты

Часы работы поддержки: с понедельника по пятницу, с 9:00 до 18:00 по UTC.
Каналы: чат в правом нижнем углу сайта и email support@acme.example.

Возврат средств: полный возврат возможен в течение 14 дней с момента оплаты,
если вы остались недовольны. Для возврата напишите в поддержку с темой "Возврат".

Сброс пароля: на странице входа нажмите "Забыли пароль" — придёт письмо со ссылкой.
Данные хранятся в дата-центрах ЕС, ежедневные резервные копии включены на всех тарифах.`;

async function main() {
  console.log('Seed: старт...');

  const existing = await prisma.bot.findFirst({
    where: { name: 'Acme Cloud — поддержка' },
  });
  if (existing) {
    console.log('Демо-бот уже существует — пропускаю.');
    return;
  }

  const bot = await prisma.bot.create({
    data: {
      name: 'Acme Cloud — поддержка',
      accentColor: '#4f46e5',
      welcomeMessage:
        'Здравствуйте! Я бот поддержки Acme Cloud. Спросите про тарифы, ' +
        'возвраты или часы работы.',
      systemPrompt:
        'Ты — дружелюбный ассистент поддержки Acme Cloud. Отвечай кратко, ' +
        'по-русски, только по базе знаний и приводи ссылки [1], [2].',
    },
  });
  console.log(`Бот создан: ${bot.name} (id ${bot.id})`);

  console.log('Индексация документов (считаются эмбеддинги)...');
  await ingest(bot.id, 'pricing.md', 'text/markdown', DOC_PRICING);
  await ingest(bot.id, 'support.md', 'text/markdown', DOC_SUPPORT);

  console.log('Seed: готово ✓  Открой /demo, чтобы увидеть виджет на сайте.');
}

main()
  .catch((e) => {
    console.error('Seed упал:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
