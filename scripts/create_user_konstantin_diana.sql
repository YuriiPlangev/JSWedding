-- ============================================================================
-- SQL скрипт для создания пользователя Константин & Диана
-- ============================================================================
-- ИНСТРУКЦИЯ:
-- 1. Сначала создайте пользователя в Supabase Dashboard -> Authentication -> Users
-- 2. Скопируйте User ID созданного пользователя
-- 3. Найдите ID организатора в таблице profiles (где role = 'organizer')
-- 4. Замените YOUR_CLIENT_USER_ID и YOUR_ORGANIZER_ID на реальные ID
-- 5. Выполните этот скрипт в Supabase SQL Editor
-- ============================================================================

-- Шаг 1: Создаем профиль пользователя
-- ВАЖНО: Замените 'YOUR_CLIENT_USER_ID' на реальный ID пользователя из auth.users
-- ВАЖНО: Замените 'konstantin.diana@example.com' на email, который использовали при создании пользователя
INSERT INTO profiles (id, email, name, role)
VALUES (
  'YOUR_CLIENT_USER_ID', -- ⚠️ ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ID ПОЛЬЗОВАТЕЛЯ
  'konstantin.diana@example.com', -- ⚠️ ЗАМЕНИТЕ НА РЕАЛЬНЫЙ EMAIL
  'Константин & Диана',
  'client'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- Шаг 2: Создаем свадьбу
-- ВАЖНО: Замените 'YOUR_CLIENT_USER_ID' и 'YOUR_ORGANIZER_ID' на реальные ID
INSERT INTO weddings (
  client_id,
  organizer_id,
  couple_name_1,
  couple_name_2,
  wedding_date,
  venue,
  country,
  guest_count
)
VALUES (
  'YOUR_CLIENT_USER_ID', -- ⚠️ ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ID КЛИЕНТА (тот же что выше)
  'YOUR_ORGANIZER_ID', -- ⚠️ ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ID ОРГАНИЗАТОРА
  'Константин',
  'Диана',
  '2026-05-28', -- Дата в формате YYYY-MM-DD
  'One & Only - заведение',
  'Черногория',
  0 -- Количество гостей (можно изменить)
);

-- Шаг 3: Создаем документы для свадьбы
-- ВАЖНО: Эти запросы автоматически найдут wedding_id по client_id и именам пары
INSERT INTO documents (
  wedding_id,
  name,
  link,
  pinned
)
SELECT 
  w.id,
  'Бюджет',
  'https://docs.google.com/spreadsheets/d/1qZ68hrd6r_0pbcZOlUHd1Lyb5xCKOk2StU_OV9NKVPQ/edit?usp=drivesdk',
  false
FROM weddings w
JOIN profiles p ON w.client_id = p.id
WHERE w.couple_name_1 = 'Константин' 
  AND w.couple_name_2 = 'Диана'
  AND p.id = 'YOUR_CLIENT_USER_ID'; -- ⚠️ ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ID КЛИЕНТА

INSERT INTO documents (
  wedding_id,
  name,
  link,
  pinned
)
SELECT 
  w.id,
  'Timing plan',
  'https://docs.google.com/document/d/19jDdi-Pq7Kuhaywxf5D0YnqbaRddIKUq/edit?usp=drivesdk&ouid=108177359277922607105&rtpof=true&sd=true',
  false
FROM weddings w
JOIN profiles p ON w.client_id = p.id
WHERE w.couple_name_1 = 'Константин' 
  AND w.couple_name_2 = 'Диана'
  AND p.id = 'YOUR_CLIENT_USER_ID'; -- ⚠️ ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ID КЛИЕНТА

-- ============================================================================
-- Проверка результата (опционально)
-- Раскомментируйте запрос ниже, чтобы проверить созданные данные:
-- ============================================================================
-- SELECT 
--   w.id as wedding_id,
--   w.couple_name_1,
--   w.couple_name_2,
--   w.wedding_date,
--   w.venue,
--   w.country,
--   p.id as client_id,
--   p.email,
--   p.name as client_name
-- FROM weddings w
-- JOIN profiles p ON w.client_id = p.id
-- WHERE w.couple_name_1 = 'Константин' AND w.couple_name_2 = 'Диана';

-- Проверка документов (опционально)
-- SELECT 
--   d.id,
--   d.name,
--   d.link,
--   d.pinned,
--   w.couple_name_1 || ' & ' || w.couple_name_2 as couple
-- FROM documents d
-- JOIN weddings w ON d.wedding_id = w.id
-- WHERE w.couple_name_1 = 'Константин' AND w.couple_name_2 = 'Диана'
-- ORDER BY d.created_at;

