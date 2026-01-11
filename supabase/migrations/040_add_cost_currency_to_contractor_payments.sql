-- ============================================================================
-- Миграция для добавления поля валюты стоимости в оплатах подрядчикам
-- ============================================================================

-- Добавляем поле валюты стоимости
ALTER TABLE contractor_payments
ADD COLUMN IF NOT EXISTS cost_currency TEXT DEFAULT 'грн' CHECK (cost_currency IN ('грн', 'доллар', 'евро'));

-- Обновляем существующие записи (если есть)
UPDATE contractor_payments
SET cost_currency = COALESCE(currency, 'грн')
WHERE cost_currency IS NULL;

