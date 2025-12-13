-- ============================================
-- Добавление полей для имен пары на разных языках
-- ============================================
-- Добавляем поля для английских и русских имен

-- Добавляем couple_name_1_en, если его еще нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'weddings' 
    AND column_name = 'couple_name_1_en'
  ) THEN
    ALTER TABLE weddings ADD COLUMN couple_name_1_en TEXT;
  END IF;
END $$;

-- Добавляем couple_name_1_ru, если его еще нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'weddings' 
    AND column_name = 'couple_name_1_ru'
  ) THEN
    ALTER TABLE weddings ADD COLUMN couple_name_1_ru TEXT;
  END IF;
END $$;

-- Добавляем couple_name_2_en, если его еще нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'weddings' 
    AND column_name = 'couple_name_2_en'
  ) THEN
    ALTER TABLE weddings ADD COLUMN couple_name_2_en TEXT;
  END IF;
END $$;

-- Добавляем couple_name_2_ru, если его еще нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'weddings' 
    AND column_name = 'couple_name_2_ru'
  ) THEN
    ALTER TABLE weddings ADD COLUMN couple_name_2_ru TEXT;
  END IF;
END $$;

-- Копируем существующие значения в русские поля (если они еще не заполнены)
UPDATE weddings 
SET couple_name_1_ru = couple_name_1 
WHERE couple_name_1_ru IS NULL AND couple_name_1 IS NOT NULL;

UPDATE weddings 
SET couple_name_2_ru = couple_name_2 
WHERE couple_name_2_ru IS NULL AND couple_name_2 IS NOT NULL;

-- Копируем существующие значения в английские поля (если они еще не заполнены)
-- Если английские имена не указаны, используем русские как fallback
UPDATE weddings 
SET couple_name_1_en = couple_name_1 
WHERE couple_name_1_en IS NULL AND couple_name_1 IS NOT NULL;

UPDATE weddings 
SET couple_name_2_en = couple_name_2 
WHERE couple_name_2_en IS NULL AND couple_name_2 IS NOT NULL;

-- Делаем новые поля обязательными (NOT NULL)
-- ВАЖНО: Выполняйте это только после того, как все данные будут заполнены
ALTER TABLE weddings 
  ALTER COLUMN couple_name_1_en SET NOT NULL,
  ALTER COLUMN couple_name_1_ru SET NOT NULL,
  ALTER COLUMN couple_name_2_en SET NOT NULL,
  ALTER COLUMN couple_name_2_ru SET NOT NULL;

