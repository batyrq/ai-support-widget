import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import WidgetEmbed from '@/components/WidgetEmbed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Демо: фейковый «сайт компании» с уже встроенным виджетом поддержки.
// Берём первого бота из БД (демо-бота из seed) и встраиваем его виджет.
export default async function DemoPage() {
  const bot = await prisma.bot.findFirst({ orderBy: { createdAt: 'asc' } });

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Шапка фейкового сайта */}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-5">
          <div className="flex items-center gap-2 text-lg font-bold">
            <span className="inline-block h-6 w-6 rounded bg-indigo-600" />
            Acme Cloud
          </div>
          <nav className="hidden gap-6 text-sm text-slate-600 sm:flex">
            <span>Продукт</span>
            <span>Тарифы</span>
            <span>Документация</span>
            <span>Контакты</span>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Облако для вашего бизнеса
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
          Запускайте проекты за минуты. Это демо-сайт «компании» — в правом
          нижнем углу уже работает встроенный AI-чат поддержки.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <span className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white">
            Начать бесплатно
          </span>
          <span className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm">
            Тарифы
          </span>
        </div>
        <p className="mt-6 text-sm text-slate-400">
          👉 Нажмите на 💬 в правом нижнем углу и спросите про тарифы или возврат.
        </p>
      </section>

      {/* Тарифы (контент, по которому отвечает бот) */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            ['Free', '$0', '1 проект · 1 ГБ'],
            ['Pro', '$12/мес', '10 проектов · 50 ГБ · приоритет'],
            ['Business', '$49/мес', 'без лимитов · SLA'],
          ].map(([n, p, d]) => (
            <div key={n} className="rounded-2xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold">{n}</h3>
              <p className="mt-1 text-2xl font-bold">{p}</p>
              <p className="mt-2 text-sm text-slate-500">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
        <Link href="/" className="text-indigo-600 hover:underline">
          ← Вернуться в дашборд
        </Link>
        <p className="mt-2">Acme Cloud — вымышленная компания для демонстрации.</p>
      </footer>

      {/* Встроенный виджет (или подсказка запустить seed) */}
      {bot ? (
        <WidgetEmbed botId={bot.id} />
      ) : (
        <div className="fixed bottom-5 right-5 max-w-xs rounded-lg bg-amber-100 p-3 text-xs text-amber-800">
          Нет ботов в БД. Запустите <code>npm run seed</code>, чтобы появился
          демо-бот и виджет.
        </div>
      )}
    </div>
  );
}
