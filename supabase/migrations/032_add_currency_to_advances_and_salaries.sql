-- ============================================================================
-- Миграция для добавления поля валюты в таблицы авансов и зарплат
-- ============================================================================

-- Добавляем поле currency в таблицу advances
ALTER TABLE advances 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'доллар' CHECK (currency IN ('грн', 'доллар', 'евро'));

-- Обновляем существующие записи без currency на 'доллар'
UPDATE advances SET currency = 'доллар' WHERE currency IS NULL OR currency = 'грн';

-- Добавляем поле currency в таблицу salaries
ALTER TABLE salaries 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'доллар' CHECK (currency IN ('грн', 'доллар', 'евро'));

-- Обновляем существующие записи без currency на 'доллар'
UPDATE salaries SET currency = 'доллар' WHERE currency IS NULL OR currency = 'грн';

