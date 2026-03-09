-- ============================================================================
-- SQL скрипт для обновления функций для поддержки главного организатора
-- ============================================================================
-- ИНСТРУКЦИЯ:
-- Выполните этот скрипт в Supabase SQL Editor после add_main_organizer_role.sql
-- ============================================================================

-- Обновляем функцию get_all_clients для поддержки главного организатора
CREATE OR REPLACE FUNCTION get_all_clients()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
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
  
  -- Проверяем, что текущий пользователь является организатором или главным организатором
  IF current_user_role NOT IN ('organizer', 'main_organizer') THEN
    RAISE EXCEPTION 'Only organizers can view all clients';
  END IF;

  -- Возвращаем всех клиентов
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.name,
    p.role,
    p.avatar_url,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.role = 'client'
  ORDER BY p.name ASC;
END;
$$;

-- Даем права на выполнение функции всем аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION get_all_clients() TO authenticated;

-- ============================================================================
-- Проверка результата (опционально)
-- ============================================================================





