import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Кабинет владельца. TODO: подключить реальную сессию вместо ?ownerId в query
// после того как появится полноценная авторизация по телефону.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { ownerId?: string };
}) {
  const ownerId = searchParams.ownerId;
  if (!ownerId) {
    return <p style={{ padding: 24 }}>Нет ownerId. Откройте /dashboard?ownerId=...</p>;
  }

  const businesses = await prisma.business.findMany({
    where: { ownerId },
    include: {
      claims: { orderBy: { startsAt: 'desc' }, take: 1 },
      events: true,
    },
  });

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <h1>Кабинет владельца</h1>
      {businesses.map((b) => {
        const impressions = b.events.filter((e) => e.type === 'card_open').length;
        const calls = b.events.filter((e) => e.type === 'call').length;
        const messages = b.events.filter((e) => e.type === 'message').length;
        const claim = b.claims[0];

        return (
          <div key={b.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <h2>{b.name}</h2>
            <p style={{ color: '#666' }}>
              Статус клетки: {claim?.status ?? 'нет'} · до{' '}
              {claim ? new Date(claim.expiresAt).toLocaleDateString('ru') : '—'}
            </p>
            <div style={{ display: 'flex', gap: 16 }}>
              <span>Открытия карточки: {impressions}</span>
              <span>Звонки: {calls}</span>
              <span>Сообщения: {messages}</span>
            </div>
            <a href={`/b/${b.slug}`}>Открыть карточку →</a>
          </div>
        );
      })}
      {businesses.length === 0 && <p>Пока нет занятых клеток.</p>}
    </div>
  );
}
