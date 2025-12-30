-- ============================================
-- Добавление поля priority (срочность) в таблицу tasks
-- ============================================

-- Добавляем поле priority, если его еще нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'priority'
  ) THEN
    ALTER TABLE tasks ADD COLUMN priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium';
  END IF;
END $$;


