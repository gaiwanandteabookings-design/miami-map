import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const Schema = z.object({ phone: z.string().min(6), code: z.string().min(4) });

// Заглушка проверки кода. В деве принимается 000000.
// Прод: сверка через провайдера, TODO.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  if (process.env.NODE_ENV !== 'production' && parsed.data.code !== '000000') {
    return NextResponse.json({ error: 'wrong code' }, { status: 401 });
  }

  const user = await prisma.user.upsert({
    where: { phone: parsed.data.phone },
    update: { phoneVerifiedAt: new Date() },
    create: { phone: parsed.data.phone, phoneVerifiedAt: new Date() },
  });

  return NextResponse.json({ userId: user.id });
}
