-- ============================================================================
-- SQL скрипт для создания функции получения всех свадеб (для главного организатора)
-- ============================================================================
-- ИНСТРУКЦИЯ:
-- Выполните этот скрипт в Supabase SQL Editor
-- ============================================================================

-- Создаем функцию для получения всех свадеб
CREATE OR REPLACE FUNCTION get_all_weddings()
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
    RAISE EXCEPTION 'Only main organizers can view all weddings';
  END IF;

  -- Возвращаем все свадьбы, отсортированные по дате свадьбы (ближайшие первыми)
  RETURN QUERY
  SELECT w.*
  FROM weddings w
  ORDER BY w.wedding_date ASC;
END;
$$;

-- Даем права на выполнение функции всем аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION get_all_weddings() TO authenticated;

-- ============================================================================
-- Проверка результата (опционально)
-- ============================================================================
-- Раскомментируйте запрос ниже, чтобы проверить функцию:
-- SELECT * FROM get_all_weddings();

