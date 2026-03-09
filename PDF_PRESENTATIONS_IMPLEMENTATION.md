# PDF-to-Images Presentation System - Implementation Guide

## 📋 Overview

Система для загрузки PDF-презентаций свадеб и преобразования их в изображения для быстрого отображения с поддержкой разделов (секций) для удобной навигации.

## 🏗️ Architecture

### Database Changes

**Migration**: `supabase/migrations/045_add_image_urls_to_presentations.sql`

Добавлена новая колонка:

```sql
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS image_urls TEXT[];
```

Эта колонка хранит массив URL изображений, созданных из страниц PDF.

### Backend Components

#### 1. Edge Function: `pdf-to-images`

**Путь**: `supabase/functions/pdf-to-images/index.ts`

Функция выполняет:

1. Загружает PDF файл из Supabase Storage
2. Конвертирует каждую страницу PDF в изображение (PNG)
3. Загружает изображения обратно в Storage
4. Обновляет запись презентации с массивом `image_urls`

**Зависимости**:

- `pdf-lib` - для работы с PDF
- `pdf2pic` - для конвертации PDF в изображения

**Использование**:

```bash
# Deploy
supabase functions deploy pdf-to-images
```

#### 2. Service: `presentationServiceExtended`

**Путь**: `src/services/weddingService.ts`

Методы:

- `uploadPresentationPdf()` - загрузить PDF в Storage
- `createPresentation()` - создать запись в БД
- `triggerPdfToImages()` - вызвать Edge Function для конвертации
- `updatePresentationSections()` - сохранить разделы (секции)
- `getPresentation()` - получить презентацию с изображениями
- `deletePresentation()` - удалить презентацию и все файлы

### Frontend Components

#### 1. PresentationUploadModal

**Путь**: `src/components/modals/PresentationUploadModal.tsx`

Модальное окно для загрузки PDF с поддержкой:

- Выбор PDF файла
- Добавление разделов (секций) с номерами страниц
- Валидация (макс 100MB, только PDF)
- Отображение статуса загрузки

**Props**:

```tsx
{
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: {
    title: string;
    pdfFile: File;
    sections: Array<{ title: string; page_number: number }>;
  }) => Promise<void>;
  isLoading?: boolean;
}
```

#### 2. PresentationViewer

**Путь**: `src/components/PresentationViewer.tsx`

Компонент для просмотра image-based презентации:

- Отображает изображения постранично
- Кнопки навигации по разделам (секциям)
- Кнопки "Назад" и "Вперёд"
- Счётчик страниц
- Загрузка и обработка ошибок

**Props**:

```tsx
{
  weddingId: string;
}
```

### Integration in OrganizerDashboard

**Путь**: `src/pages/OrganizerDashboard.tsx`

#### Обработчик загрузки

```tsx
const handleUploadPresentation = async (data: {
  title: string;
  pdfFile: File;
  sections: Array<{ title: string; page_number: number }>;
}) => {
  // 1. Upload PDF
  // 2. Create presentation record
  // 3. Trigger PDF-to-images conversion
  // 4. Save sections
  // 5. Reload wedding details
};
```

#### Обработчик удаления

```tsx
const handleDeletePresentation = async () => {
  // 1. Get presentation
  // 2. Delete all files from Storage
  // 3. Delete DB record
  // 4. Reload wedding details
};
```

#### UI в wedding-details view

```tsx
<div className="bg-white border border-[#00000033] rounded-lg p-6 mb-6">
  <h3>Презентация</h3>
  {selectedWedding.presentation?.image_urls?.length > 0 ? (
    <>
      <PresentationViewer weddingId={selectedWedding.id} />
      <button onClick={handleDeletePresentation}>Удалить</button>
    </>
  ) : (
    <button onClick={() => setShowPresentationModal(true)}>
      Загрузить PDF
    </button>
  )}
</div>
```

## 🔄 Workflow

### Загрузка презентации (Organizer)

1. **Нажать** кнопку "Загрузить PDF" в деталях ивента
2. **Заполнить** форму:
   - Название презентации
   - Выбрать PDF файл
   - (Опционально) Добавить разделы с номерами страниц
3. **Отправить** форму
4. **Система**:
   - Загружает PDF в `presentations/{weddingId}/...`
   - Создаёт запись в таблице `presentations`
   - Вызывает Edge Function `pdf-to-images`
   - Edge Function конвертирует PDF в изображения
   - Edge Function обновляет `image_urls[]` в БД
   - Сохраняет разделы в таблице `presentation_sections`
5. **UI обновляется** с новой презентацией

### Просмотр презентации (Organizer)

1. **Открыть** детали ивента
2. **Компонент PresentationViewer**:
   - Загружает презентацию из БД
   - Отображает первое изображение
   - Показывает кнопки навигации по разделам
   - Позволяет листать страницы

### Удаление презентации (Organizer)

1. **Нажать** кнопку "Удалить презентацию"
2. **Подтвердить** в диалоговом окне
3. **Система**:
   - Удаляет PDF файл из Storage
   - Удаляет все изображения из Storage
   - Удаляет запись из таблицы `presentations`
   - Удаляет все секции из `presentation_sections`
4. **UI обновляется**

## 📊 Database Schema

### presentations table

```sql
id UUID PRIMARY KEY
wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE
title TEXT NOT NULL
type TEXT CHECK (type IN ('company', 'wedding')) DEFAULT 'wedding'
pdf_file_path TEXT -- Путь в Storage
pdf_file_size BIGINT
image_urls TEXT[] -- Массив URL конвертированных изображений
is_default BOOLEAN DEFAULT FALSE
order_index INTEGER DEFAULT 0
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### presentation_sections table

```sql
id UUID PRIMARY KEY
presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE
title TEXT NOT NULL -- Название раздела
page_number INTEGER NOT NULL -- Номер страницы в PDF
order_index INTEGER DEFAULT 0
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

## 🗂️ File Structure

```
src/
├── components/
│   ├── PresentationViewer.tsx          # Компонент просмотра
│   └── modals/
│       └── PresentationUploadModal.tsx # Модал загрузки
├── pages/
│   └── OrganizerDashboard.tsx          # Интеграция handlers
└── services/
    └── weddingService.ts               # presentationServiceExtended

supabase/
├── migrations/
│   └── 045_add_image_urls_to_presentations.sql
└── functions/
    └── pdf-to-images/
        └── index.ts
```

## ⚙️ Setup Instructions

### 1. Apply Migration

```bash
supabase migration up
```

### 2. Deploy Edge Function

```bash
supabase functions deploy pdf-to-images
```

### 3. Install Dependencies (if needed)

```bash
npm install pdf-lib pdf2pic
```

### 4. Update Environment

Убедитесь, что `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` установлены.

## 🐛 Troubleshooting

### Edge Function не работает

- Проверьте логи: `supabase functions logs pdf-to-images`
- Убедитесь, что PDF файл загружен в Storage
- Проверьте права доступа RLS для `presentations` таблицы

### Изображения не загружаются

- Проверьте, что `image_urls` не пусты в БД
- Убедитесь, что файлы существуют в Storage
- Проверьте CORS настройки для Supabase Storage

### Конвертация занимает слишком долго

- Это нормально для больших PDF файлов
- Edge Function имеет timeout, увеличьте если необходимо
- Рассмотрите оптимизацию размера PDF перед загрузкой

## 🔒 Security

- **RLS Policies**: Организаторы могут управлять только своими презентациями
- **File Validation**: Проверка типа (PDF) и размера файла (макс 100MB)
- **Storage Path**: Организованные по `wedding_id` для изоляции данных
- **Signed URLs**: Изображения загружаются через подписанные URL

## 📈 Future Enhancements

- [ ] Поддержка drag-and-drop загрузки
- [ ] Превью файла перед загрузкой
- [ ] Кэширование изображений на клиенте
- [ ] Поддержка других форматов (PPTX, DOCX)
- [ ] Автоматическое создание разделов (OCR)
- [ ] Аннотации на изображениях
