-- Главное правило продукта: одна клетка — одна услуга — один владелец.
-- Prisma schema.prisma не умеет описывать partial unique index, поэтому
-- накатывается отдельно поверх `prisma migrate dev`.
CREATE UNIQUE INDEX IF NOT EXISTS claims_cell_category_active_unique
  ON claims (cell_id, category_id)
  WHERE status = 'active';
