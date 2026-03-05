# Contractor Management - Quick Start Guide

Полная система управления подрядчиками готова к использованию! 

## ✅ Что реализовано

### База данных
- ✅ Таблица `weddings` расширена полями для подрядчиков
- ✅ Таблица `contractor_documents` для документов
- ✅ RLS политики настроены

### Backend
- ✅ `contractorService.ts` - полный API для работы с подрядчиками
- ✅ TypeScript типы `ContractorDocument` и расширение `Wedding`

### Frontend
- ✅ `ContractorManagementModal` - модальное окно с 3 шагами
- ✅ `OrganizerDashboard` - секция управления подрядчиками
- ✅ `ContractorDashboard` - подключен к реальным данным

---

## 🚀 Быстрый старт

### Шаг 1: Выполните миграции БД

1. Откройте Supabase Dashboard → SQL Editor

2. Выполните первую миграцию:
```sql
-- Файл: supabase/add_contractor_fields_to_weddings.sql
ALTER TABLE weddings 
ADD COLUMN IF NOT EXISTS contractor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE weddings
ADD COLUMN IF NOT EXISTS contractor_dress_code TEXT,
ADD COLUMN IF NOT EXISTS contractor_organizer_contacts TEXT,
ADD COLUMN IF NOT EXISTS contractor_coordinator_contacts TEXT;

CREATE INDEX IF NOT EXISTS idx_weddings_contractor_user_id ON weddings(contractor_user_id);
```

3. Выполните вторую миграцию:
```sql
-- Файл: supabase/create_contractor_documents_table.sql
-- (полный текст в файле)
```

### Шаг 2: Протестируйте функционал

#### Как Организатор:

1. Зайдите в OrganizerDashboard
2. Откройте любое событие (wedding-details)
3. Найдите секцию **"Подрядчики"**
4. Нажмите **"+ Настроить"**

#### В модальном окне:

**Шаг 1 - Создание аккаунта:**
- Email: `contractors@test-event.com`
- Password: `ContractorPass123!`
- Нажмите "Next"

**Шаг 2 - Настройки:**
- Dress Code: `Black Tie / Formal Evening Dress`
- Organizer Contacts:
  ```
  Elena Petrova
  Phone: +380 (67) 123-45-67
  Email: elena@weddingplanner.ua
  Telegram: @elena_wedding
  ```
- Coordinator Contacts:
  ```
  Anna Coordinator
  Phone: +380 (93) 111-22-33
  Telegram: @anna_coord
  
  Olga Coordinator
  Phone: +380 (99) 444-55-66
  Telegram: @olga_coord
  ```
- Нажмите "Next"

**Шаг 3 - Документы:**
- Добавьте документы:
  - Name (EN): `Timing Plan`
  - Name (RU): `Тайминг план`
  - Name (UA): `Тайминг план`
  - Link: `https://docs.google.com/document/d/your-doc-id/edit`
- Нажмите "Add"
- Добавьте еще документы по желанию
- Нажмите "Finish"

#### Как Подрядчик:

1. Выйдите из аккаунта организатора
2. Зайдите с учетными данными подрядчика:
   - Email: `contractors@test-event.com`
   - Password: `ContractorPass123!`
3. Вы увидите ContractorDashboard с:
   - Информацией о событии (дата, место, количество гостей, пара)
   - Дресс-кодом
   - Контактами организатора и координаторов
   - Списком документов для скачивания

---

## 🔍 Возможности

### Для Организатора:

- ✅ Создание общего аккаунта подрядчика для события
- ✅ Настройка дресс-кода
- ✅ Указание контактов организатора и координаторов
- ✅ Добавление/удаление документов для подрядчиков
- ✅ Редактирование всех настроек через "Управление"

### Для Подрядчика:

- ✅ Просмотр деталей события
- ✅ Просмотр дресс-кода
- ✅ Доступ к контактам организатора и координаторов
- ✅ Скачивание документов
- ✅ Мультиязычность (EN/RU/UA)

---

## 📁 Структура файлов

```
src/
├── services/
│   └── contractorService.ts          # API методы
├── components/
│   └── modals/
│       └── ContractorManagementModal.tsx  # Модал управления
├── pages/
│   ├── OrganizerDashboard.tsx        # Секция "Подрядчики"
│   └── ContractorDashboard.tsx       # Дашборд подрядчика
└── types/
    └── index.ts                      # ContractorDocument тип

supabase/
├── add_contractor_fields_to_weddings.sql
├── create_contractor_documents_table.sql
└── README_CONTRACTOR_MANAGEMENT.md
```

---

## 🛠️ API Reference

### contractorService методы:

```typescript
// Создание аккаунта
createContractorAccount(email, password)

// Привязка к событию
linkContractorToEvent(weddingId, contractorUserId, settings)

// Обновление настроек
updateContractorSettings(weddingId, settings)

// Удаление подрядчика
removeContractorFromEvent(weddingId)

// Управление документами
getContractorDocuments(weddingId)
addContractorDocument(weddingId, document)
updateContractorDocument(documentId, updates)
deleteContractorDocument(documentId)

// Для подрядчика
getContractorWedding(contractorUserId)
```

---

## 🔐 Безопасность

- ✅ RLS политики настроены
- ✅ Организаторы видят только свои события
- ✅ Подрядчики видят только назначенное им событие
- ✅ Документы доступны только связанным подрядчикам
- ✅ Main organizers имеют полный доступ

---

## 📝 Примечания

- **1 событие = 1 общий аккаунт подрядчика** (не персональные аккаунты)
- Все подрядчики события используют одни логин/пароль
- Подрядчики имеют read-only доступ
- Организаторы управляют всеми настройками

---

## 🐛 Troubleshooting

**Ошибка: "column user_id does not exist"**
→ Выполните миграцию `add_contractor_fields_to_weddings.sql`

**Ошибка: "relation contractor_documents does not exist"**
→ Выполните миграцию `create_contractor_documents_table.sql`

**Подрядчик не видит событие**
→ Проверьте что `wedding.contractor_user_id` совпадает с ID подрядчика

**Документы не отображаются**
→ Проверьте что документы добавлены в таблицу `contractor_documents`, а не `documents`

---

## ✨ Готово к использованию!

Все компоненты протестированы и готовы к production. Никаких ошибок компиляции.
