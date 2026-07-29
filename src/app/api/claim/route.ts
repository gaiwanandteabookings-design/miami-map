import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  latLngToCell,
  zoneForDistance,
  distanceMeters,
  MIAMI_DOWNTOWN,
  ZONE_PRICE_USD_MONTH,
  type CellSize,
} from '@/lib/grid';

const ClaimSchema = z.object({
  ownerId: z.string(),
  lat: z.number(),
  lng: z.number(),
  sizeM: z.union([z.literal(100), z.literal(200), z.literal(400)]),
  categoryId: z.string(),
  layer: z.enum(['place', 'service_area']),
  name: z.string().min(1),
  phone: z.string().min(1),
  about: z.string().optional(),
  serviceRadiusM: z.number().optional(),
});

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, '-')
      .replace(/^-+|-+$/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 6)
  );
}

// Занять клетку. Правило "одна клетка — одна услуга — один владелец"
// закреплено в БД частичным unique индексом (sql/partial_unique_index.sql),
// поэтому конфликт категории ловится через P2002.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ClaimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const sizeM = data.sizeM as CellSize;

  const cellIdx = latLngToCell(data.lat, data.lng, sizeM);
  const meters = distanceMeters(MIAMI_DOWNTOWN, { lat: data.lat, lng: data.lng });
  const zone = zoneForDistance(meters);
  const priceUsdMonth = ZONE_PRICE_USD_MONTH[zone];

  const cell = await prisma.cell.upsert({
    where: { cellX_cellY_sizeM: { cellX: cellIdx.cellX, cellY: cellIdx.cellY, sizeM } },
    update: {},
    create: { cellX: cellIdx.cellX, cellY: cellIdx.cellY, sizeM, zone, priceUsdMonth },
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          ownerId: data.ownerId,
          name: data.name,
          slug: slugify(data.name),
          categoryId: data.categoryId,
          layer: data.layer,
          lat: data.lat,
          lng: data.lng,
          serviceRadiusM: data.layer === 'service_area' ? data.serviceRadiusM : null,
          phone: data.phone,
          about: data.about,
        },
      });

      const now = new Date();
      const expires = new Date(now);
      expires.setMonth(expires.getMonth() + 1);

      const claim = await tx.claim.create({
        data: {
          cellId: cell.id,
          businessId: business.id,
          categoryId: data.categoryId,
          status: 'pending_payment',
          startsAt: now,
          expiresAt: expires,
        },
      });

      return { business, claim };
    });

    return NextResponse.json({
      business: result.business,
      claim: result.claim,
      cellCode: cell.id,
      priceUsdMonth,
      nextStep: 'stripe_checkout',
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'P2002') {
      return NextResponse.json(
        { error: 'Эта категория в этой клетке уже занята другим бизнесом' },
        { status: 409 },
      );
    }
    throw err;
  }
}
