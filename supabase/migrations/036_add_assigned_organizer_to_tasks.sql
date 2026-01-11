-- Добавляем поле assigned_organizer_id в таблицу tasks для назначения исполнителя задания
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS assigned_organizer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Создаем индекс для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_organizer_id ON tasks(assigned_organizer_id);

