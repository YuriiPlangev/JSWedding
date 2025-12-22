-- Разрешаем NULL для wedding_id в таблице tasks (для заданий организатора)
-- Это позволяет создавать внутренние задания компании, не привязанные к конкретным свадьбам

-- Удаляем ограничение NOT NULL с wedding_id
ALTER TABLE tasks 
  ALTER COLUMN wedding_id DROP NOT NULL;

-- Обновляем внешний ключ, чтобы разрешить NULL значения
-- Сначала удаляем существующий внешний ключ (если он есть)
ALTER TABLE tasks 
  DROP CONSTRAINT IF EXISTS tasks_wedding_id_fkey;

-- Создаем новый внешний ключ, который разрешает NULL
ALTER TABLE tasks 
  ADD CONSTRAINT tasks_wedding_id_fkey 
  FOREIGN KEY (wedding_id) 
  REFERENCES weddings(id) 
  ON DELETE CASCADE;

-- Обновляем RLS политики для заданий организатора
-- Организаторы могут видеть и управлять заданиями без wedding_id (внутренние задания)
-- Используем OR, чтобы политика работала и для заданий свадеб, и для заданий организатора
DROP POLICY IF EXISTS "Organizers can manage tasks" ON tasks;

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
      -- Внутренние задания организатора (без wedding_id)
      (
        tasks.wedding_id IS NULL 
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'organizer'
        )
      )
    )
  );

