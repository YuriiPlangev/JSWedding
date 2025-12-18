-- ============================================
-- Функция для удаления свадьбы (обходит RLS)
-- ============================================

-- Удаляем функцию, если она существует
DROP FUNCTION IF EXISTS delete_wedding(UUID);

-- Создаем функцию для удаления свадьбы
CREATE OR REPLACE FUNCTION delete_wedding(
  wedding_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id UUID;
  current_user_role TEXT;
  wedding_client_id UUID;
  v_wedding_id UUID;
BEGIN
  -- Сохраняем параметр в локальную переменную для избежания конфликта имен
  v_wedding_id := wedding_id;
  
  -- Получаем текущего пользователя
  current_user_id := auth.uid();
  
  -- Проверяем, что пользователь существует и является организатором
  SELECT p.role INTO current_user_role
  FROM profiles p
  WHERE p.id = current_user_id;
  
  IF current_user_role IS NULL OR current_user_role != 'organizer' THEN
    RAISE EXCEPTION 'Only organizers can delete weddings';
  END IF;
  
  -- Проверяем, что свадьба существует и принадлежит этому организатору
  SELECT w.client_id INTO wedding_client_id
  FROM weddings w
  WHERE w.id = v_wedding_id
  AND w.organizer_id = current_user_id;
  
  IF wedding_client_id IS NULL THEN
    RAISE EXCEPTION 'Wedding not found or access denied';
  END IF;
  
  -- Удаляем все связанные задачи
  DELETE FROM tasks WHERE tasks.wedding_id = v_wedding_id;
  
  -- Удаляем все связанные документы
  DELETE FROM documents WHERE documents.wedding_id = v_wedding_id;
  
  -- Удаляем саму свадьбу
  DELETE FROM weddings WHERE weddings.id = v_wedding_id;
  
  RETURN TRUE;
END;
$$;

-- Даем права на выполнение функции всем аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION delete_wedding(UUID) TO authenticated;

-- Комментарий к функции
COMMENT ON FUNCTION delete_wedding(UUID) IS 
  'Удаляет свадьбу для организатора. Обходит RLS, но проверяет права доступа внутри функции.';

