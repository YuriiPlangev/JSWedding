-- ============================================
-- ДОБАВЛЕНИЕ ЗАДАНИЙ ДЛЯ СВАДЬБЫ
-- ============================================
-- 
-- ИНСТРУКЦИЯ:
-- 1. Замените 'USER_UUID_HERE' на UUID клиента из Authentication → Users
-- 2. Выполните запросы в SQL Editor
-- ============================================

-- Найти ID свадьбы (выполните этот запрос, чтобы увидеть ID):
-- SELECT id, couple_name_1, couple_name_2, wedding_date 
-- FROM weddings 
-- WHERE client_id = 'USER_UUID_HERE';

-- ============================================
-- ВАРИАНТ 1: Использование подзапроса (рекомендуется)
-- ============================================
-- Этот вариант автоматически найдет wedding_id по client_id

-- Задание 1: Fill out the form (не выполнено, со ссылкой)
INSERT INTO tasks (
  wedding_id,
  title,
  link,
  status
)
SELECT 
  id,
  'Fill out the form',
  'formlinkexample.com',
  'pending'
FROM weddings 
WHERE client_id = 'USER_UUID_HERE'
LIMIT 1;

-- Задание 2: Book the photographer (не выполнено, без ссылки)
INSERT INTO tasks (
  wedding_id,
  title,
  link,
  status
)
SELECT 
  id,
  'Book the photographer',
  NULL,
  'pending'
FROM weddings 
WHERE client_id = 'USER_UUID_HERE'
LIMIT 1;

-- Задание 3: Organize the Guests placement (выполнено, со ссылкой)
INSERT INTO tasks (
  wedding_id,
  title,
  link,
  status
)
SELECT 
  id,
  'Organize the Guests placement',
  'guestsplacement.com',
  'completed'
FROM weddings 
WHERE client_id = 'USER_UUID_HERE'
LIMIT 1;

-- ============================================
-- ВАРИАНТ 2: Использование прямого ID свадьбы
-- ============================================
-- Если вы уже знаете ID свадьбы, используйте этот вариант:

-- INSERT INTO tasks (wedding_id, title, link, status)
-- VALUES 
--   ('WEDDING_ID_HERE', 'Fill out the form', 'formlinkexample.com', 'pending'),
--   ('WEDDING_ID_HERE', 'Book the photographer', NULL, 'pending'),
--   ('WEDDING_ID_HERE', 'Organize the Guests placement', 'guestsplacement.com', 'completed');

-- ============================================
-- ПРОВЕРКА ДОБАВЛЕННЫХ ЗАДАНИЙ
-- ============================================
-- SELECT 
--   id,
--   title,
--   link,
--   status,
--   created_at
-- FROM tasks 
-- WHERE wedding_id IN (
--   SELECT id FROM weddings WHERE client_id = 'USER_UUID_HERE'
-- )
-- ORDER BY created_at DESC;

