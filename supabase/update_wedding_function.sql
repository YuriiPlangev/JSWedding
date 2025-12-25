-- ============================================
-- Функция для обновления свадьбы (обходит RLS)
-- ============================================

-- Удаляем функцию, если она существует
DROP FUNCTION IF EXISTS update_wedding(UUID, JSONB);

-- Создаем функцию для обновления свадьбы
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

-- Даем права на выполнение функции всем аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION update_wedding(UUID, JSONB) TO authenticated;

-- Комментарий к функции
COMMENT ON FUNCTION update_wedding(UUID, JSONB) IS 
  'Обновляет свадьбу для организатора. Обходит RLS, но проверяет права доступа внутри функции.';

