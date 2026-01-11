-- ============================================================================
-- Миграция для добавления полей валюты для процента и аванса в оплатах подрядчикам
-- ============================================================================

-- Добавляем поля валюты для процента и аванса
ALTER TABLE contractor_payments 
ADD COLUMN IF NOT EXISTS percent_currency TEXT CHECK (percent_currency IN ('грн', 'доллар', 'евро'));

ALTER TABLE contractor_payments 
ADD COLUMN IF NOT EXISTS advance_currency TEXT CHECK (advance_currency IN ('грн', 'доллар', 'евро'));

