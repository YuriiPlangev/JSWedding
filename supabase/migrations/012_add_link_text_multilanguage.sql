-- ============================================
-- Добавление полей для многоязычности текста ссылки задания
-- link_text на 3 языках (EN, RU, UA)
-- ============================================

-- Добавляем поле link_text_en в таблицу tasks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'link_text_en'
  ) THEN
    ALTER TABLE tasks ADD COLUMN link_text_en TEXT;
  END IF;
END $$;

-- Добавляем поле link_text_ru в таблицу tasks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'link_text_ru'
  ) THEN
    ALTER TABLE tasks ADD COLUMN link_text_ru TEXT;
  END IF;
END $$;

-- Добавляем поле link_text_ua в таблицу tasks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'link_text_ua'
  ) THEN
    ALTER TABLE tasks ADD COLUMN link_text_ua TEXT;
  END IF;
END $$;

-- Копируем существующие значения link_text в новые поля (если они еще не заполнены)
UPDATE tasks 
SET link_text_ru = link_text 
WHERE link_text_ru IS NULL AND link_text IS NOT NULL;

UPDATE tasks 
SET link_text_en = link_text 
WHERE link_text_en IS NULL AND link_text IS NOT NULL;

UPDATE tasks 
SET link_text_ua = link_text 
WHERE link_text_ua IS NULL AND link_text IS NOT NULL;



