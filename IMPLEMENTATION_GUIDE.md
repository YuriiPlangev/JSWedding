# 🎓 РУКОВОДСТВО ПО ВНЕДРЕНИЮ СИСТЕМЫ ЗАГРУЗКИ ПРЕЗЕНТАЦИЙ

## Что было реализовано

### ✅ Готовые компоненты и функции

1. **Миграция БД** (`supabase/migrations/044_presentations_refactor.sql`)
   - Таблица `presentations` - хранит метаданные PDF презентаций
   - Таблица `presentation_sections` - хранит разделы презентации с номерами страниц
   - RLS политики для безопасности

2. **Типы данных** (обновлены в `src/types/index.ts`)
   - `CustomPresentation` - интерфейс для новой системы
   - `CustomPresentationSection` - интерфейс для разделов
   - Сохранена обратная совместимость со старым типом `Presentation`

3. **API Функции** (`src/services/weddingService.ts` → `presentationService`)
   - `uploadPresentationPDF()` - загрузка PDF в Supabase Storage
   - `getPresentationsByWedding()` - получение всех презентаций свадьбы
   - `createPresentation()` - создание презентации с разделами
   - `deletePresentation()` - удаление презентации
   - `addPresentationSection()` - добавление раздела
   - `deletePresentationSection()` - удаление раздела
   - `updatePresentation()` - обновление данных
   - `updatePresentationsOrder()` - переупорядочение

4. **UI Компоненты**
   - `PresentationUploadModal.tsx` - модал для загрузки PDF
   - `PresentationViewer.tsx` - компонент для просмотра PDF с аккордеоном
   - `OrganizerPresentations.tsx` - компонент управления для организаторов

5. **React Hook**
   - `useCustomPresentations()` - React Query hook для загрузки презентаций

## 📍 ГДЕ НАХОДЯТСЯ ФАЙЛЫ

```
src/
├── types/index.ts ✅ (обновлены типы)
├── services/weddingService.ts ✅ (добавлены функции presentationService)
├── components/
│   ├── PresentationViewer.tsx ✅ (новый компонент)
│   ├── Presentation.tsx ✅ (существует - для обратной совместимости)
│   ├── modals/
│   │   ├── PresentationUploadModal.tsx ✅ (новый модал)
│   │   └── index.ts ✅ (обновлен экспорт)
│   └── organizer/
│       ├── OrganizerPresentations.tsx ✅ (новый компонент)
│       └── index.ts ✅ (обновлен экспорт)
├── hooks/
│   ├── useCustomPresentations.ts ✅ (новый hook)
│   └── index.ts ✅ (обновлен экспорт)
└── pages/
    ├── OrganizerDashboard.tsx (требует интеграции)
    └── ClientDashboard.tsx (требует интеграции)

supabase/
└── migrations/
    └── 044_presentations_refactor.sql ✅ (новая миграция)

PRESENTATION_SYSTEM.md ✅ (подробная документация)
```

## 🚀 ИНТЕГРАЦИЯ В ORGANIZERDASHBOARD

### Шаг 1: Добавить импорты

Найти импорты и добавить:

```tsx
// Уже есть в файле:
import { OrganizerPresentations } from "../components/organizer";

// Если еще нет:
import OrganizerPresentations from "../components/organizer/OrganizerPresentations";
```

### Шаг 2: Добавить модал в рендер

Найти в конце файла где отображаются модалы (около строки 2446):

```tsx
{
  showPresentationModal && selectedWedding && (
    <PresentationModal
      onClose={() => setShowPresentationModal(false)}
      onUpload={handleUploadPresentation}
      uploading={uploadingPresentation}
    />
  );
}
```

И добавить после него (или заменить, если это старый модал):

```tsx
{
  /* Новый модал для загрузки PDF презентаций - опционально, если нужно отдельное окно */
}
{
  /* Можно убрать, так как управление встроено в OrganizerPresentations компонент */
}
```

### Шаг 3: Добавить компонент на вкладку свадьбы

Найти где отображается информация о свадьбе, секцию "wedding-details" (примерно строка 1400-1500):

```tsx
{
  /* Найти это место в render */
}
<div className="space-y-6">
  {/* Существующие компоненты (WeddingModal, TasksList, DocumentsList) */}

  {/* ДОБАВИТЬ ЗДЕСЬ */}
  {selectedWedding && <OrganizerPresentations weddingId={selectedWedding.id} />}
</div>;
```

### Пример полной интеграции:

```tsx
// В компоненте OrganizerDashboard, в render методе:

{
  selectedWedding && viewMode === "wedding-details" && (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Левая колонка */}
      <div className="lg:col-span-1 space-y-6">
        {/* Существующие компоненты */}
      </div>

      {/* Правая колонка */}
      <div className="lg:col-span-2 space-y-6">
        {/* Существующие компоненты */}

        {/* НОВОЕ: Управление презентациями */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <OrganizerPresentations weddingId={selectedWedding.id} />
        </div>
      </div>
    </div>
  );
}
```

## 🎨 ИНТЕГРАЦИЯ В CLIENTDASHBOARD

### Шаг 1: Добавить импорты

```tsx
// Уже есть:
import Presentation from "../components/Presentation";

// Добавить:
import PresentationViewer from "../components/PresentationViewer";
import { useCustomPresentations } from "../hooks";
```

### Шаг 2: Загрузить презентации

В теле компонента добавить (например, после инициализации других hooks):

```tsx
// Загрузить загруженные организатором презентации
const { data: customPresentations = [] } = useCustomPresentations(wedding?.id);
```

### Шаг 3: Отобразить в render

Найти где отображается Presentation компонент (примерно строка 437):

```tsx
{
  wedding && (
    <Presentation
      presentation={wedding.presentation}
      currentLanguage={currentLanguage}
    />
  );
}
```

Заменить на:

```tsx
{
  /* Показываем новые загруженные PDF презентации если есть */
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
  /* Показываем старую презентацию компании если нет загруженных */
}
{
  (!customPresentations || customPresentations.length === 0) && wedding && (
    <Presentation
      presentation={wedding.presentation}
      currentLanguage={currentLanguage}
    />
  );
}
```

## 🔧 ПРИМЕРЫ КОДА ДЛЯ РАЗЛИЧНЫХ ОПЕРАЦИЙ

### Загрузить новую презентацию

```typescript
const uploadPresentation = async () => {
  const file = /* выбранный PDF файл */;
  const title = "Ольга Португалия";
  const sections = [
    { title: "Концепция", page_number: 3 },
    { title: "Стиль", page_number: 5 },
    { title: "Еда", page_number: 8 },
  ];

  try {
    const pdfUrl = await presentationService.uploadPresentationPDF(weddingId, file);

    const presentation = await presentationService.createPresentation(
      weddingId,
      title,
      pdfUrl,
      `presentations/${weddingId}/${Date.now()}_${file.name}`,
      file.size,
      sections
    );

    console.log('Презентация загружена:', presentation);
  } catch (error) {
    console.error('Ошибка загрузки:', error);
  }
};
```

### Получить все презентации

```typescript
const loadPresentations = async () => {
  const presentations =
    await presentationService.getPresentationsByWedding(weddingId);
  console.log("Найдено презентаций:", presentations.length);
};
```

### Добавить раздел к презентации

```typescript
const addSection = async () => {
  const section = await presentationService.addPresentationSection(
    presentationId,
    "Музыка",
    15,
  );
  console.log("Раздел добавлен:", section);
};
```

### Удалить презентацию

```typescript
const deletePresentation = async () => {
  const success = await presentationService.deletePresentation(
    presentationId,
    "presentations/wedding-id/file-path.pdf",
  );

  if (success) {
    console.log("Презентация удалена");
  }
};
```

## ⚙️ КОНФИГУРАЦИЯ

### Размер файла

Максимальный размер PDF: **100MB**

Изменить в `PresentationUploadModal.tsx`:

```tsx
if (file.size > 100 * 1024 * 1024) {
  // Здесь
  setError("Размер файла не должен превышать 100MB");
}
```

### Длительность signed URL

Текущая длительность: **1 год** (31536000 секунд)

Изменить в `presentationService.uploadPresentationPDF()`:

```tsx
const { data: urlData } = await supabase.storage
  .from("wedding-documents")
  .createSignedUrl(fileName, 31536000); // Здесь (в секундах)
```

## 📝 РАБОТА С ДАННЫМИ

### Структура таблицы presentations

```sql
SELECT
  id,
  wedding_id,
  title,
  type,
  pdf_url,
  pdf_file_path,
  pdf_file_size,
  is_default,
  order_index,
  created_at,
  updated_at
FROM presentations
WHERE wedding_id = 'wedding-uuid'
ORDER BY is_default DESC, order_index ASC;
```

### Структура таблицы presentation_sections

```sql
SELECT
  id,
  presentation_id,
  title,
  page_number,
  order_index
FROM presentation_sections
WHERE presentation_id = 'presentation-uuid'
ORDER BY order_index ASC;
```

## 🧪 ТЕСТИРОВАНИЕ

### Тест загрузки

1. Откройте OrganizerDashboard
2. Выберите свадьбу
3. Нажмите "+ Загрузить" в блоке Презентации
4. Заполните форму:
   - Название: "Тестовая презентация"
   - PDF файл: выберите любой PDF (< 100MB)
   - Добавьте несколько разделов (напр. "Слайд 1" → страница 1)
5. Нажмите "Загрузить"
6. Проверьте, что презентация появилась в списке

### Тест просмотра (ClientDashboard)

1. Авторизуйтесь как клиент
2. Откройте ClientDashboard
3. Прокрутите до раздела презентаций
4. Проверьте, что загруженная презентация видна
5. Кликните на раздел в левой панели
6. Проверьте, что PDF перелистывается на нужную страницу

### Тест удаления

1. В OrganizerDashboard нажмите ✕ на презентацию
2. Подтвердите удаление
3. Проверьте, что презентация исчезла из списка
4. Проверьте, что файл удален из Storage

## 🐛 ВОЗМОЖНЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ

### Проблема: PDF не отображается в iframe

**Решение:**

- Проверьте console на ошибки CORS
- Убедитесь что Supabase Storage имеет правильные CORS настройки
- Попробуйте скачать PDF по прямому URL

### Проблема: Разделы не сохраняются

**Решение:**

- Проверьте что номер страницы > 0
- Убедитесь что презентация была создана успешно
- Проверьте в консоли сообщения об ошибках

### Проблема: Файл не загружается в Storage

**Решение:**

- Убедитесь что бакет `wedding-documents` существует
- Проверьте права доступа RLS
- Проверьте размер файла

### Проблема: Ошибка при загрузке

```
Error: unknown type of error, see error.message
```

**Решение:**

- Проверьте что файл это действительно PDF
- Проверьте что расширение файла .pdf (не содержит спецсимволы)

## 📚 ДОПОЛНИТЕЛЬНЫЕ КОМАНДЫ

### Запустить миграцию БД

```bash
cd supabase
supabase db push
```

### Проверить статус миграций

```bash
supabase migration list
```

### Просмотреть SQL схему

```bash
supabase db pull
```

## ✅ ЧЕКЛИСТ ИНТЕГРАЦИИ

- [ ] Применена миграция БД (`supabase db push`)
- [ ] Обновлены типы данных (проверить `src/types/index.ts`)
- [ ] Добавлены функции presentationService (проверить `src/services/weddingService.ts`)
- [ ] Создан компонент PresentationUploadModal
- [ ] Создан компонент PresentationViewer
- [ ] Создан компонент OrganizerPresentations
- [ ] Создан хук useCustomPresentations
- [ ] Интегрировано в OrganizerDashboard
- [ ] Интегрировано в ClientDashboard
- [ ] Протестирована загрузка PDF
- [ ] Протестирована навигация по разделам
- [ ] Протестировано удаление презентации
- [ ] Проверена безопасность (RLS политики)

## 🎉 ГОТОВО!

Система загрузки и просмотра PDF презентаций полностью реализована.

Все компоненты готовы к использованию. Требуется только интеграция в OrganizerDashboard и ClientDashboard по инструкциям выше.
