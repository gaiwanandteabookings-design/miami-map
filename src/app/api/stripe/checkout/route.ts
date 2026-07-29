import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';

const Schema = z.object({ claimId: z.string() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const claim = await prisma.claim.findUnique({
    where: { id: parsed.data.claimId },
    include: { cell: true, business: true },
  });
  if (!claim) return NextResponse.json({ error: 'claim not found' }, { status: 404 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: claim.cell.priceUsdMonth * 100,
          recurring: { interval: 'month' },
          product_data: { name: `Клетка для ${claim.business.name}` },
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/b/${claim.business.slug}?paid=1`,
    cancel_url: `${siteUrl}/claim/${claim.cellId}?canceled=1`,
    metadata: { claimId: claim.id },
  });

  return NextResponse.json({ url: session.url });
}
