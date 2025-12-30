-- ============================================================================
-- Разрешение main_organizer создавать задания с organizer_id = null
-- ============================================================================
-- Эта миграция обновляет политики RLS для таблицы tasks, чтобы main_organizer
-- мог создавать задания, видимые всем организаторам (organizer_id = null)
-- ============================================================================

-- Удаляем существующую политику для организаторов
DROP POLICY IF EXISTS "Organizers can manage tasks" ON tasks;

-- Создаем новую политику, которая разрешает:
-- 1. Организаторам управлять заданиями для своих свадеб
-- 2. Организаторам управлять своими внутренними заданиями (organizer_id = auth.uid())
-- 3. Main_organizer управлять заданиями с organizer_id = null (видимыми всем)
-- USING применяется для SELECT, UPDATE, DELETE
-- WITH CHECK применяется для INSERT, UPDATE
CREATE POLICY "Organizers can manage tasks" ON tasks
  FOR ALL 
  USING (
    (
      -- Задания для свадеб организатора
      EXISTS (
        SELECT 1 FROM weddings
        WHERE weddings.id = tasks.wedding_id
        AND weddings.organizer_id = auth.uid()
      )
      OR
      -- Внутренние задания организатора (с organizer_id = auth.uid())
      (
        tasks.organizer_id = auth.uid()
        AND tasks.wedding_id IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('organizer', 'main_organizer')
        )
      )
      OR
      -- Задания main_organizer с organizer_id = null (видимые всем организаторам)
      (
        tasks.organizer_id IS NULL
        AND tasks.wedding_id IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('organizer', 'main_organizer')
        )
      )
    )
  )
  WITH CHECK (
    (
      -- Задания для свадеб организатора
      EXISTS (
        SELECT 1 FROM weddings
        WHERE weddings.id = tasks.wedding_id
        AND weddings.organizer_id = auth.uid()
      )
      OR
      -- Внутренние задания организатора (с organizer_id = auth.uid())
      (
        tasks.organizer_id = auth.uid()
        AND tasks.wedding_id IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('organizer', 'main_organizer')
        )
      )
      OR
      -- Задания main_organizer с organizer_id = null (видимые всем организаторам)
      (
        tasks.organizer_id IS NULL
        AND tasks.wedding_id IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('organizer', 'main_organizer')
        )
      )
    )
  );

-- Политика FOR ALL уже покрывает SELECT, INSERT, UPDATE, DELETE
-- Но нужно убедиться, что клиенты все еще могут видеть свои задания
-- Проверяем и обновляем политику SELECT для клиентов, если она существует
-- (Она должна быть создана в миграции 001_initial_schema.sql)
-- Если политика уже существует, мы не будем ее пересоздавать, чтобы не нарушить права клиентов

