-- ============================================
-- ШАБЛОН ДЛЯ ДОБАВЛЕНИЯ ДАННЫХ О СВАДЬБЕ
-- ============================================
-- 
-- ИНСТРУКЦИЯ:
-- 1. Найдите UUID пользователя в Authentication → Users
-- 2. Замените все значения в кавычках на реальные данные
-- 3. Выполните запросы по порядку в SQL Editor
-- ============================================

-- ШАГ 1: Создание профиля клиента
-- Замените:
--   'USER_UUID_HERE' - UUID пользователя из Authentication → Users
--   'email@example.com' - Email пользователя
--   'Имя Фамилия' - Имя пользователя

INSERT INTO profiles (id, email, name, role)
VALUES (
  'USER_UUID_HERE',        -- ⚠️ ЗАМЕНИТЕ НА UUID ИЗ AUTHENTICATION
  'email@example.com',     -- ⚠️ ЗАМЕНИТЕ НА EMAIL ПОЛЬЗОВАТЕЛЯ
  'Имя Фамилия',           -- ⚠️ ЗАМЕНИТЕ НА ИМЯ ПОЛЬЗОВАТЕЛЯ
  'client'                 -- Роль: 'client' или 'organizer'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- ============================================
-- ШАГ 2: Создание организатора (если еще нет)
-- ============================================
-- Если у вас уже есть организатор, пропустите этот шаг
-- Иначе создайте пользователя-организатора в Authentication,
-- затем выполните этот запрос с его UUID

-- INSERT INTO profiles (id, email, name, role)
-- VALUES (
--   'ORGANIZER_UUID_HERE',     -- ⚠️ UUID организатора
--   'organizer@example.com',   -- Email организатора
--   'Организатор Свадеб',      -- Имя организатора
--   'organizer'
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   email = EXCLUDED.email,
--   name = EXCLUDED.name,
--   role = EXCLUDED.role;

-- ============================================
-- ШАГ 3: Создание записи о свадьбе
-- ============================================
-- Замените все значения на реальные данные
-- 
-- ВАЖНО: Добавьте RETURNING id; в конце, чтобы сразу получить ID свадьбы!

INSERT INTO weddings (
  client_id,           -- UUID клиента (из ШАГ 1)
  organizer_id,        -- UUID организатора
  couple_name_1,       -- Имя первого партнера
  couple_name_2,       -- Имя второго партнера
  wedding_date,        -- Дата свадьбы (формат: YYYY-MM-DD)
  country,             -- Страна празднования
  venue,               -- Место празднования
  guest_count          -- Число гостей
)
VALUES (
  'USER_UUID_HERE',        -- ⚠️ UUID клиента (тот же, что в ШАГ 1)
  'ORGANIZER_UUID_HERE',   -- ⚠️ UUID организатора
  'Имя1',                  -- ⚠️ Имя первого партнера
  'Имя2',                  -- ⚠️ Имя второго партнера
  '2024-06-15',            -- ⚠️ Дата свадьбы (YYYY-MM-DD)
  'Россия',                 -- ⚠️ Страна
  'Ресторан "Элегант"',    -- ⚠️ Место празднования
  100                       -- ⚠️ Число гостей
)
RETURNING id;  -- ← Это вернет ID созданной свадьбы (скопируйте его для ШАГ 4)

-- ============================================
-- ШАГ 4: Добавление заданий (опционально)
-- ============================================
-- 
-- КАК ПОЛУЧИТЬ ID СВАДЬБЫ:
-- 
-- Вариант 1 (рекомендуется): Используйте RETURNING в запросе создания свадьбы выше:
--   В конце запроса INSERT добавьте: RETURNING id;
--   Это вернет ID сразу после создания
--
-- Вариант 2: Найдите ID по client_id:
--   SELECT id, couple_name_1, couple_name_2 FROM weddings WHERE client_id = 'USER_UUID_HERE';
--
-- Вариант 3: Через Table Editor → weddings → скопируйте значение из колонки id
--
-- Затем используйте найденный ID ниже:

-- Найти ID свадьбы (выполните этот запрос, чтобы увидеть ID):
-- SELECT id, couple_name_1, couple_name_2, wedding_date 
-- FROM weddings 
-- WHERE client_id = 'USER_UUID_HERE';

-- Создание задания (замените WEDDING_ID_HERE на реальный ID из запроса выше):

-- INSERT INTO tasks (
--   wedding_id,
--   title,
--   link,
--   due_date,
--   status
-- )
-- VALUES (
--   'WEDDING_ID_HERE',      -- ⚠️ ID свадьбы (скопируйте из запроса SELECT выше)
--   'Fill out the form',    -- Название задания
--   'formlinkexample.com',  -- Ссылка (опционально, может быть NULL)
--   '2024-06-01',           -- Срок выполнения (опционально)
--   'pending'               -- Статус: 'pending', 'in_progress', 'completed'
-- );

-- ============================================
-- ПРОВЕРКА ДАННЫХ
-- ============================================
-- Выполните эти запросы, чтобы проверить созданные данные:

-- Проверить профиль:
-- SELECT * FROM profiles WHERE id = 'USER_UUID_HERE';

-- Проверить свадьбу:
-- SELECT * FROM weddings WHERE client_id = 'USER_UUID_HERE';

-- Проверить задания:
-- SELECT * FROM tasks WHERE wedding_id IN (
--   SELECT id FROM weddings WHERE client_id = 'USER_UUID_HERE'
-- );

