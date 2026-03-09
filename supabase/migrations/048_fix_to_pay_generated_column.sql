-- ============================================================================
-- Миграция для исправления to_pay: из GENERATED column в обычное поле
-- Это необходимо чтобы триггер мог обновлять значение to_pay
-- ============================================================================

-- Шаг 1: Удаляем GENERATED column to_pay
ALTER TABLE contractor_payments 
DROP COLUMN IF EXISTS to_pay;

-- Шаг 2: Создаем обычное поле to_pay (не GENERATED)
ALTER TABLE contractor_payments 
ADD COLUMN to_pay DECIMAL(10, 2) DEFAULT 0;

-- Шаг 3: Инициализируем существующие значения по формуле cost - advance - percent
UPDATE contractor_payments
SET to_pay = (COALESCE(cost, 0) - COALESCE(advance, 0) - COALESCE(percent, 0));

-- Шаг 4: Удаляем старые триггеры если есть
DROP TRIGGER IF EXISTS contractor_payment_calculate_to_pay_insert ON contractor_payments;
DROP TRIGGER IF EXISTS contractor_payment_calculate_to_pay_update ON contractor_payments;
DROP FUNCTION IF EXISTS calculate_contractor_payment_to_pay();
DROP FUNCTION IF EXISTS calculate_contractor_payment_to_pay_update();

-- Шаг 5: Создаем функцию для вычисления to_pay при INSERT
CREATE OR REPLACE FUNCTION calculate_contractor_payment_to_pay()
RETURNS TRIGGER AS $$
BEGIN
  -- Вычисляем to_pay: cost - advance - percent
  NEW.to_pay := COALESCE(NEW.cost, 0) - COALESCE(NEW.advance, 0) - COALESCE(NEW.percent, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Шаг 6: Создаем триггер для INSERT операций
CREATE TRIGGER contractor_payment_calculate_to_pay_insert
BEFORE INSERT ON contractor_payments
FOR EACH ROW
EXECUTE FUNCTION calculate_contractor_payment_to_pay();

-- Шаг 7: Создаем функцию для вычисления to_pay при UPDATE
CREATE OR REPLACE FUNCTION calculate_contractor_payment_to_pay_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Вычисляем to_pay: cost - advance - percent
  NEW.to_pay := COALESCE(NEW.cost, 0) - COALESCE(NEW.advance, 0) - COALESCE(NEW.percent, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Шаг 8: Создаем триггер для UPDATE операций
CREATE TRIGGER contractor_payment_calculate_to_pay_update
BEFORE UPDATE ON contractor_payments
FOR EACH ROW
EXECUTE FUNCTION calculate_contractor_payment_to_pay_update();

-- Комментарий
COMMENT ON COLUMN contractor_payments.to_pay IS 
'К оплате: вычисляется автоматически как cost - advance - percent. Обновляется триггерами при INSERT и UPDATE.';
