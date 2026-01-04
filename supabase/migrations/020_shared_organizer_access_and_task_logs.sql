-- ============================================================================
-- Миграция 020: Общий доступ организаторов и логирование заданий
-- ============================================================================
-- Эта миграция:
-- 1. Изменяет RLS политики так, чтобы все организаторы (organizer и main_organizer)
--    видели все задания для организаторов, все свадьбы, все документы
-- 2. Создает таблицу для логов выполнения заданий организаторов
-- 3. Создает триггер для автоматического логирования при изменении статуса
-- ============================================================================

-- ============================================================================
-- ЧАСТЬ 0: Создание функции для проверки роли организатора (избегаем рекурсии)
-- ============================================================================

-- Создаем функцию для проверки, является ли пользователь организатором
-- Используем SECURITY DEFINER, чтобы обойти RLS и избежать рекурсии
CREATE OR REPLACE FUNCTION is_organizer(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = user_id
    AND profiles.role IN ('organizer', 'main_organizer')
  );
END;
$$;

-- Создаем функцию для проверки, является ли пользователь клиентом
-- Используем SECURITY DEFINER, чтобы обойти RLS и избежать рекурсии
CREATE OR REPLACE FUNCTION is_client(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = user_id
    AND profiles.role = 'client'
  );
END;
$$;

-- Создаем функцию для проверки, является ли пользователь клиентом
-- Используем SECURITY DEFINER, чтобы обойти RLS и избежать рекурсии
CREATE OR REPLACE FUNCTION is_client(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = user_id
    AND profiles.role = 'client'
  );
END;
$$;

-- Даем права на выполнение функций всем аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION is_organizer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_client(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_client(UUID) TO authenticated;

-- ============================================================================
-- ЧАСТЬ 1: Изменение RLS политик для общего доступа организаторов
-- ============================================================================

-- Удаляем старые политики для task_groups
DROP POLICY IF EXISTS "Organizers can manage own task groups" ON task_groups;

-- Новая политика: все организаторы (organizer и main_organizer) видят и управляют всеми группами заданий
CREATE POLICY "All organizers can manage all task groups" ON task_groups
  FOR ALL USING (
    is_organizer(auth.uid())
  );

-- Удаляем старые политики для tasks
DROP POLICY IF EXISTS "Organizers can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Clients can view tasks for own weddings" ON tasks;

-- Новая политика для заданий свадеб: клиенты видят только свои, организаторы - все
CREATE POLICY "Clients can view tasks for own weddings" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM weddings
      WHERE weddings.id = tasks.wedding_id
      AND weddings.client_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'client'
      )
    )
  );

-- Новая политика: все организаторы видят и управляют всеми заданиями для свадеб
CREATE POLICY "All organizers can manage wedding tasks" ON tasks
  FOR ALL USING (
    tasks.wedding_id IS NOT NULL
    AND is_organizer(auth.uid())
  );

-- Новая политика: все организаторы видят и управляют всеми заданиями для организаторов
CREATE POLICY "All organizers can manage organizer tasks" ON tasks
  FOR ALL USING (
    tasks.wedding_id IS NULL
    AND is_organizer(auth.uid())
  );

-- Удаляем старые политики для weddings
DROP POLICY IF EXISTS "Organizers can view their weddings" ON weddings;
DROP POLICY IF EXISTS "Organizers can manage weddings" ON weddings;
DROP POLICY IF EXISTS "Clients can view own weddings" ON weddings;

-- Политика для клиентов: могут видеть только свои свадьбы
-- Используем функцию is_client, чтобы избежать рекурсии
CREATE POLICY "Clients can view own weddings" ON weddings
  FOR SELECT USING (
    auth.uid() = client_id
    AND is_client(auth.uid())
  );

-- Новая политика: все организаторы видят и управляют всеми свадьбами
-- Используем функцию is_organizer, чтобы избежать рекурсии
CREATE POLICY "All organizers can manage all weddings" ON weddings
  FOR ALL USING (
    is_organizer(auth.uid())
  );

-- Удаляем старые политики для documents
DROP POLICY IF EXISTS "Organizers can manage documents" ON documents;

-- Новая политика: все организаторы видят и управляют всеми документами
CREATE POLICY "All organizers can manage all documents" ON documents
  FOR ALL USING (
    is_organizer(auth.uid())
  );

-- ============================================================================
-- ЧАСТЬ 2: Создание таблицы для логов выполнения заданий организаторов
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizer_task_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  old_status TEXT CHECK (old_status IN ('pending', 'in_progress', 'completed')),
  new_status TEXT CHECK (new_status IN ('pending', 'in_progress', 'completed')) NOT NULL,
  action TEXT CHECK (action IN ('completed', 'uncompleted', 'started', 'paused')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_organizer_task_logs_task_id ON organizer_task_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_organizer_task_logs_organizer_id ON organizer_task_logs(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_task_logs_created_at ON organizer_task_logs(created_at DESC);

-- Включаем RLS для таблицы логов
ALTER TABLE organizer_task_logs ENABLE ROW LEVEL SECURITY;

-- Политика: все организаторы могут видеть все логи
CREATE POLICY "All organizers can view all task logs" ON organizer_task_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('organizer', 'main_organizer')
    )
  );

-- Политика: только система может вставлять логи (через триггер)
CREATE POLICY "System can insert task logs" ON organizer_task_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- ЧАСТЬ 3: Создание функции для логирования изменений статуса заданий
-- ============================================================================

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
    -- В SECURITY DEFINER функции auth.uid() все еще доступен
    v_organizer_id := auth.uid();
    
    -- Если auth.uid() возвращает NULL, пытаемся получить из других источников
    IF v_organizer_id IS NULL THEN
      -- Пытаемся получить из organizer_id задания (если задание было создано организатором)
      v_organizer_id := NEW.organizer_id;
    END IF;
    
    -- Если все еще NULL, пропускаем логирование
    IF v_organizer_id IS NULL THEN
      RETURN NEW;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем триггер для автоматического логирования
DROP TRIGGER IF EXISTS trigger_log_organizer_task_status_change ON tasks;

CREATE TRIGGER trigger_log_organizer_task_status_change
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_organizer_task_status_change();

-- ============================================================================
-- Комментарии к таблице и колонкам
-- ============================================================================

COMMENT ON TABLE organizer_task_logs IS 'Логи выполнения заданий организаторов. Записывается кто и когда изменил статус задания.';
COMMENT ON COLUMN organizer_task_logs.task_id IS 'ID задания организатора';
COMMENT ON COLUMN organizer_task_logs.organizer_id IS 'ID организатора, который изменил статус';
COMMENT ON COLUMN organizer_task_logs.old_status IS 'Предыдущий статус задания';
COMMENT ON COLUMN organizer_task_logs.new_status IS 'Новый статус задания';
COMMENT ON COLUMN organizer_task_logs.action IS 'Тип действия: completed (выполнено), uncompleted (отменено выполнение), started (начато), paused (приостановлено)';
COMMENT ON COLUMN organizer_task_logs.created_at IS 'Время изменения статуса';

