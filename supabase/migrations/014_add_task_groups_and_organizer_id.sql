-- Создание таблицы для блоков/категорий заданий организатора
CREATE TABLE IF NOT EXISTS task_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавляем organizer_id в таблицу tasks для заданий организатора
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS task_group_id UUID REFERENCES task_groups(id) ON DELETE CASCADE;

-- Создаем индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_task_groups_organizer_id ON task_groups(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_organizer_id ON tasks(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_group_id ON tasks(task_group_id);

-- Функция для автоматического обновления updated_at
CREATE TRIGGER update_task_groups_updated_at BEFORE UPDATE ON task_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Включаем RLS для task_groups
ALTER TABLE task_groups ENABLE ROW LEVEL SECURITY;

-- RLS политики для task_groups
-- Организаторы могут видеть и управлять только своими блоками заданий
CREATE POLICY "Organizers can manage own task groups" ON task_groups
  FOR ALL USING (
    organizer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'organizer'
    )
  );

-- Обновляем RLS политики для tasks
-- Удаляем старую политику
DROP POLICY IF EXISTS "Organizers can manage tasks" ON tasks;

-- Новая политика: организаторы могут управлять заданиями для своих свадеб И своими внутренними заданиями
CREATE POLICY "Organizers can manage tasks" ON tasks
  FOR ALL USING (
    (
      -- Задания для свадеб организатора
      EXISTS (
        SELECT 1 FROM weddings
        WHERE weddings.id = tasks.wedding_id
        AND weddings.organizer_id = auth.uid()
      )
      OR
      -- Внутренние задания организатора (с organizer_id)
      (
        tasks.organizer_id = auth.uid()
        AND tasks.wedding_id IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'organizer'
        )
      )
    )
  );

