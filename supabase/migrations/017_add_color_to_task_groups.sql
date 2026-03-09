-- Добавление поля color в таблицу task_groups
ALTER TABLE task_groups 
  ADD COLUMN IF NOT EXISTS color TEXT;





