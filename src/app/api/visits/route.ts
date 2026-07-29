import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/db';

// Анонимный визит карты. Без регистрации — клиенту она не нужна (ТЗ раздел 3),
// но владелец продукта должен видеть, сколько людей вообще открывает карту.
function sessionHash(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const ua = req.headers.get('user-agent') ?? 'unknown';
  return createHash('sha256').update(`${ip}:${ua}`).digest('hex').slice(0, 32);
}

export async function POST(req: NextRequest) {
  await prisma.visit.create({ data: { sessionHash: sessionHash(req) } });
  return NextResponse.json({ ok: true });
}
