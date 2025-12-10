-- Добавление колонки link_text в таблицу tasks
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS link_text TEXT;

