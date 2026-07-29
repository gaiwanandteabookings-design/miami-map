import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Общая статистика по всему проекту, а не по одному бизнесу.
// TODO: закрыть паролем/авторизацией перед реальным публичным запуском.
export default async function StatsPage() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [uniqueVisitors30d, uniqueVisitorsAllTime, totalVisits, businesses, activeClaims] =
    await Promise.all([
      prisma.visit
        .findMany({
          where: { createdAt: { gte: thirtyDaysAgo } },
          distinct: ['sessionHash'],
          select: { sessionHash: true },
        })
        .then((r) => r.length),
      prisma.visit.findMany({ distinct: ['sessionHash'], select: { sessionHash: true } }).then((r) => r.length),
      prisma.visit.count(),
      prisma.business.count(),
      prisma.claim.count({ where: { status: 'active' } }),
    ]);

  const rows = [
    ['Уникальных посетителей карты за 30 дней', uniqueVisitors30d],
    ['Уникальных посетителей карты всего', uniqueVisitorsAllTime],
    ['Всего открытий карты', totalVisits],
    ['Бизнесов на карте', businesses],
    ['Занятых клеток (активные подписки)', activeClaims],
  ] as const;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <h1>Статистика</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px 0', color: '#666' }}>{label}</td>
              <td style={{ padding: '10px 0', fontWeight: 700, textAlign: 'right' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
