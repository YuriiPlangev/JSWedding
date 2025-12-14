-- Добавляем поле notes в таблицу weddings для хранения заметок клиента
ALTER TABLE weddings
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN weddings.notes IS 'Заметки клиента о свадьбе';

