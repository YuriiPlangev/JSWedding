-- ============================================================================
-- Миграция для добавления поля event_id в таблицу оплат подрядчикам
-- ============================================================================

-- Добавляем поле event_id
ALTER TABLE contractor_payments
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_contractor_payments_event_id ON contractor_payments(event_id);

