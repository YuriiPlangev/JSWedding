# Шрифты для PDF

## Как добавить шрифт Roboto с поддержкой кириллицы

1. **Скачайте шрифт:**
   - Перейдите на https://fonts.google.com/specimen/Roboto
   - Нажмите "Download family"
   - Распакуйте архив
   - Найдите файл `Roboto-Regular.ttf`

2. **Конвертируйте шрифт:**
   - Откройте https://peckconsulting.github.io/jsPDF-font-converter/
   - Нажмите "Choose TTF file" и выберите `Roboto-Regular.ttf`
   - Нажмите "Generate jsPDF font file"
   - Скопируйте весь сгенерированный код

3. **Создайте файл:**
   - Создайте файл `roboto-font.js` в этой папке
   - Вставьте скопированный код
   - В самом начале файла добавьте: `export default `
   - Убедитесь, что строка с base64 идет сразу после `export default`

   Пример:
   ```javascript
   export default 'AAEAAAAOAIAAAwBgT1MvMj3hSQEAAADsAAAATmNtYXDQEhm3...';
   ```

4. **Обновите cyrillicFontHelper.ts:**
   - Откройте `src/utils/cyrillicFontHelper.ts`
   - Раскомментируйте строки с импортом и загрузкой шрифта
   - Измените `getCyrillicFontName()` чтобы возвращать `'Roboto'`

5. **Готово!** Теперь кириллица будет отображаться корректно в PDF.

