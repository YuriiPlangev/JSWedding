-- Добавление поля order_index для стабильной сортировки оплат подрядчикам
-- Это решает проблему непредсказуемого изменения порядка строк

-- Добавляем колонку order_index
ALTER TABLE contractor_payments 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Устанавливаем начальные значения order_index на основе created_at
-- Строки с более ранней датой получат меньший индекс
WITH numbered AS (
  SELECT 
    id, 
    ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY created_at ASC) as row_num
  FROM contractor_payments
)
UPDATE contractor_payments
SET order_index = numbered.row_num
FROM numbered
WHERE contractor_payments.id = numbered.id;

-- Создаем индекс для быстрой сортировки
CREATE INDEX IF NOT EXISTS idx_contractor_payments_order 
ON contractor_payments(event_id, order_index);

-- Комментарий к колонке
COMMENT ON COLUMN contractor_payments.order_index IS 
'Порядковый индекс для стабильной сортировки строк. Автоматически увеличивается при создании новой записи.';

-- ======================== ТРИГГЕР ДЛЯ ВЫЧИСЛЕНИЯ to_pay ==========================
-- Функция для вычисления to_pay и автоинкремента order_index при вставке
CREATE OR REPLACE FUNCTION calculate_contractor_payment_to_pay()
RETURNS TRIGGER AS $$
DECLARE
  cost_val DECIMAL;
  advance_val DECIMAL;
  percent_val DECIMAL;
BEGIN
  -- Преобразуем в DECIMAL для точного вычисления
  cost_val := COALESCE(NEW.cost, 0);
  advance_val := COALESCE(NEW.advance, 0);
  percent_val := COALESCE(NEW.percent, 0);
  
  -- Вычисляем to_pay: cost - advance - percent
  NEW.to_pay := cost_val - advance_val - percent_val;
  
  -- Автоматически вычисляем order_index если не задан
  IF NEW.order_index IS NULL OR NEW.order_index = 0 THEN
    SELECT COALESCE(MAX(order_index), 0) + 1 INTO NEW.order_index
    FROM contractor_payments
    WHERE event_id = NEW.event_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для INSERT операций
DROP TRIGGER IF EXISTS contractor_payment_calculate_to_pay_insert ON contractor_payments;
CREATE TRIGGER contractor_payment_calculate_to_pay_insert
BEFORE INSERT ON contractor_payments
FOR EACH ROW
EXECUTE FUNCTION calculate_contractor_payment_to_pay();

-- Функция для вычисления to_pay при обновлении
CREATE OR REPLACE FUNCTION calculate_contractor_payment_to_pay_update()
RETURNS TRIGGER AS $$
DECLARE
  cost_val DECIMAL;
  advance_val DECIMAL;
  percent_val DECIMAL;
BEGIN
  -- Преобразуем в DECIMAL для точного вычисления
  cost_val := COALESCE(NEW.cost, 0);
  advance_val := COALESCE(NEW.advance, 0);
  percent_val := COALESCE(NEW.percent, 0);
  
  -- Вычисляем to_pay: cost - advance - percent
  NEW.to_pay := cost_val - advance_val - percent_val;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для UPDATE операций
DROP TRIGGER IF EXISTS contractor_payment_calculate_to_pay_update ON contractor_payments;
CREATE TRIGGER contractor_payment_calculate_to_pay_update
BEFORE UPDATE ON contractor_payments
FOR EACH ROW
EXECUTE FUNCTION calculate_contractor_payment_to_pay_update();
