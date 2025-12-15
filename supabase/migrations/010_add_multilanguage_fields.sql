-- ============================================
-- Добавление полей для многоязычности
-- Страна, названия заданий и документов на 3 языках (EN, RU, UA)
-- ============================================

-- Добавляем поля для страны на разных языках в таблицу weddings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'weddings' 
    AND column_name = 'country_en'
  ) THEN
    ALTER TABLE weddings ADD COLUMN country_en TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'weddings' 
    AND column_name = 'country_ru'
  ) THEN
    ALTER TABLE weddings ADD COLUMN country_ru TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'weddings' 
    AND column_name = 'country_ua'
  ) THEN
    ALTER TABLE weddings ADD COLUMN country_ua TEXT;
  END IF;
END $$;

-- Копируем существующие значения country в новые поля (если они еще не заполнены)
UPDATE weddings 
SET country_ru = country 
WHERE country_ru IS NULL AND country IS NOT NULL;

UPDATE weddings 
SET country_en = country 
WHERE country_en IS NULL AND country IS NOT NULL;

UPDATE weddings 
SET country_ua = country 
WHERE country_ua IS NULL AND country IS NOT NULL;

-- Добавляем поля для названий заданий на разных языках в таблицу tasks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'title_en'
  ) THEN
    ALTER TABLE tasks ADD COLUMN title_en TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'title_ru'
  ) THEN
    ALTER TABLE tasks ADD COLUMN title_ru TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'title_ua'
  ) THEN
    ALTER TABLE tasks ADD COLUMN title_ua TEXT;
  END IF;
END $$;

-- Копируем существующие значения title в новые поля (если они еще не заполнены)
UPDATE tasks 
SET title_ru = title 
WHERE title_ru IS NULL AND title IS NOT NULL;

UPDATE tasks 
SET title_en = title 
WHERE title_en IS NULL AND title IS NOT NULL;

UPDATE tasks 
SET title_ua = title 
WHERE title_ua IS NULL AND title IS NOT NULL;

-- Добавляем поля для названий документов на разных языках в таблицу documents
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'name_en'
  ) THEN
    ALTER TABLE documents ADD COLUMN name_en TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'name_ru'
  ) THEN
    ALTER TABLE documents ADD COLUMN name_ru TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'name_ua'
  ) THEN
    ALTER TABLE documents ADD COLUMN name_ua TEXT;
  END IF;
END $$;

-- Копируем существующие значения name в новые поля (если они еще не заполнены)
UPDATE documents 
SET name_ru = name 
WHERE name_ru IS NULL AND name IS NOT NULL;

UPDATE documents 
SET name_en = name 
WHERE name_en IS NULL AND name IS NOT NULL;

UPDATE documents 
SET name_ua = name 
WHERE name_ua IS NULL AND name IS NOT NULL;

-- Добавляем комментарии к новым полям
COMMENT ON COLUMN weddings.country_en IS 'Страна празднования на английском языке';
COMMENT ON COLUMN weddings.country_ru IS 'Страна празднования на русском языке';
COMMENT ON COLUMN weddings.country_ua IS 'Страна празднования на украинском языке';

COMMENT ON COLUMN tasks.title_en IS 'Название задания на английском языке';
COMMENT ON COLUMN tasks.title_ru IS 'Название задания на русском языке';
COMMENT ON COLUMN tasks.title_ua IS 'Название задания на украинском языке';

COMMENT ON COLUMN documents.name_en IS 'Название документа на английском языке';
COMMENT ON COLUMN documents.name_ru IS 'Название документа на русском языке';
COMMENT ON COLUMN documents.name_ua IS 'Название документа на украинском языке';

-- Добавляем поля для кастомных приветственных текстов в таблицу weddings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'weddings' 
    AND column_name = 'splash_welcome_text_en'
  ) THEN
    ALTER TABLE weddings ADD COLUMN splash_welcome_text_en TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'weddings' 
    AND column_name = 'full_welcome_text_en'
  ) THEN
    ALTER TABLE weddings ADD COLUMN full_welcome_text_en TEXT;
  END IF;
END $$;

COMMENT ON COLUMN weddings.splash_welcome_text_en IS 'Полный текст приветствия в заглушке на английском языке (включая имена)';
COMMENT ON COLUMN weddings.full_welcome_text_en IS 'Полный текст приветствия в основном контенте на английском языке (включая имена)';

