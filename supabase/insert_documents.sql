-- ============================================
-- ДОБАВЛЕНИЕ ДОКУМЕНТОВ ДЛЯ СВАДЬБЫ
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

-- Документ 1: Рассадка (закреплен)
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
  'Рассадка',
  'https://docs.google.com/spreadsheets/d/1AtyRyMkW8lOehemVTa8iDVPWNqW5snaOVq89biFJbjU/edit?gid=0#gid=0',
  TRUE,
  NULL,
  'application/vnd.google-apps.spreadsheet'
FROM weddings 
WHERE client_id = 'USER_UUID_HERE'
LIMIT 1;

-- Документ 2: КОШТОРИС (закреплен)
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
  'КОШТОРИС',
  'https://docs.google.com/spreadsheets/d/1zFZailLMdCuUmxC-WCefOssF2ycY84j9VxvzU7Dzocs/edit?gid=0#gid=0',
  TRUE,
  NULL,
  'application/vnd.google-apps.spreadsheet'
FROM weddings 
WHERE client_id = 'USER_UUID_HERE'
LIMIT 1;

-- Документ 3: INFO LIST FREEDOM (не закреплен)
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
  'INFO LIST FREEDOM',
  'https://drive.google.com/file/d/1sesJZe-32YtZyLrpbgxn_4g6oFUcMH05/view',
  FALSE,
  NULL,
  'application/pdf'
FROM weddings 
WHERE client_id = 'USER_UUID_HERE'
LIMIT 1;

-- Документ 4: FULL TIMING PLAN (не закреплен)
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
  'FULL TIMING PLAN',
  'https://drive.google.com/file/d/19VC7NIf-pX67IVtv2Ikev33_6VDIZMMx/view',
  FALSE,
  NULL,
  'application/pdf'
FROM weddings 
WHERE client_id = 'USER_UUID_HERE'
LIMIT 1;

-- ============================================
-- ВАРИАНТ 2: Использование прямого ID свадьбы
-- ============================================
-- Если вы уже знаете ID свадьбы, используйте этот вариант:

-- INSERT INTO documents (wedding_id, name, link, pinned, file_path, mime_type)
-- VALUES 
--   ('WEDDING_ID_HERE', 'Рассадка', 'https://docs.google.com/spreadsheets/d/1AtyRyMkW8lOehemVTa8iDVPWNqW5snaOVq89biFJbjU/edit?gid=0#gid=0', TRUE, NULL, 'application/vnd.google-apps.spreadsheet'),
--   ('WEDDING_ID_HERE', 'КОШТОРИС', 'https://docs.google.com/spreadsheets/d/1zFZailLMdCuUmxC-WCefOssF2ycY84j9VxvzU7Dzocs/edit?gid=0#gid=0', TRUE, NULL, 'application/vnd.google-apps.spreadsheet'),
--   ('WEDDING_ID_HERE', 'INFO LIST FREEDOM', 'https://drive.google.com/file/d/1sesJZe-32YtZyLrpbgxn_4g6oFUcMH05/view', FALSE, NULL, 'application/pdf'),
--   ('WEDDING_ID_HERE', 'FULL TIMING PLAN', 'https://drive.google.com/file/d/19VC7NIf-pX67IVtv2Ikev33_6VDIZMMx/view', FALSE, NULL, 'application/pdf');

-- ============================================
-- ПРОВЕРКА ДОБАВЛЕННЫХ ДОКУМЕНТОВ
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
-- ORDER BY pinned DESC, created_at DESC;

