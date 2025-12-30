-- ============================================================================
-- SQL скрипт для создания функции получения документов для свадьбы (для главного организатора)
-- ============================================================================
-- ИНСТРУКЦИЯ:
-- Выполните этот скрипт в Supabase SQL Editor
-- ============================================================================

-- Удаляем старую функцию (если существует) с параметром wedding_id
DROP FUNCTION IF EXISTS get_wedding_documents(UUID);

-- Создаем функцию для получения документов для свадьбы
CREATE OR REPLACE FUNCTION get_wedding_documents(p_wedding_id UUID)
RETURNS SETOF documents
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
    RAISE EXCEPTION 'Only main organizers can view documents for any wedding';
  END IF;

  -- Возвращаем документы для свадьбы
  RETURN QUERY
  SELECT d.*
  FROM documents d
  WHERE d.wedding_id = p_wedding_id
  ORDER BY 
    CASE WHEN d.pinned = true THEN 0 ELSE 1 END,
    d.created_at DESC;
END;
$$;

-- Даем права на выполнение функции всем аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION get_wedding_documents(UUID) TO authenticated;

-- ============================================================================
-- Проверка результата (опционально)
-- ============================================================================
-- Раскомментируйте запрос ниже, чтобы проверить функцию (замените 'wedding-id-here' на реальный ID):
-- SELECT * FROM get_wedding_documents('wedding-id-here'::UUID);

