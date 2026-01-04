# План рефакторинга OrganizerDashboard

## Текущее состояние
- Файл `OrganizerDashboard.tsx` содержит **3215 строк кода**
- Вся логика находится в одном файле
- Сложно поддерживать и тестировать

## Структура компонентов

### 1. Основные страницы
- `TasksPage` → `src/pages/organizer/TasksPage.tsx`
- `WeddingsPage` → `src/pages/organizer/WeddingsPage.tsx`
- `WeddingDetailsPage` → `src/pages/organizer/WeddingDetailsPage.tsx`

### 2. Компоненты Kanban доски
- `TaskColumn` → `src/components/organizer/TaskColumn.tsx` ✅
- `TaskCard` → `src/components/organizer/TaskCard.tsx` ✅
- `TaskGroupHeader` → `src/components/organizer/TaskGroupHeader.tsx`
- `TaskLogs` → `src/components/organizer/TaskLogs.tsx`
- `CompletedTasksSection` → `src/components/organizer/CompletedTasksSection.tsx`
- `CreateTaskInput` → `src/components/organizer/CreateTaskInput.tsx`

### 3. Компоненты свадеб
- `WeddingsList` → `src/components/organizer/WeddingsList.tsx`
- `WeddingCard` → `src/components/organizer/WeddingCard.tsx`
- `WeddingTabs` → `src/components/organizer/WeddingTabs.tsx`

### 4. Хуки
- `useTaskGroups` → `src/hooks/useTaskGroups.ts`
- `useTaskDragAndDrop` → `src/hooks/useTaskDragAndDrop.ts`
- `useGroupDragAndDrop` → `src/hooks/useGroupDragAndDrop.ts`
- `useTaskLogs` → `src/hooks/useTaskLogs.ts`
- `useWeddings` → `src/hooks/useWeddings.ts`
- `useWeddingTabs` → `src/hooks/useWeddingTabs.ts`

### 5. Утилиты
- `colorUtils.ts` → `src/utils/colorUtils.ts` ✅
- `dateUtils.ts` → `src/utils/dateUtils.ts` ✅
- `localStorageUtils.ts` → `src/utils/localStorageUtils.ts` ✅
- `taskUtils.ts` → `src/utils/taskUtils.ts`

### 6. Константы
- `constants.ts` → `src/constants/organizer.ts`

## Оптимизации

### 1. Мемоизация
- Использовать `React.memo` для компонентов
- Использовать `useMemo` для вычисляемых значений
- Использовать `useCallback` для функций-обработчиков

### 2. Разделение логики
- Вынести бизнес-логику в кастомные хуки
- Разделить состояние на логические группы

### 3. Производительность
- Ленивая загрузка компонентов
- Виртуализация списков (если нужно)
- Оптимизация ре-рендеров

### 4. Типизация
- Создать отдельные типы для пропсов компонентов
- Использовать `const assertions` где возможно

## Порядок рефакторинга

1. ✅ Создать утилиты (colorUtils, dateUtils, localStorageUtils)
2. ✅ Создать базовые компоненты (TaskCard, TaskColumn)
3. ⏳ Вынести TasksPage в отдельный файл
4. ⏳ Создать хуки для управления состоянием
5. ⏳ Вынести компоненты свадеб
6. ⏳ Оптимизировать рендеринг
7. ⏳ Добавить тесты

## Преимущества

1. **Удобство поддержки** - каждый компонент в отдельном файле
2. **Переиспользование** - компоненты можно использовать в других местах
3. **Тестируемость** - легче писать тесты для отдельных компонентов
4. **Производительность** - оптимизация ре-рендеров
5. **Читаемость** - код легче понимать

