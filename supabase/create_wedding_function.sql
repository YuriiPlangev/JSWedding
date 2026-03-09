-- ============================================
-- Функция для создания свадьбы (обходит RLS)
-- ============================================

-- Удаляем функцию, если она существует
DROP FUNCTION IF EXISTS create_wedding(JSONB);

-- Создаем функцию для создания свадьбы
CREATE OR REPLACE FUNCTION create_wedding(
  wedding_data JSONB
)
RETURNS SETOF weddings
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id UUID;
  current_user_role TEXT;
  new_wedding weddings%ROWTYPE;
BEGIN
  -- Получаем текущего пользователя
  current_user_id := auth.uid();
  
  -- Проверяем, что пользователь существует и является организатором или главным организатором
  SELECT p.role INTO current_user_role
  FROM profiles p
  WHERE p.id = current_user_id;
  
  IF current_user_role IS NULL OR current_user_role NOT IN ('organizer', 'main_organizer') THEN
    RAISE EXCEPTION 'Only organizers can create weddings';
  END IF;
  
  -- Любой организатор может создать свадьбу для любого организатора
  -- Проверка organizer_id не требуется
  
  -- Проверяем обязательные поля
  -- Требуем только первое имя, второе может быть пустым
  IF (wedding_data->>'couple_name_1_en' IS NULL OR wedding_data->>'couple_name_1_en' = '') 
     AND (wedding_data->>'couple_name_1_ru' IS NULL OR wedding_data->>'couple_name_1_ru' = '') THEN
    RAISE EXCEPTION 'couple_name_1_en or couple_name_1_ru is required';
  END IF;
  
  IF wedding_data->>'venue' IS NULL OR wedding_data->>'venue' = '' THEN
    RAISE EXCEPTION 'venue is required';
  END IF;
  
  -- Создаем свадьбу
  INSERT INTO weddings (
    client_id,
    organizer_id,
    project_name,
    couple_name_1_en,
    couple_name_1_ru,
    couple_name_2_en,
    couple_name_2_ru,
    wedding_date,
    country,
    country_en,
    country_ru,
    country_ua,
    venue,
    guest_count,
    chat_link,
    notes,
    splash_welcome_text_en,
    full_welcome_text_en
  )
  VALUES (
    (wedding_data->>'client_id')::UUID,
    (wedding_data->>'organizer_id')::UUID,
    NULLIF(wedding_data->>'project_name', ''),
    COALESCE(NULLIF(wedding_data->>'couple_name_1_en', ''), NULLIF(wedding_data->>'couple_name_1_ru', '')),
    COALESCE(NULLIF(wedding_data->>'couple_name_1_ru', ''), NULLIF(wedding_data->>'couple_name_1_en', '')),
    NULLIF(wedding_data->>'couple_name_2_en', ''),
    NULLIF(wedding_data->>'couple_name_2_ru', ''),
    (wedding_data->>'wedding_date')::DATE,
    COALESCE(NULLIF(wedding_data->>'country', ''), NULLIF(wedding_data->>'country_ru', ''), NULLIF(wedding_data->>'country_en', ''), ''),
    NULLIF(wedding_data->>'country_en', ''),
    NULLIF(wedding_data->>'country_ru', ''),
    NULLIF(wedding_data->>'country_ua', ''),
    wedding_data->>'venue',
    COALESCE((wedding_data->>'guest_count')::INTEGER, 0),
    NULLIF(wedding_data->>'chat_link', ''),
    NULLIF(wedding_data->>'notes', ''),
    NULLIF(wedding_data->>'splash_welcome_text_en', ''),
    NULLIF(wedding_data->>'full_welcome_text_en', '')
  )
  RETURNING * INTO new_wedding;
  
  -- Возвращаем созданную запись
  RETURN QUERY
  SELECT w.*
  FROM weddings w
  WHERE w.id = new_wedding.id;
END;
$$;

-- Даем права на выполнение функции всем аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION create_wedding(JSONB) TO authenticated;

-- Комментарий к функции
COMMENT ON FUNCTION create_wedding(JSONB) IS 
  'Создает свадьбу для организатора. Обходит RLS, но проверяет права доступа внутри функции.';

