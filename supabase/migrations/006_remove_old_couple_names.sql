-- ============================================
-- Удаление старых полей couple_name_1 и couple_name_2
-- ============================================
-- ВАЖНО: Выполняйте эту миграцию только после того, как все данные
-- будут перенесены в новые поля (couple_name_1_en, couple_name_1_ru, etc.)

-- Удаляем couple_name_1, если он существует
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'weddings' 
    AND column_name = 'couple_name_1'
  ) THEN
    ALTER TABLE weddings DROP COLUMN couple_name_1;
  END IF;
END $$;

-- Удаляем couple_name_2, если он существует
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'weddings' 
    AND column_name = 'couple_name_2'
  ) THEN
    ALTER TABLE weddings DROP COLUMN couple_name_2;
  END IF;
END $$;

