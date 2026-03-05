-- ============================================================================
-- SQL скрипт для создания тестового пользователя-подрядчика (Contractor)
-- ============================================================================
-- ВАЖНО: Перед выполнением этого скрипта ОБЯЗАТЕЛЬНО выполните миграцию!
-- Выполните файл: supabase/add_contractor_role.sql
-- ============================================================================
-- ИНСТРУКЦИЯ:
-- 1. СНАЧАЛА выполните supabase/add_contractor_role.sql в Supabase SQL Editor
-- 2. Откройте Supabase Dashboard -> Authentication -> Users -> Add User
-- 3. Создайте пользователя с email: contractor@test.com, пароль: Test123!
-- 4. Скопируйте User ID созданного пользователя
-- 5. Замените 'YOUR_CONTRACTOR_USER_ID' на реальный ID
-- 6. Выполните этот скрипт в Supabase SQL Editor
-- ============================================================================

-- Создаем профиль пользователя-подрядчика
-- ВАЖНО: Замените 'YOUR_CONTRACTOR_USER_ID' на реальный ID пользователя из auth.users
INSERT INTO profiles (id, email, name, role)
VALUES (
  'YOUR_CONTRACTOR_USER_ID', -- ⚠️ ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ID ПОЛЬЗОВАТЕЛЯ
  'contractor@test.com', -- ⚠️ ЗАМЕНИТЕ НА РЕАЛЬНЫЙ EMAIL (если использовали другой)
  'Test Contractor',
  'contractor'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- ============================================================================
-- Проверка результата (опционально)
-- Раскомментируйте запрос ниже, чтобы проверить созданные данные:
-- ============================================================================
-- SELECT 
--   p.id as contractor_id,
--   p.email,
--   p.name as contractor_name,
--   p.role
-- FROM profiles p
-- WHERE p.email = 'contractor@test.com';
