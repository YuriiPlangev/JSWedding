# Настройка поддержки кириллицы в PDF

## Проблема
Стандартные шрифты jsPDF не поддерживают кириллицу, поэтому при экспорте в PDF русский текст отображается как непонятные символы.

## Решение

### Шаг 1: Скачайте шрифт с поддержкой кириллицы
Рекомендуемые шрифты:
- **Roboto** (Google Fonts): https://fonts.google.com/specimen/Roboto
- **Arial Unicode MS** (если доступен)
- **Times New Roman** (если доступен)

### Шаг 2: Конвертируйте шрифт
1. Перейдите на https://peckconsulting.github.io/jsPDF-font-converter/
2. Загрузите TTF файл шрифта
3. Скачайте сгенерированный `.js` файл

### Шаг 3: Добавьте шрифт в проект
1. Создайте папку `src/fonts/pdf/` (если её нет)
2. Скопируйте сгенерированный `.js` файл в эту папку
3. Откройте файл `src/utils/cyrillicFontHelper.ts`
4. Раскомментируйте и обновите импорт:
   ```typescript
   import robotoFont from '../fonts/pdf/Roboto-Regular-normal.js';
   ```
5. Раскомментируйте код в функции `setupCyrillicFont`:
   ```typescript
   doc.addFileToVFS('Roboto-Regular.ttf', robotoFont);
   doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
   doc.setFont('Roboto');
   ```

### Шаг 4: Обновите стили в autoTable
В файлах `SalariesTab.tsx` и `AdvancesTab.tsx` измените:
```typescript
styles: { 
  font: 'Roboto', // вместо 'helvetica'
  ...
}
```

## Альтернативное решение
Если настройка шрифта вызывает сложности, можно использовать библиотеку **pdfmake**, которая изначально поддерживает кириллицу:
- https://pdfmake.github.io/docs/

