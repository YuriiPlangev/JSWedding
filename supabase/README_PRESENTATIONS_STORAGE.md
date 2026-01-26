# Настройка Storage для презентаций

## Автоматическая установка (рекомендуется)

Выполните SQL миграцию:

```bash
# Из корня проекта
supabase db push
```

Или примените конкретную миграцию:

```sql
-- Выполните содержимое файла:
-- supabase/migrations/046_create_presentations_storage_bucket.sql
```

## Ручная установка через Supabase Dashboard

Если миграция не работает, создайте bucket вручную:

### 1. Создание Bucket

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Storage** → **Create a new bucket**
4. Настройки:
   - **Name**: `presentations`
   - **Public bucket**: ✅ Включено (для публичного доступа к изображениям)
   - **File size limit**: `50 MB`
   - **Allowed MIME types**: `application/pdf, image/jpeg, image/jpg, image/png`

### 2. Настройка RLS политик

Перейдите в **Storage** → **presentations** → **Policies** и создайте следующие политики:

#### Политика 1: Организаторы могут загружать
```sql
CREATE POLICY "Organizers can upload presentations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'presentations' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('organizer', 'main_organizer')
  )
);
```

#### Политика 2: Организаторы могут обновлять
```sql
CREATE POLICY "Organizers can update presentations"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'presentations' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('organizer', 'main_organizer')
  )
)
WITH CHECK (
  bucket_id = 'presentations' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('organizer', 'main_organizer')
  )
);
```

#### Политика 3: Организаторы могут удалять
```sql
CREATE POLICY "Organizers can delete presentations"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'presentations' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('organizer', 'main_organizer')
  )
);
```

#### Политика 4: Все могут читать
```sql
CREATE POLICY "Public can view presentations"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'presentations');
```

### 3. Проверка

После создания bucket и политик, попробуйте загрузить презентацию:

1. Зайдите как организатор
2. Выберите свадьбу
3. В секции "Презентация" нажмите "+ Загрузить"
4. Выберите PDF файл и заполните форму
5. Проверьте консоль браузера (F12) на наличие логов

### Структура файлов в Storage

```
presentations/
├── {wedding_id}/
│   ├── {timestamp}_{filename}.pdf          # Оригинальный PDF
│   └── {presentation_id}/
│       ├── page_1_{timestamp}.jpg         # Изображение страницы 1
│       ├── page_2_{timestamp}.jpg         # Изображение страницы 2
│       └── ...
```

## Устранение неполадок

### Ошибка: "Bucket not found"
- Bucket не создан → Создайте bucket `presentations`

### Ошибка: "new row violates row-level security policy"
- RLS политики не настроены → Примените все 4 политики выше
- Пользователь не организатор → Проверьте `profiles.role`

### Ошибка: "Failed to upload"
- Проверьте размер файла (макс. 50MB)
- Проверьте MIME type (должен быть PDF или JPEG)
- Проверьте интернет соединение

### Изображения не загружаются
- Откройте F12 → Console и проверьте ошибки
- Проверьте что `image_urls` массив не пустой в БД:
  ```sql
  SELECT id, title, image_urls FROM presentations WHERE wedding_id = 'your-wedding-id';
  ```

## Проверка работы системы

### SQL запрос для проверки презентаций:
```sql
SELECT 
  p.id,
  p.wedding_id,
  p.title,
  p.pdf_file_path,
  array_length(p.image_urls, 1) as images_count,
  COUNT(ps.id) as sections_count
FROM presentations p
LEFT JOIN presentation_sections ps ON ps.presentation_id = p.id
GROUP BY p.id;
```

### Ожидаемый результат:
- `images_count` > 0 (количество страниц PDF)
- `sections_count` >= 0 (количество разделов)
