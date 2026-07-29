-- Главное правило продукта: одна клетка — одна услуга — один владелец.
-- Живёт в базе, не в коде. См. ТЗ раздел 7.
CREATE UNIQUE INDEX IF NOT EXISTS claims_cell_category_active_unique
  ON claims (cell_id, category_id)
  WHERE status = 'active';
