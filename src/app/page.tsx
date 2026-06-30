'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Bot {
  id: string;
  name: string;
  accentColor: string;
  _count?: { documents: number; conversations: number; chunks: number };
}

export default function Home() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    const res = await fetch('/api/bots');
    setBots(await res.json());
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    await fetch('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setName('');
    setCreating(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Удалить бота со всей базой знаний?')) return;
    await fetch(`/api/bots/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">AI Support Widget</h1>
        <p className="text-sm text-slate-500">
          Создайте бота, загрузите доки, вставьте виджет на сайт одной строкой.
        </p>
        <Link
          href="/demo"
          className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
        >
          → Посмотреть демо-сайт с встроенным виджетом
        </Link>
      </header>

      <form
        onSubmit={create}
        className="mb-8 flex gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <input
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          placeholder="Название бота (напр. «Поддержка Acme»)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          disabled={creating}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {creating ? '...' : 'Создать бота'}
        </button>
      </form>

      {loading ? (
        <p className="text-slate-400">Загрузка…</p>
      ) : bots.length === 0 ? (
        <p className="text-slate-400">Пока нет ботов. Создайте первого 👆</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bots.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
            >
              <Link href={`/bots/${b.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: b.accentColor }}
                  />
                  <span className="truncate font-medium">{b.name}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  📄 {b._count?.documents ?? 0} док · 💬{' '}
                  {b._count?.conversations ?? 0} диалогов
                </p>
              </Link>
              <button
                onClick={() => remove(b.id)}
                className="ml-2 text-slate-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
