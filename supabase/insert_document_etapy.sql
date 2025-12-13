-- ============================================
-- ДОБАВЛЕНИЕ ДОКУМЕНТА "Этапы подготовки"
-- ============================================
-- 
-- ИНСТРУКЦИЯ:
-- 1. Замените 'USER_UUID_HERE' на UUID клиента из Authentication → Users
-- 2. Выполните запрос в SQL Editor
-- ============================================

-- Найти ID свадьбы (выполните этот запрос, чтобы увидеть ID):
-- SELECT id, couple_name_1, couple_name_2, wedding_date 
-- FROM weddings 
-- WHERE client_id = 'USER_UUID_HERE';

-- ============================================
-- ВАРИАНТ 1: Использование подзапроса (рекомендуется)
-- ============================================
-- Этот вариант автоматически найдет wedding_id по client_id

-- Документ: Этапы подготовки (закреплен, без ссылки)
INSERT INTO documents (
  wedding_id,
  name,
  link,
  pinned,
  file_path,
  mime_type
)
SELECT 
  id,
  'Этапы подготовки',
  NULL,
  TRUE,
  NULL,
  NULL
FROM weddings 
WHERE client_id = 'USER_UUID_HERE'
LIMIT 1;

-- ============================================
-- ВАРИАНТ 2: Использование прямого ID свадьбы
-- ============================================
-- Если вы уже знаете ID свадьбы, используйте этот вариант:

-- INSERT INTO documents (wedding_id, name, link, pinned, file_path, mime_type)
-- VALUES 
--   ('WEDDING_ID_HERE', 'Этапы подготовки', NULL, TRUE, NULL, NULL);

-- ============================================
-- ПРОВЕРКА ДОБАВЛЕННОГО ДОКУМЕНТА
-- ============================================
-- SELECT 
--   id,
--   name,
--   link,
--   pinned,
--   created_at
-- FROM documents 
-- WHERE wedding_id IN (
--   SELECT id FROM weddings WHERE client_id = 'USER_UUID_HERE'
-- )
-- AND name = 'Этапы подготовки';

