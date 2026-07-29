import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Первый рынок: рестораны Майами и их подрядчики. См. ТЗ раздел 5.
const CATEGORIES = [
  { name: 'Ресторан', slug: 'restaurant', icon: '🍽️' },
  { name: 'Ремонт кухонного оборудования', slug: 'kitchen-equipment-repair', icon: '🔧' },
  { name: 'Холодильное оборудование', slug: 'refrigeration', icon: '❄️' },
  { name: 'Вентиляция и вытяжки', slug: 'hood-ventilation', icon: '🌀' },
  { name: 'Поставка продуктов', slug: 'food-supply', icon: '🚚' },
  { name: 'Вывоз отработанного масла', slug: 'oil-removal', icon: '🛢️' },
  { name: 'Электрика', slug: 'electrical', icon: '⚡' },
  { name: 'Сантехника', slug: 'plumbing', icon: '🚿' },
  { name: 'Клининг', slug: 'cleaning', icon: '🧽' },
];

async function main() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  console.log(`Seeded ${CATEGORIES.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
