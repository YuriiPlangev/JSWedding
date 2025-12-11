# Инструкция по созданию пользователя Константин & Диана

## Вариант 1: Через Supabase Dashboard (Рекомендуется)

### Шаг 1: Создайте пользователя в Authentication

1. Откройте Supabase Dashboard
2. Перейдите в раздел **Authentication** -> **Users**
3. Нажмите **Add user** -> **Create new user**
4. Заполните данные:
   - **Email**: `konstantin.diana@example.com` (или любой другой email)
   - **Password**: создайте надежный пароль
   - **Auto Confirm User**: включите эту опцию (чтобы не требовалось подтверждение email)
5. Нажмите **Create user**
6. **Скопируйте User ID** - он понадобится в следующем шаге

### Шаг 2: Найдите ID организатора

1. В Supabase Dashboard перейдите в **Table Editor**
2. Откройте таблицу `profiles`
3. Найдите запись с `role = 'organizer'`
4. **Скопируйте ID** организатора

### Шаг 3: Выполните SQL скрипт

1. В Supabase Dashboard перейдите в **SQL Editor**
2. Откройте файл `scripts/create_user_konstantin_diana.sql`
3. Замените в скрипте:
   - `YOUR_CLIENT_USER_ID` на User ID из шага 1
   - `YOUR_ORGANIZER_ID` на ID организатора из шага 2
   - `konstantin.diana@example.com` на реальный email (если используете другой)
4. Выполните скрипт (Run)

### Шаг 4: Проверьте результат

После выполнения скрипта проверьте:
- В таблице `profiles` должна появиться запись для нового пользователя
- В таблице `weddings` должна появиться запись с данными:
  - `couple_name_1`: Константин
  - `couple_name_2`: Диана
  - `wedding_date`: 2026-05-28
  - `venue`: One & Only - заведение
  - `country`: Черногория
- В таблице `documents` должны появиться 2 незакрепленных документа:
  - **Бюджет** - ссылка на Google Sheets
  - **Timing plan** - ссылка на Google Docs

## Вариант 2: Через клиентский код (Требует подтверждения email)

Если хотите создать пользователя программно через приложение:

1. Используйте функцию из `src/utils/createUserClient.ts`
2. Вызовите в консоли браузера (после авторизации):

```typescript
import { createKonstantinDianaClient } from './utils/createUserClient';

await createKonstantinDianaClient(
  'konstantin.diana@example.com',
  'SecurePassword123!',
  'YOUR_ORGANIZER_ID'
);
```

**ВАЖНО**: При использовании этого метода пользователю нужно будет подтвердить email.

## Данные для создания:

### Пользователь и свадьба:
- **Имена**: Константин & Диана
- **Дата свадьбы**: 28.05.2026 (в БД: 2026-05-28)
- **Место**: One & Only - заведение
- **Страна**: Черногория

### Документы (незакрепленные):
1. **Бюджет** - Google Sheets: https://docs.google.com/spreadsheets/d/1qZ68hrd6r_0pbcZOlUHd1Lyb5xCKOk2StU_OV9NKVPQ/edit?usp=drivesdk
2. **Timing plan** - Google Docs: https://docs.google.com/document/d/19jDdi-Pq7Kuhaywxf5D0YnqbaRddIKUq/edit?usp=drivesdk&ouid=108177359277922607105&rtpof=true&sd=true

## После создания:

Новый пользователь сможет войти в систему, используя:
- Email, который был указан при создании
- Пароль, который был установлен

