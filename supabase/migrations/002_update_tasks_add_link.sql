-- Изменение структуры таблицы tasks: замена description на link
ALTER TABLE tasks 
  DROP COLUMN IF EXISTS description,
  ADD COLUMN IF NOT EXISTS link TEXT;

