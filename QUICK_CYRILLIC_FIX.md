# Быстрое решение для поддержки кириллицы в PDF

## Проблема
Пакет `jspdf-customfonts` несовместим с jsPDF 4.0.0. Онлайн-конвертеры могут быть недоступны.

## Решение (3 способа)

### Способ 1: Использовать официальный конвертер jsPDF (рекомендуется)

1. **Скачайте репозиторий jsPDF:**
   - Перейдите на https://github.com/parallax/jsPDF
   - Нажмите "Code" → "Download ZIP"
   - Распакуйте архив

2. **Найдите конвертер:**
   - Откройте папку `jsPDF-master/fontconverter/`
   - Найдите файл `fontconverter.html`

3. **Откройте конвертер:**
   - Откройте `fontconverter.html` в браузере (просто перетащите файл в браузер)
   - Загрузите `Roboto-Regular.ttf`
   - Скопируйте сгенерированный код

4. **Создайте файл:**
   - Создайте `src/fonts/pdf/roboto-font.js`
   - Вставьте код и добавьте `export default ` в начало

### Способ 2: Конвертировать через Node.js скрипт

1. **Скачайте шрифт Roboto:**
   - https://fonts.google.com/specimen/Roboto
   - Скачайте `Roboto-Regular.ttf`

2. **Используйте утилиту:**
   ```bash
   node src/utils/fontConverter.js path/to/Roboto-Regular.ttf
   ```

3. **Скопируйте вывод** в файл `src/fonts/pdf/roboto-font.js`:
   ```javascript
   export default '...base64 строка...';
   ```

### Способ 3: Конвертировать TTF в base64 онлайн

1. **Используйте онлайн конвертер base64:**
   - https://base64.guru/converter/encode/file
   - Загрузите `Roboto-Regular.ttf`
   - Скопируйте base64 строку

2. **Создайте файл `src/fonts/pdf/roboto-font.js`:**
   ```javascript
   export default '...вставьте base64 строку...';
   ```

### После конвертации:

1. **Создайте папку и файл:**
   - Создайте `src/fonts/pdf/roboto-font.js`
   - Вставьте код с `export default`

2. **Обновите `src/utils/cyrillicFontHelper.ts`:**
   - Раскомментируйте `import robotoFont from '../fonts/pdf/roboto-font.js';`
   - Раскомментируйте код в `setupCyrillicFont`
   - Измените `getCyrillicFontName()` чтобы возвращать `'Roboto'`

3. **Готово!** Кириллица будет отображаться корректно.

## Текущее состояние
Сейчас используется временное решение со шрифтом 'times', который частично поддерживает кириллицу.
