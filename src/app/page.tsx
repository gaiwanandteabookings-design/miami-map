import MapView from '@/components/MapView';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [businesses, categories] = await Promise.all([
    prisma.business.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        lat: true,
        lng: true,
        layer: true,
        categoryId: true,
        serviceRadiusM: true,
        createdAt: true,
        category: { select: { name: true, icon: true } },
      },
      take: 500,
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return <MapView businesses={businesses} categories={categories} />;
}
