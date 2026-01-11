-- ============================================================================
-- Миграция для таблиц авансов и зарплат
-- ============================================================================

-- Таблица ивентов для авансов
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица авансов
CREATE TABLE IF NOT EXISTS advances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  purpose TEXT,
  payment_method TEXT CHECK (payment_method IN ('крипта', 'наличка', 'карта')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица сотрудников для зарплат
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица зарплат
CREATE TABLE IF NOT EXISTS salaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL, -- Первое число месяца
  salary DECIMAL(10, 2) DEFAULT 0,
  bonus DECIMAL(10, 2) DEFAULT 0,
  coordination DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, month) -- Один запись на сотрудника в месяц
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_advances_event_id ON advances(event_id);
CREATE INDEX IF NOT EXISTS idx_employees_created_by ON employees(created_by);
CREATE INDEX IF NOT EXISTS idx_salaries_employee_id ON salaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_salaries_month ON salaries(month);

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advances_updated_at BEFORE UPDATE ON advances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salaries_updated_at BEFORE UPDATE ON salaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Включаем RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;

-- RLS политики для events
CREATE POLICY "Main organizers can manage events" ON events
  FOR ALL USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'main_organizer'
    )
  );

-- RLS политики для advances
CREATE POLICY "Main organizers can manage advances" ON advances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = advances.event_id
      AND events.created_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'main_organizer'
      )
    )
  );

-- RLS политики для employees
CREATE POLICY "Main organizers can manage employees" ON employees
  FOR ALL USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'main_organizer'
    )
  );

-- RLS политики для salaries
CREATE POLICY "Main organizers can manage salaries" ON salaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = salaries.employee_id
      AND employees.created_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'main_organizer'
      )
    )
  );

