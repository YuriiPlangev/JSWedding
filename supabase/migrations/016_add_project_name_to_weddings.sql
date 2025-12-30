-- Добавление поля project_name в таблицу weddings
ALTER TABLE weddings 
  ADD COLUMN IF NOT EXISTS project_name TEXT;



