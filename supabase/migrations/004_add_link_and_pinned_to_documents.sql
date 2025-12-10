-- Добавление полей link и pinned в таблицу documents
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS link TEXT;

ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;

-- Делаем file_path опциональным (для документов со ссылками)
-- Сначала проверяем, есть ли NOT NULL constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'file_path' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE documents 
      ALTER COLUMN file_path DROP NOT NULL;
  END IF;
END $$;

