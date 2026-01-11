-- ============================================================================
-- Миграция для создания таблицы координаций
-- ============================================================================

-- Создаем таблицу для координаций
CREATE TABLE IF NOT EXISTS coordination_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salary_id UUID REFERENCES salaries(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT CHECK (currency IN ('грн', 'доллар', 'евро')) DEFAULT 'грн',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавляем поле name, если его нет
ALTER TABLE coordination_payments 
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Координация';

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_coordination_payments_salary_id ON coordination_payments(salary_id);

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_coordination_payments_updated_at ON coordination_payments;
CREATE TRIGGER update_coordination_payments_updated_at BEFORE UPDATE ON coordination_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Включаем RLS
ALTER TABLE coordination_payments ENABLE ROW LEVEL SECURITY;

-- RLS политики для coordination_payments
DROP POLICY IF EXISTS "Main organizers can manage coordination payments" ON coordination_payments;
CREATE POLICY "Main organizers can manage coordination payments" ON coordination_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM salaries
      JOIN employees ON employees.id = salaries.employee_id
      WHERE salaries.id = coordination_payments.salary_id
      AND employees.created_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'main_organizer'
      )
    )
  );

-- Удаляем поле coordination из таблицы salaries (если оно есть)
ALTER TABLE salaries 
DROP COLUMN IF EXISTS coordination;

-- Удаляем поле coordination_currency из таблицы salaries (если оно есть)
ALTER TABLE salaries 
DROP COLUMN IF EXISTS coordination_currency;

