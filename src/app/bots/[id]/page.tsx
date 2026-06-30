'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { streamChat, Citation } from '@/lib/chatStream';
import { getGroqKey, setGroqKey } from '@/lib/settings';

interface DocItem {
  id: string;
  filename: string;
  chunkCount: number;
}
interface Bot {
  id: string;
  name: string;
  accentColor: string;
  welcomeMessage: string;
  documents: DocItem[];
  _count?: { documents: number; conversations: number; chunks: number };
}
interface Msg {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  streaming?: boolean;
}

export default function BotPage() {
  const { id } = useParams() as { id: string };
  const [bot, setBot] = useState<Bot | null>(null);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // preview chat
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const convRef = useRef<string | undefined>(undefined);

  async function loadBot() {
    const b = await fetch(`/api/bots/${id}`).then((r) => r.json());
    setBot(b);
    setDocs(b.documents || []);
  }

  useEffect(() => {
    loadBot();
    setKeyInput(getGroqKey());
    setOrigin(window.location.origin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const snippet = `<script src="${origin}/widget.js" data-bot-id="${id}"></script>`;

  function saveKey() {
    setGroqKey(keyInput);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 1500);
  }

  async function upload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append('botId', id);
    fd.append('file', file);
    await fetch('/api/documents', { method: 'POST', body: fd });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    loadBot();
  }

  async function removeDoc(docId: string) {
    await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
    loadBot();
  }

  function copySnippet() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    setMsgs((m) => [
      ...m,
      { role: 'user', content: text },
      { role: 'assistant', content: '', streaming: true },
    ]);

    const patchLast = (p: Partial<Msg>) =>
      setMsgs((m) => {
        const c = [...m];
        c[c.length - 1] = { ...c[c.length - 1], ...p };
        return c;
      });

    let acc = '';
    await streamChat(id, text, convRef.current, {
      onToken: (t) => {
        acc += t;
        patchLast({ content: acc });
      },
      onCitations: (c) => patchLast({ citations: c }),
      onDone: (info) => {
        convRef.current = info.conversationId;
        patchLast({ streaming: false });
        setBusy(false);
      },
      onError: (msg) => {
        patchLast({ content: acc || `⚠️ ${msg}`, streaming: false });
        setBusy(false);
      },
    });
  }

  if (!bot) return <main className="p-6 text-slate-400">Загрузка…</main>;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
        ← Все боты
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{bot.name}</h1>
      <p className="text-sm text-slate-500">
        📄 {bot._count?.documents ?? 0} док · 🧩 {bot._count?.chunks ?? 0} чанков
        · 💬 {bot._count?.conversations ?? 0} диалогов
      </p>

      {/* Groq key */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold">Groq API key (BYOK)</h2>
        <p className="mb-2 text-xs text-slate-500">
          Нужен для тестового чата ниже. Хранится только в этом браузере, на
          сервер уходит лишь в заголовке запроса и не сохраняется. Ключ:{' '}
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 hover:underline"
          >
            console.groq.com/keys
          </a>
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="gsk_..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <button
            onClick={saveKey}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            {keySaved ? 'Сохранено ✓' : 'Сохранить'}
          </button>
        </div>
      </section>

      {/* Embed snippet */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold">Код для вставки на сайт</h2>
        <p className="mb-2 text-xs text-slate-500">
          Вставьте перед <code>&lt;/body&gt;</code> на любом сайте — появится
          чат-пузырь в углу.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100">
            {snippet}
          </code>
          <button
            onClick={copySnippet}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            {copied ? 'Скопировано ✓' : 'Копировать'}
          </button>
        </div>
      </section>

      {/* Documents */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">База знаний</h2>
        <label className="mb-3 block cursor-pointer rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500 hover:border-indigo-400">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.markdown,.pdf,text/plain,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          {uploading
            ? 'Индексация… (чанкинг + эмбеддинги)'
            : '⬆ Загрузить документ (TXT / MD / PDF)'}
        </label>
        {docs.length === 0 ? (
          <p className="text-xs text-slate-400">Документов пока нет.</p>
        ) : (
          <ul className="space-y-1">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="truncate">
                  {d.filename}{' '}
                  <span className="text-xs text-slate-400">
                    ({d.chunkCount} чанков)
                  </span>
                </span>
                <button
                  onClick={() => removeDoc(d.id)}
                  className="text-slate-400 hover:text-red-500"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Preview chat */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Тестовый чат</h2>
        <div className="mb-3 max-h-72 space-y-2 overflow-y-auto">
          {msgs.length === 0 && (
            <p className="text-xs text-slate-400">
              Задайте вопрос — бот ответит по загруженным докам с цитатами.
            </p>
          )}
          {msgs.map((m, i) => (
            <div
              key={i}
              className={m.role === 'user' ? 'text-right' : 'text-left'}
            >
              <div
                className={
                  'inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm ' +
                  (m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-800')
                }
              >
                <span className="whitespace-pre-wrap">{m.content}</span>
                {m.streaming && <span className="animate-pulse">▋</span>}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-1 border-t border-slate-300 pt-1 text-[11px] text-slate-500">
                    {m.citations.map((c) => (
                      <span key={c.index} className="mr-2">
                        [{c.index}] {c.filename}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Спросите что-нибудь…"
            disabled={busy}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <button
            disabled={busy || !input.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? '…' : 'Отправить'}
          </button>
        </form>
      </section>

      <ConversationLogs botId={id} />
    </main>
  );
}

// Логи диалогов посетителей виджета.
function ConversationLogs({ botId }: { botId: string }) {
  const [convs, setConvs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const r = await fetch(`/api/bots/${botId}/conversations`).then((x) =>
      x.json(),
    );
    setConvs(r);
  }
  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm font-semibold"
      >
        Логи диалогов {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {convs.length === 0 ? (
            <p className="text-xs text-slate-400">Диалогов пока нет.</p>
          ) : (
            convs.map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                <p className="mb-1 text-[11px] text-slate-400">
                  {new Date(c.createdAt).toLocaleString()}
                </p>
                {c.messages.map((m: any) => (
                  <p key={m.id} className="text-sm">
                    <span
                      className={
                        m.role === 'user'
                          ? 'font-medium text-indigo-700'
                          : 'font-medium text-slate-600'
                      }
                    >
                      {m.role === 'user' ? 'Посетитель' : 'Бот'}:
                    </span>{' '}
                    {m.content}
                  </p>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
