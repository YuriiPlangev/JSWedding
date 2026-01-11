-- ============================================================================
-- Миграция для добавления поля валюты зарплаты
-- ============================================================================

-- Добавляем поле salary_currency в таблицу salaries
ALTER TABLE salaries 
ADD COLUMN IF NOT EXISTS salary_currency TEXT CHECK (salary_currency IN ('грн', 'доллар', 'евро')) DEFAULT 'грн';

-- Обновляем существующие записи без salary_currency на 'грн'
UPDATE salaries 
SET salary_currency = 'грн' 
WHERE salary_currency IS NULL;

