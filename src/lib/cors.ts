// Виджет встраивается на сторонние сайты и зовёт /api/chat с другого origin,
// поэтому чат-эндпоинт должен отдавать CORS-заголовки.
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-groq-key',
};
