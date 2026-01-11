-- ============================================================================
-- Миграция для обновления полей валюты в таблице зарплат
-- ============================================================================

-- Удаляем старое поле currency
ALTER TABLE salaries 
DROP COLUMN IF EXISTS currency;

-- Добавляем отдельные поля валюты для бонуса и координации
ALTER TABLE salaries 
ADD COLUMN IF NOT EXISTS bonus_currency TEXT CHECK (bonus_currency IN ('доллар', 'евро'));

ALTER TABLE salaries 
ADD COLUMN IF NOT EXISTS coordination_currency TEXT CHECK (coordination_currency IN ('доллар', 'евро'));

