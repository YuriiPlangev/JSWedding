-- Альтернативная версия миграции (если основная не работает)
-- Добавление полей link и pinned в таблицу documents

-- Добавляем link, если его еще нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'link'
  ) THEN
    ALTER TABLE documents ADD COLUMN link TEXT;
  END IF;
END $$;

-- Добавляем pinned, если его еще нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'pinned'
  ) THEN
    ALTER TABLE documents ADD COLUMN pinned BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Делаем file_path опциональным (для документов со ссылками)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'file_path' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE documents ALTER COLUMN file_path DROP NOT NULL;
  END IF;
END $$;

