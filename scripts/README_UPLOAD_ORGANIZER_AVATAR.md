# Инструкция по загрузке фото организаторов

## Обзор

Фото организаторов хранятся в поле `avatar_url` таблицы `profiles`. 
**ВАЖНО**: Загрузка и обновление фото выполняется только администратором через БД, пользователи в админке не могут изменять аватары.

Есть два способа загрузки фото:

1. **Через Supabase Storage** (рекомендуется) - фото хранятся в Supabase Storage, URL сохраняется в БД
2. **Прямая ссылка** - можно указать внешнюю ссылку на фото (например, из другого сервиса)

---

## Способ 1: Загрузка через Supabase Storage (рекомендуется)

### Шаг 1: Создание bucket для аватаров

1. Откройте **Supabase Dashboard**
2. Перейдите в раздел **Storage**
3. Нажмите **New bucket**
4. Заполните данные:
   - **Name**: `organizer-avatars` (обязательно именно это имя!)
   - **Public bucket**: **ВКЛЮЧИТЕ** (bucket должен быть публичным для доступа к фото)
   - **File size limit**: рекомендуется 5MB (достаточно для фото)
   - **Allowed MIME types**: `image/jpeg,image/png,image/webp,image/gif`
5. Нажмите **Create bucket**

### Шаг 2: Настройка политики доступа для Storage (только чтение)

Выполните SQL скрипт в **Supabase SQL Editor**:

```sql
-- Политика для чтения аватаров (публичный доступ)
-- Это единственная политика, которая нужна, так как загрузка выполняется только через Dashboard
CREATE POLICY "Public can view organizer avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'organizer-avatars');
```

### Шаг 3: Загрузка фото через Dashboard

1. В **Supabase Dashboard** перейдите в **Storage** → **organizer-avatars**
2. Нажмите **Upload file**
3. Выберите фото организатора
4. **ВАЖНО**: Загрузите файл в папку с именем, равным ID организатора
   - Например, если ID организатора: `123e4567-e89b-12d3-a456-426614174000`
   - Создайте папку с таким именем и загрузите туда фото
   - Или загрузите файл с путем: `{organizer_id}/avatar.jpg`
5. После загрузки скопируйте **Public URL** файла

### Шаг 4: Обновление avatar_url в БД

Выполните SQL запрос в **Supabase SQL Editor**:

```sql
-- Замените YOUR_ORGANIZER_ID на реальный ID организатора
-- Замените YOUR_PUBLIC_URL на URL из шага 3
UPDATE profiles
SET avatar_url = 'YOUR_PUBLIC_URL'
WHERE id = 'YOUR_ORGANIZER_ID';
```

**Пример:**
```sql
UPDATE profiles
SET avatar_url = 'https://your-project.supabase.co/storage/v1/object/public/organizer-avatars/123e4567-e89b-12d3-a456-426614174000/avatar.jpg'
WHERE id = '123e4567-e89b-12d3-a456-426614174000';
```

---

## Способ 2: Прямая ссылка (внешний сервис)

Если фото уже загружено на другой сервис (например, Cloudinary, Imgur, или ваш собственный сервер):

1. Получите прямую ссылку на фото
2. Обновите `avatar_url` в БД:

```sql
UPDATE profiles
SET avatar_url = 'https://example.com/path/to/photo.jpg'
WHERE id = 'YOUR_ORGANIZER_ID';
```

---

## Проверка результата

После загрузки фото проверьте:

1. **В БД:**
```sql
SELECT id, name, email, avatar_url 
FROM profiles 
WHERE role IN ('organizer', 'main_organizer');
```

2. **В логах заданий:**
   - Откройте страницу с заданиями организатора
   - Измените статус задания
   - В логах должно отображаться фото организатора

---

## Структура хранения в Storage

```
organizer-avatars/
  ├── {organizer_id_1}/
  │   └── avatar.jpg
  ├── {organizer_id_2}/
  │   └── avatar.png
  └── {organizer_id_3}/
      └── avatar.webp
```

**Рекомендации:**
- Используйте формат: `{organizer_id}/avatar.{extension}`
- Поддерживаемые форматы: JPG, PNG, WebP, GIF
- Рекомендуемый размер: до 5MB
- Рекомендуемое разрешение: 200x200 - 500x500 пикселей

---

## Обновление фото организатора

**ВАЖНО**: Обновление выполняется только администратором через БД.

### Через Dashboard:
1. В **Supabase Dashboard** → **Storage** → `organizer-avatars`
2. Удалите старое фото (если нужно)
3. Загрузите новое фото
4. Скопируйте новый **Public URL**

### Через SQL:
```sql
-- Обновить URL фото
UPDATE profiles
SET avatar_url = 'NEW_URL'
WHERE id = 'ORGANIZER_ID';
```

---

## Troubleshooting

### Фото не отображается в логах
**Причина**: `avatar_url` не заполнен или ссылка неверная
**Решение**: 
1. Проверьте, что `avatar_url` заполнен в таблице `profiles`
2. Проверьте, что ссылка доступна (откройте в браузере)
3. Если используется Storage, убедитесь, что bucket публичный

### Ошибка при загрузке в Storage
**Причина**: Политика доступа не настроена или bucket не публичный
**Решение**: 
1. Убедитесь, что bucket `organizer-avatars` создан и помечен как публичный
2. Выполните SQL скрипт из Шага 2 (только политика для чтения)
3. Загрузка выполняется через Dashboard с правами администратора

### Bucket не найден
**Причина**: Bucket `organizer-avatars` не создан
**Решение**: Создайте bucket через Dashboard → Storage

---

## Безопасность

- ✅ Bucket `organizer-avatars` должен быть **публичным** для чтения
- ✅ Загрузка и обновление фото выполняется только администратором через Dashboard
- ✅ Пользователи в админке **не могут** изменять аватары
- ✅ Фото доступны всем для просмотра (нужно для логов)

---

## Примечание

Загрузка и обновление фото выполняется только администратором:
- Через **Supabase Dashboard** → **Storage** (загрузка файла)
- Через **Supabase SQL Editor** (обновление `avatar_url` в БД)

Пользователи в админке приложения **не имеют** возможности изменять аватары.

