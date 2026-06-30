// BYOK в дашборде: Groq-ключ хранится ТОЛЬКО в браузере (localStorage) и
// уходит на сервер лишь в заголовке x-groq-key при тестовом чате. На сервере
// не сохраняется.
const KEY = 'asw_groq_key';

export function getGroqKey(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(KEY) || '';
}
export function setGroqKey(v: string) {
  window.localStorage.setItem(KEY, v.trim());
}
export function clearGroqKey() {
  window.localStorage.removeItem(KEY);
}
