import { prisma } from '@/lib/prisma';
import { corsHeaders } from '@/lib/cors';

export const runtime = 'nodejs';

// Публичный конфиг бота для виджета: только тема и приветствие (без документов).
// CORS открыт — виджет запрашивает это с чужого домена.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const bot = await prisma.bot.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, accentColor: true, welcomeMessage: true },
  });
  if (!bot) {
    return new Response(JSON.stringify({ error: 'not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  return new Response(JSON.stringify(bot), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
