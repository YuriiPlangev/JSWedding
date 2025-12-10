-- Удаление колонки priority из таблицы tasks
ALTER TABLE tasks 
  DROP COLUMN IF EXISTS priority;

