-- Удаление многоязычных полей из task_groups
-- Если таблица уже создана с полями name_en, name_ru, name_ua, удаляем их

ALTER TABLE task_groups 
  DROP COLUMN IF EXISTS name_en,
  DROP COLUMN IF EXISTS name_ru,
  DROP COLUMN IF EXISTS name_ua;





