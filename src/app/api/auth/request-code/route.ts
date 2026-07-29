import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const Schema = z.object({ phone: z.string().min(6) });

// Регистрация должна занимать меньше двух минут: телефон, код. См. ТЗ раздел 3.
// Заглушка — реальная отправка SMS подключается через провайдера (Twilio Verify и т.п.)
// по SMS_PROVIDER_API_KEY из .env.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid phone' }, { status: 400 });
  }

  // TODO: интеграция с SMS-провайдером.
  return NextResponse.json({ ok: true, devHint: 'В деве код всегда 000000' });
}
