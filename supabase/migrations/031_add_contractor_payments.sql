-- ============================================================================
-- Миграция для таблицы оплат подрядчикам
-- ============================================================================

-- Таблица оплат подрядчикам
CREATE TABLE IF NOT EXISTS contractor_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service TEXT NOT NULL,
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  advance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  to_pay DECIMAL(10, 2) GENERATED ALWAYS AS (cost - advance) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_contractor_payments_created_by ON contractor_payments(created_by);
CREATE INDEX IF NOT EXISTS idx_contractor_payments_date ON contractor_payments(date);

-- RLS политики
ALTER TABLE contractor_payments ENABLE ROW LEVEL SECURITY;

-- Политика: главные организаторы могут видеть только свои записи
CREATE POLICY "Main organizers can view own contractor payments"
  ON contractor_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'main_organizer'
    )
    AND created_by = auth.uid()
  );

-- Политика: главные организаторы могут создавать свои записи
CREATE POLICY "Main organizers can insert own contractor payments"
  ON contractor_payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'main_organizer'
    )
    AND created_by = auth.uid()
  );

-- Политика: главные организаторы могут обновлять свои записи
CREATE POLICY "Main organizers can update own contractor payments"
  ON contractor_payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'main_organizer'
    )
    AND created_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'main_organizer'
    )
    AND created_by = auth.uid()
  );

-- Политика: главные организаторы могут удалять свои записи
CREATE POLICY "Main organizers can delete own contractor payments"
  ON contractor_payments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'main_organizer'
    )
    AND created_by = auth.uid()
  );

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_contractor_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contractor_payments_updated_at
  BEFORE UPDATE ON contractor_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_contractor_payments_updated_at();

