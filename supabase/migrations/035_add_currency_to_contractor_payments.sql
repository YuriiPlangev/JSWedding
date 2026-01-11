-- ============================================================================
-- Миграция для добавления поля валюты в таблицу оплат подрядчикам
-- ============================================================================

-- Добавляем поле валюты
ALTER TABLE contractor_payments 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'грн' CHECK (currency IN ('грн', 'доллар', 'евро'));

-- Обновляем существующие записи (если есть)
UPDATE contractor_payments 
SET currency = 'грн' 
WHERE currency IS NULL;

