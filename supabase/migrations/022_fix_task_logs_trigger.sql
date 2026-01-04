-- ============================================================================
-- Миграция 022: Исправление триггера логирования заданий организаторов
-- ============================================================================
-- Эта миграция:
-- 1. Исправляет функцию логирования, чтобы auth.uid() работал корректно
-- 2. Добавляет логирование изменений текста задания (не только статуса)
-- 3. Обновляет CHECK constraint для action, добавляя 'edited'
-- ============================================================================

-- Обновляем CHECK constraint для action, добавляя 'edited'
ALTER TABLE organizer_task_logs DROP CONSTRAINT IF EXISTS organizer_task_logs_action_check;
ALTER TABLE organizer_task_logs ADD CONSTRAINT organizer_task_logs_action_check 
  CHECK (action IN ('completed', 'uncompleted', 'started', 'paused', 'edited'));

-- Удаляем старый триггер
DROP TRIGGER IF EXISTS trigger_log_organizer_task_status_change ON tasks;

-- Обновляем функцию логирования статуса
CREATE OR REPLACE FUNCTION log_organizer_task_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_old_status TEXT;
  v_new_status TEXT;
  v_organizer_id UUID;
BEGIN
  -- Логируем только для заданий организаторов (wedding_id IS NULL)
  IF NEW.wedding_id IS NULL THEN
    v_old_status := OLD.status;
    v_new_status := NEW.status;
    
    -- Определяем действие на основе изменения статуса
    IF v_old_status = v_new_status THEN
      -- Статус не изменился, ничего не логируем
      RETURN NEW;
    END IF;
    
    -- Получаем ID организатора из текущего контекста
    -- В SECURITY DEFINER функции auth.uid() должен работать
    -- Также пробуем получить из JWT токена напрямую
    v_organizer_id := auth.uid();
    
    -- Если auth.uid() возвращает NULL, пробуем получить из JWT токена
    IF v_organizer_id IS NULL THEN
      BEGIN
        v_organizer_id := current_setting('request.jwt.claim.sub', true)::UUID;
      EXCEPTION WHEN OTHERS THEN
        v_organizer_id := NULL;
      END;
    END IF;
    
    -- Если все еще NULL, используем fallback - organizer_id задания
    IF v_organizer_id IS NULL THEN
      v_organizer_id := NEW.organizer_id;
      -- Если все еще NULL, пропускаем логирование
      IF v_organizer_id IS NULL THEN
        RETURN NEW;
      END IF;
    END IF;
    
    -- Определяем тип действия
    IF v_new_status = 'completed' AND v_old_status != 'completed' THEN
      v_action := 'completed';
    ELSIF v_new_status != 'completed' AND v_old_status = 'completed' THEN
      v_action := 'uncompleted';
    ELSIF v_new_status = 'in_progress' AND v_old_status = 'pending' THEN
      v_action := 'started';
    ELSIF v_new_status = 'pending' AND v_old_status = 'in_progress' THEN
      v_action := 'paused';
    ELSE
      -- Для других изменений используем общее действие
      v_action := CASE 
        WHEN v_new_status = 'completed' THEN 'completed'
        WHEN v_new_status = 'in_progress' THEN 'started'
        ELSE 'paused'
      END;
    END IF;
    
    -- Вставляем лог
    INSERT INTO organizer_task_logs (
      task_id,
      organizer_id,
      old_status,
      new_status,
      action
    ) VALUES (
      NEW.id,
      v_organizer_id,
      v_old_status,
      v_new_status,
      v_action
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Создаем триггер для автоматического логирования изменений статуса
CREATE TRIGGER trigger_log_organizer_task_status_change
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  WHEN (
    OLD.status IS DISTINCT FROM NEW.status
    AND NEW.wedding_id IS NULL
  )
  EXECUTE FUNCTION log_organizer_task_status_change();

-- ============================================================================
-- Добавляем логирование изменений текста задания
-- ============================================================================

-- Функция для логирования изменений текста задания
CREATE OR REPLACE FUNCTION log_organizer_task_text_change()
RETURNS TRIGGER AS $$
DECLARE
  v_organizer_id UUID;
  v_old_text TEXT;
  v_new_text TEXT;
BEGIN
  -- Логируем только для заданий организаторов (wedding_id IS NULL)
  IF NEW.wedding_id IS NULL THEN
    -- Получаем текст задания (используем title_ru или title)
    v_old_text := COALESCE(OLD.title_ru, OLD.title, '');
    v_new_text := COALESCE(NEW.title_ru, NEW.title, '');
    
    -- Проверяем, изменился ли текст
    IF v_old_text = v_new_text THEN
      RETURN NEW;
    END IF;
    
    -- Получаем ID организатора
    v_organizer_id := auth.uid();
    
    -- Если auth.uid() возвращает NULL, пробуем получить из JWT токена
    IF v_organizer_id IS NULL THEN
      BEGIN
        v_organizer_id := current_setting('request.jwt.claim.sub', true)::UUID;
      EXCEPTION WHEN OTHERS THEN
        v_organizer_id := NULL;
      END;
    END IF;
    
    -- Если все еще NULL, используем fallback - organizer_id задания
    IF v_organizer_id IS NULL THEN
      v_organizer_id := NEW.organizer_id;
      IF v_organizer_id IS NULL THEN
        RETURN NEW;
      END IF;
    END IF;
    
    -- Вставляем лог с действием "изменен"
    INSERT INTO organizer_task_logs (
      task_id,
      organizer_id,
      old_status,
      new_status,
      action
    ) VALUES (
      NEW.id,
      v_organizer_id,
      OLD.status, -- Сохраняем текущий статус
      NEW.status, -- Сохраняем текущий статус
      'edited' -- Действие "изменено"
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Создаем триггер для логирования изменений текста
DROP TRIGGER IF EXISTS trigger_log_organizer_task_text_change ON tasks;

CREATE TRIGGER trigger_log_organizer_task_text_change
  AFTER UPDATE OF title, title_ru, title_en, title_ua ON tasks
  FOR EACH ROW
  WHEN (
    NEW.wedding_id IS NULL
    AND (
      COALESCE(OLD.title_ru, OLD.title, '') IS DISTINCT FROM COALESCE(NEW.title_ru, NEW.title, '')
      OR COALESCE(OLD.title_en, '') IS DISTINCT FROM COALESCE(NEW.title_en, '')
      OR COALESCE(OLD.title_ua, '') IS DISTINCT FROM COALESCE(NEW.title_ua, '')
    )
  )
  EXECUTE FUNCTION log_organizer_task_text_change();

-- ============================================================================
-- Комментарии
-- ============================================================================

COMMENT ON FUNCTION log_organizer_task_status_change() IS 
'Логирует изменения статуса заданий организаторов. Использует auth.uid() для определения организатора, который внес изменение.';

COMMENT ON FUNCTION log_organizer_task_text_change() IS 
'Логирует изменения текста заданий организаторов. Использует auth.uid() для определения организатора, который внес изменение.';

