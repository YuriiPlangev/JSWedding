-- Исправление бесконечной рекурсии в политиках RLS для profiles
-- Выполните этот скрипт в Supabase SQL Editor

-- Удаляем проблемную политику, которая вызывает рекурсию
DROP POLICY IF EXISTS "Organizers can view client profiles" ON profiles;

-- Теперь должны остаться только базовые политики:
-- 1. "Users can view own profile" - пользователи видят свой профиль (auth.uid() = id)
-- 2. "Users can update own profile" - пользователи обновляют свой профиль

-- Для получения всех клиентов организаторами создадим функцию, которая обходит RLS
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
BEGIN
  -- Проверяем, что текущий пользователь является организатором
  IF NOT EXISTS (
    SELECT 1 FROM profiles p_check WHERE p_check.id = current_user_id AND p_check.role = 'organizer'
  ) THEN
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

