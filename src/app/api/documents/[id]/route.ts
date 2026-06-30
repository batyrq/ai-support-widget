import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// DELETE /api/documents/:id — удалить документ (чанки уйдут каскадом).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  await prisma.document.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
