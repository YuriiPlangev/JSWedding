import { jsPDF } from 'jspdf';

/**
 * Настройка шрифта с поддержкой кириллицы для jsPDF
 * 
 * ИНСТРУКЦИЯ (см. QUICK_CYRILLIC_FIX.md):
 * 1. Скачайте Roboto-Regular.ttf с https://fonts.google.com/specimen/Roboto
 * 2. Конвертируйте одним из способов:
 *    - Используйте fontconverter.html из репозитория jsPDF
 *    - Используйте Node.js скрипт: node src/utils/fontConverter.js path/to/font.ttf
 *    - Используйте онлайн конвертер base64
 * 3. Создайте файл src/fonts/pdf/roboto-font.js с export default
 * 4. Раскомментируйте код ниже
 */

// TODO: Раскомментировать после добавления шрифта
// import robotoFont from '../fonts/pdf/roboto-font.js';

let fontLoaded = false;

export function setupCyrillicFont(doc: jsPDF): void {
  // Если шрифт еще не загружен, попробуем загрузить
  if (!fontLoaded) {
    try {
      // TODO: Раскомментировать после добавления шрифта
      // doc.addFileToVFS('Roboto-Regular.ttf', robotoFont);
      // doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      // fontLoaded = true;
      // doc.setFont('Roboto');
      // return;
    } catch (e) {
      console.warn('Шрифт Roboto не найден, используем временное решение', e);
    }
  }

  // Временное решение: используем 'times', который частично поддерживает кириллицу
  // Это не идеально, но лучше чем helvetica
  try {
    doc.setFont('times');
  } catch (e) {
    doc.setFont('helvetica');
  }
}

/**
 * Получить имя шрифта для использования в autoTable
 */
export function getCyrillicFontName(): string {
  // TODO: Вернуть 'Roboto' после добавления шрифта
  return 'times'; // Временное решение
}
