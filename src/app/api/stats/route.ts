import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [uniqueVisitors30d, uniqueVisitorsAllTime, totalVisits, businesses, activeClaims] =
    await Promise.all([
      prisma.visit
        .findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, distinct: ['sessionHash'], select: { sessionHash: true } })
        .then((r) => r.length),
      prisma.visit
        .findMany({ distinct: ['sessionHash'], select: { sessionHash: true } })
        .then((r) => r.length),
      prisma.visit.count(),
      prisma.business.count(),
      prisma.claim.count({ where: { status: 'active' } }),
    ]);

  return NextResponse.json({
    uniqueVisitors30d,
    uniqueVisitorsAllTime,
    totalVisits,
    businesses,
    activeClaims,
  });
}
