-- Функция для создания профиля пользователя (обходит RLS)
-- Эта функция позволяет организатору создавать профили для клиентов
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT DEFAULT 'client'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Создаем или обновляем профиль
  INSERT INTO profiles (id, email, name, role)
  VALUES (user_id, user_email, user_name, user_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role;
END;
$$;

-- Даем права на выполнение функции всем аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;
