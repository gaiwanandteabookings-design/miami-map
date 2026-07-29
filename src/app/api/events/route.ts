import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const EventSchema = z.object({
  businessId: z.string(),
  type: z.enum(['impression', 'card_open', 'call', 'message', 'route']),
});

function sessionHash(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const ua = req.headers.get('user-agent') ?? 'unknown';
  return createHash('sha256').update(`${ip}:${ua}`).digest('hex').slice(0, 32);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  await prisma.event.create({
    data: {
      businessId: parsed.data.businessId,
      type: parsed.data.type,
      sessionHash: sessionHash(req),
    },
  });

  return NextResponse.json({ ok: true });
}
