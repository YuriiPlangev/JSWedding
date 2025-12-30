-- ============================================================================
-- SQL скрипт для создания функции получения свадьбы по ID (для главного организатора)
-- ============================================================================
-- ИНСТРУКЦИЯ:
-- Выполните этот скрипт в Supabase SQL Editor
-- ============================================================================

-- Создаем функцию для получения свадьбы по ID
CREATE OR REPLACE FUNCTION get_wedding_by_id(wedding_id UUID)
RETURNS SETOF weddings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_user_role TEXT;
BEGIN
  -- Получаем роль текущего пользователя
  SELECT p.role INTO current_user_role
  FROM profiles p
  WHERE p.id = current_user_id;
  
  -- Проверяем, что текущий пользователь является главным организатором
  IF current_user_role != 'main_organizer' THEN
    RAISE EXCEPTION 'Only main organizers can view weddings by ID';
  END IF;

  -- Возвращаем свадьбу по ID
  RETURN QUERY
  SELECT w.*
  FROM weddings w
  WHERE w.id = wedding_id;
END;
$$;

-- Даем права на выполнение функции всем аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION get_wedding_by_id(UUID) TO authenticated;

-- ============================================================================
-- Проверка результата (опционально)
-- ============================================================================
-- Раскомментируйте запрос ниже, чтобы проверить функцию (замените 'wedding-id-here' на реальный ID):
-- SELECT * FROM get_wedding_by_id('wedding-id-here'::UUID);


