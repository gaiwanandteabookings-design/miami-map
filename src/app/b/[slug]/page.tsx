import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { isNew } from '@/lib/grid';
import TrackImpression from './TrackImpression';

export const dynamic = 'force-dynamic';

async function getBusiness(slug: string) {
  return prisma.business.findUnique({
    where: { slug },
    include: { category: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const business = await getBusiness(params.slug);
  if (!business) return {};
  return {
    title: `${business.name} — ${business.category.name} | Реестр клеток`,
    description: business.about ?? `${business.name}, ${business.category.name} в Майами`,
  };
}

export default async function BusinessPage({ params }: { params: { slug: string } }) {
  const business = await getBusiness(params.slug);
  if (!business) notFound();

  const photos = (business.photos as string[] | null) ?? [];

  return (
    <div className="business-card">
      <TrackImpression businessId={business.id} />
      <h1>
        {business.name}
        {isNew(business.createdAt) && <span className="badge-new">новое</span>}
        {business.verifiedAt && <span title="Проверено"> ✅</span>}
      </h1>
      <p style={{ color: '#666' }}>{business.category.name}</p>
      {business.about && <p>{business.about}</p>}

      {photos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '12px 0' }}>
          {photos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={business.name}
              style={{ height: 140, borderRadius: 8 }}
            />
          ))}
        </div>
      )}

      <div className="action-buttons">
        {business.phone && (
          <a href={`tel:${business.phone}`} data-track="call">
            Позвонить
          </a>
        )}
        {business.whatsapp && (
          <a href={`https://wa.me/${business.whatsapp}`} data-track="message">
            WhatsApp
          </a>
        )}
        {business.telegram && (
          <a href={`https://t.me/${business.telegram}`} data-track="message">
            Telegram
          </a>
        )}
        {business.layer === 'place' && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}`}
            data-track="route"
          >
            Маршрут
          </a>
        )}
      </div>

      {business.hours && (
        <div>
          <strong>Часы работы</strong>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(business.hours, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
