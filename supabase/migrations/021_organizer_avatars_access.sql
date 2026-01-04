-- ============================================================================
-- Миграция 021: Доступ организаторов к фото друг друга
-- ============================================================================
-- Эта миграция:
-- 1. Создает функцию для проверки роли организатора (обходит RLS рекурсию)
-- 2. Добавляет RLS политику для profiles, чтобы все организаторы могли
--    видеть профили (включая avatar_url) других организаторов
-- 3. Это необходимо для отображения фото организаторов в логах заданий
-- ============================================================================

-- Создаем функцию для проверки, является ли пользователь организатором
-- Используем SECURITY DEFINER, чтобы обойти RLS и избежать рекурсии
CREATE OR REPLACE FUNCTION is_organizer(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = user_id
    AND profiles.role IN ('organizer', 'main_organizer')
  );
END;
$$;

-- Даем права на выполнение функции всем аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION is_organizer(UUID) TO authenticated;

-- Добавляем политику для profiles: все организаторы могут видеть профили других организаторов
-- (нужно для отображения фото в логах)
-- Используем функцию is_organizer, чтобы избежать рекурсии
CREATE POLICY "All organizers can view other organizers profiles" ON profiles
  FOR SELECT USING (
    -- Проверяем роль через функцию (без рекурсии)
    is_organizer(auth.uid())
    AND (
      -- Могут видеть свой профиль (уже есть другая политика, но для ясности)
      auth.uid() = profiles.id
      OR
      -- Могут видеть профили других организаторов
      profiles.role IN ('organizer', 'main_organizer')
    )
  );

-- ============================================================================
-- Комментарии
-- ============================================================================

COMMENT ON POLICY "All organizers can view other organizers profiles" ON profiles IS 
'Позволяет всем организаторам (organizer и main_organizer) видеть профили друг друга, включая avatar_url. Необходимо для отображения фото в логах выполнения заданий.';

