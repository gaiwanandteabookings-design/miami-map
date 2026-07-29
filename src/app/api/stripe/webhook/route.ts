import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';

// Платёж и есть проверка. См. ТЗ раздел 11.
export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig ?? '',
      process.env.STRIPE_WEBHOOK_SECRET ?? '',
    );
  } catch (err) {
    return NextResponse.json({ error: `bad signature: ${err}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const claimId = session.metadata?.claimId;
    if (claimId) {
      try {
        // Активация ловит нарушение "одна клетка - одна категория" через P2002,
        // если кто-то успел занять эту же категорию раньше.
        await prisma.claim.update({
          where: { id: claimId },
          data: { status: 'active' },
        });
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code === 'P2002') {
          await prisma.claim.update({ where: { id: claimId }, data: { status: 'expired' } });
          // TODO: инициировать возврат оплаты через stripe.refunds.create
        } else {
          throw err;
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
