# Документация: Система загрузки и просмотра PDF презентаций

## 📋 Обзор

Реализована новая система для загрузки и просмотра PDF презентаций в приложении. Система поддерживает:

- ✅ Загрузку PDF файлов организаторами
- ✅ Создание "частей" (разделов) презентации с указанием номеров страниц
- ✅ Просмотр представлений в аккордеоне
- ✅ Сохранение нескольких презентаций на одну свадьбу
- ✅ Обратную совместимость со старой системой (изображения)

## 🏗️ Архитектура

### Таблицы БД

#### `presentations`

```sql
id UUID PRIMARY KEY
wedding_id UUID REFERENCES weddings
title TEXT -- Название презентации
type TEXT -- 'company' | 'wedding'
pdf_url TEXT -- Signed URL для просмотра
pdf_file_path TEXT -- Путь в Storage
pdf_file_size BIGINT
is_default BOOLEAN -- Является ли презентацией компании по умолчанию
order_index INTEGER -- Порядок отображения
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### `presentation_sections`

```sql
id UUID PRIMARY KEY
presentation_id UUID REFERENCES presentations
title TEXT -- Название части (напр. "Концепция")
page_number INTEGER -- Номер страницы
order_index INTEGER -- Порядок в презентации
created_at TIMESTAMP
updated_at TIMESTAMP
```

### Компоненты

#### `PresentationUploadModal`

Модальное окно для загрузки PDF презентаций:

- Ввод названия презентации
- Выбор PDF файла
- Добавление частей (название + номер страницы)
- Валидация данных

#### `PresentationViewer`

Компонент для просмотра PDF презентаций:

- Левая панель с аккордеоном списка презентаций
- Правая часть с просмотром PDF
- Навигация по страницам при клике на часть

#### `Presentation` (старый)

Сохранен для обратной совместимости - отображает презентации из изображений

### API Функции (presentationService)

```typescript
// Загрузить PDF файл
uploadPresentationPDF(weddingId: string, file: File): Promise<string | null>

// Получить все презентации для свадьбы
getPresentationsByWedding(weddingId: string): Promise<CustomPresentation[]>

// Создать новую презентацию с частями
createPresentation(
  weddingId: string,
  title: string,
  pdfUrl: string,
  pdfFilePath: string,
  pdfFileSize: number,
  sections: Array<{ title: string; page_number: number }>
): Promise<CustomPresentation | null>

// Обновить презентацию
updatePresentation(presentationId: string, updates: any): Promise<CustomPresentation | null>

// Удалить презентацию
deletePresentation(presentationId: string, filePath?: string): Promise<boolean>

// Добавить секцию к презентации
addPresentationSection(
  presentationId: string,
  title: string,
  pageNumber: number
): Promise<CustomPresentationSection | null>

// Удалить секцию
deletePresentationSection(sectionId: string): Promise<boolean>

// Обновить порядок презентаций
updatePresentationsOrder(
  updates: Array<{ id: string; order_index: number }>
): Promise<boolean>
```

## 🔧 Инструкция по внедрению в OrganizerDashboard

### 1. Импорты

```tsx
import { PresentationUploadModal } from "../components/modals";
import { presentationService } from "../services/weddingService";
```

### 2. Состояния

```tsx
const [showPresentationUploadModal, setShowPresentationUploadModal] =
  useState(false);
const [uploadingPresentation, setUploadingPresentation] = useState(false);
```

### 3. Обработчик загрузки

```tsx
const handleUploadPresentation = async (data: {
  title: string;
  pdfFile: File;
  sections: Array<{ title: string; page_number: number }>;
}) => {
  if (!selectedWedding?.id) return;

  try {
    setUploadingPresentation(true);

    // 1. Загружаем PDF файл
    const pdfUrl = await presentationService.uploadPresentationPDF(
      selectedWedding.id,
      data.pdfFile,
    );

    if (!pdfUrl) {
      throw new Error("Не удалось загрузить PDF файл");
    }

    // 2. Создаем презентацию с частями
    const presentation = await presentationService.createPresentation(
      selectedWedding.id,
      data.title,
      pdfUrl,
      `presentations/${selectedWedding.id}/${Date.now()}_${data.pdfFile.name}`,
      data.pdfFile.size,
      data.sections,
    );

    if (presentation) {
      // Обновляем список свадеб/презентаций
      // В зависимости от вашей архитектуры
      setShowPresentationUploadModal(false);
      // Показываем успешное сообщение
    }
  } catch (error) {
    console.error("Error uploading presentation:", error);
  } finally {
    setUploadingPresentation(false);
  }
};
```

### 4. Модальное окно в JSX

```tsx
<PresentationUploadModal
  isOpen={showPresentationUploadModal}
  onClose={() => setShowPresentationUploadModal(false)}
  onUpload={handleUploadPresentation}
  isLoading={uploadingPresentation}
/>
```

### 5. Кнопка для открытия модала

```tsx
<button
  onClick={() => setShowPresentationUploadModal(true)}
  className="px-4 py-2 bg-black text-white rounded-lg font-forum"
>
  + Загрузить презентацию
</button>
```

## 🎨 Инструкция по внедрению в ClientDashboard

### 1. Импорты

```tsx
import { useCustomPresentations } from "../hooks";
import PresentationViewer from "../components/PresentationViewer";
```

### 2. Загрузка презентаций

```tsx
const { data: customPresentations = [] } = useCustomPresentations(wedding?.id);
```

### 3. Отображение в JSX

```tsx
{
  /* Новые PDF презентации */
}
{
  customPresentations && customPresentations.length > 0 && (
    <PresentationViewer
      presentations={customPresentations}
      currentLanguage={currentLanguage}
    />
  );
}

{
  /* Старая презентация из изображений (для обратной совместимости) */
}
{
  wedding && !customPresentations?.length && (
    <Presentation
      presentation={wedding.presentation}
      currentLanguage={currentLanguage}
    />
  );
}
```

## 📦 Типы данных

### CustomPresentation

```typescript
interface CustomPresentation {
  id: string;
  wedding_id: string;
  title: string;
  type: "company" | "wedding";
  pdf_url?: string;
  pdf_file_path?: string;
  pdf_file_size?: number;
  is_default: boolean;
  order_index: number;
  sections?: CustomPresentationSection[];
  created_at: string;
  updated_at: string;
}
```

### CustomPresentationSection

```typescript
interface CustomPresentationSection {
  id: string;
  presentation_id: string;
  title: string;
  page_number: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}
```

## 🔐 Безопасность (RLS Политики)

Все таблицы защищены RLS политиками:

- Клиенты видят только презентации своих свадеб
- Организаторы видят все презентации
- Главный организатор может управлять всеми

## 💾 Хранение файлов

PDF файлы хранятся в Supabase Storage:

- Бакет: `wedding-documents`
- Путь: `presentations/{wedding_id}/{timestamp}_{filename}`
- Используются signed URLs с сроком действия 1 год

## 📌 Миграция БД

Миграция расположена в:

```
supabase/migrations/044_presentations_refactor.sql
```

Выполните с помощью:

```bash
supabase db push
```

## 🎯 Примеры использования

### Загрузка презентации

```typescript
const data = {
  title: "Ольга Португалия",
  pdfFile: fileObject,
  sections: [
    { title: "Концепция", page_number: 3 },
    { title: "Стиль", page_number: 5 },
    { title: "Еда", page_number: 8 },
  ],
};

await handleUploadPresentation(data);
```

### Получение презентаций

```typescript
const presentations =
  await presentationService.getPresentationsByWedding(weddingId);
```

### Добавление новой части

```typescript
await presentationService.addPresentationSection(presentationId, "Музыка", 15);
```

## 🐛 Решение проблем

### PDF не отображается в iframe

- Убедитесь, что URL имеет правильные CORS заголовки
- Проверьте, что signed URL еще действителен
- Попробуйте скачать файл напрямую по URL

### Части не сохраняются

- Проверьте консоль на ошибки
- Убедитесь, что номера страниц корректны (> 0)
- Проверьте права доступа в БД

### Файл не загружается в Storage

- Убедитесь, что бакет `wedding-documents` существует
- Проверьте права доступа к Storage
- Проверьте размер файла (максимум 100MB)

## 📚 Дополнительные ресурсы

- [Документация Supabase Storage](https://supabase.com/docs/guides/storage)
- [React Query документация](https://tanstack.com/query/latest)
- [TypeScript типы](src/types/index.ts)
