-- ============================================
-- ОБНОВЛЕНИЕ ИМЕН ПАРЫ ДЛЯ МНОГОЯЗЫЧНОСТИ
-- ============================================
-- 
-- ИНСТРУКЦИЯ:
-- 1. Замените 'USER_UUID_HERE' на UUID клиента из Authentication → Users
-- 2. Замените имена на реальные значения
-- 3. Выполните запрос в SQL Editor
-- ============================================

-- Пример обновления для пары Константин & Диана
UPDATE weddings 
SET 
  couple_name_1_en = 'Konstantin',
  couple_name_1_ru = 'Константин',
  couple_name_2_en = 'Diana',
  couple_name_2_ru = 'Диана'
WHERE client_id = 'USER_UUID_HERE'
  AND couple_name_1 = 'Константин'
  AND couple_name_2 = 'Диана';

-- ============================================
-- ПРОВЕРКА ОБНОВЛЕННЫХ ДАННЫХ
-- ============================================
-- SELECT 
--   id,
--   couple_name_1,
--   couple_name_1_en,
--   couple_name_1_ru,
--   couple_name_2,
--   couple_name_2_en,
--   couple_name_2_ru
-- FROM weddings 
-- WHERE client_id = 'USER_UUID_HERE';

