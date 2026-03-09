-- ============================================================================
-- Миграция для обновления формулы вычисляемого поля to_pay в оплатах подрядчикам
-- ============================================================================

-- Обновляем формулу вычисляемого поля to_pay
-- Теперь: to_pay = cost - advance - percent

-- Сначала удаляем старое вычисляемое поле
ALTER TABLE contractor_payments 
DROP COLUMN IF EXISTS to_pay;

-- Создаем новое вычисляемое поле с обновленной формулой
ALTER TABLE contractor_payments 
ADD COLUMN to_pay DECIMAL(10, 2) GENERATED ALWAYS AS (cost - advance - percent) STORED;

