-- ============================================
-- Миграция: Добавление поддержки project_name в функции создания и обновления свадьбы
-- ============================================

-- Обновляем функцию create_wedding для поддержки project_name
DROP FUNCTION IF EXISTS create_wedding(JSONB);

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
  
  -- Проверяем, что пользователь существует и является организатором
  SELECT p.role INTO current_user_role
  FROM profiles p
  WHERE p.id = current_user_id;
  
  IF current_user_role IS NULL OR current_user_role != 'organizer' THEN
    RAISE EXCEPTION 'Only organizers can create weddings';
  END IF;
  
  -- Проверяем, что organizer_id в данных совпадает с текущим пользователем
  IF (wedding_data->>'organizer_id')::UUID != current_user_id THEN
    RAISE EXCEPTION 'Organizer ID must match current user';
  END IF;
  
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

-- Обновляем функцию update_wedding для поддержки project_name
DROP FUNCTION IF EXISTS update_wedding(UUID, JSONB);

CREATE OR REPLACE FUNCTION update_wedding(
  wedding_id UUID,
  updates JSONB
)
RETURNS SETOF weddings
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id UUID;
  current_user_role TEXT;
BEGIN
  -- Получаем текущего пользователя
  current_user_id := auth.uid();
  
  -- Проверяем, что пользователь существует и является организатором
  SELECT p.role INTO current_user_role
  FROM profiles p
  WHERE p.id = current_user_id;
  
  IF current_user_role IS NULL OR current_user_role != 'organizer' THEN
    RAISE EXCEPTION 'Only organizers can update weddings';
  END IF;
  
  -- Проверяем, что свадьба принадлежит этому организатору
  IF NOT EXISTS (
    SELECT 1 FROM weddings w
    WHERE w.id = wedding_id
    AND w.organizer_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Wedding not found or access denied';
  END IF;
  
  -- Исключаем поля, которые не должны обновляться
  updates := updates - 'id' - 'created_at' - 'updated_at' - 'organizer_id' - 'client_id';
  
  -- Обновляем свадьбу
  -- Используем CASE WHEN для правильной обработки NULL значений (если поле присутствует в JSON, обновляем его, иначе оставляем старое значение)
  UPDATE weddings
  SET
    project_name = CASE WHEN updates ? 'project_name' THEN NULLIF(updates->>'project_name', '')::TEXT ELSE project_name END,
    couple_name_1_en = CASE WHEN updates ? 'couple_name_1_en' THEN (updates->>'couple_name_1_en')::TEXT ELSE couple_name_1_en END,
    couple_name_2_en = CASE WHEN updates ? 'couple_name_2_en' THEN (updates->>'couple_name_2_en')::TEXT ELSE couple_name_2_en END,
    couple_name_1_ru = CASE WHEN updates ? 'couple_name_1_ru' THEN (updates->>'couple_name_1_ru')::TEXT ELSE couple_name_1_ru END,
    couple_name_2_ru = CASE WHEN updates ? 'couple_name_2_ru' THEN (updates->>'couple_name_2_ru')::TEXT ELSE couple_name_2_ru END,
    wedding_date = CASE WHEN updates ? 'wedding_date' THEN (updates->>'wedding_date')::DATE ELSE wedding_date END,
    country = CASE WHEN updates ? 'country' THEN (updates->>'country')::TEXT ELSE country END,
    country_en = CASE WHEN updates ? 'country_en' THEN NULLIF(updates->>'country_en', '')::TEXT ELSE country_en END,
    country_ru = CASE WHEN updates ? 'country_ru' THEN NULLIF(updates->>'country_ru', '')::TEXT ELSE country_ru END,
    country_ua = CASE WHEN updates ? 'country_ua' THEN NULLIF(updates->>'country_ua', '')::TEXT ELSE country_ua END,
    venue = CASE WHEN updates ? 'venue' THEN (updates->>'venue')::TEXT ELSE venue END,
    guest_count = CASE WHEN updates ? 'guest_count' THEN (updates->>'guest_count')::INTEGER ELSE guest_count END,
    chat_link = CASE WHEN updates ? 'chat_link' THEN NULLIF(updates->>'chat_link', '')::TEXT ELSE chat_link END,
    splash_welcome_text_en = CASE WHEN updates ? 'splash_welcome_text_en' THEN NULLIF(updates->>'splash_welcome_text_en', '')::TEXT ELSE splash_welcome_text_en END,
    full_welcome_text_en = CASE WHEN updates ? 'full_welcome_text_en' THEN NULLIF(updates->>'full_welcome_text_en', '')::TEXT ELSE full_welcome_text_en END,
    notes = CASE WHEN updates ? 'notes' THEN NULLIF(updates->>'notes', '')::TEXT ELSE notes END,
    updated_at = NOW()
  WHERE id = wedding_id;
  
  -- Возвращаем обновленную запись
  RETURN QUERY
  SELECT w.*
  FROM weddings w
  WHERE w.id = wedding_id;
END;
$$;

-- Даем права на выполнение функций всем аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION create_wedding(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_wedding(UUID, JSONB) TO authenticated;

-- Комментарии к функциям
COMMENT ON FUNCTION create_wedding(JSONB) IS 
  'Создает свадьбу для организатора. Обходит RLS, но проверяет права доступа внутри функции. Поддерживает project_name.';

COMMENT ON FUNCTION update_wedding(UUID, JSONB) IS 
  'Обновляет свадьбу для организатора. Обходит RLS, но проверяет права доступа внутри функции. Поддерживает project_name.';

