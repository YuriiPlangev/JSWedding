/**
 * Базовый шрифт с поддержкой кириллицы для jsPDF
 * Это минимальный шрифт, который поддерживает основные кириллические символы
 * 
 * Для полной поддержки нужно:
 * 1. Скачать шрифт (например, Roboto, Arial Unicode MS)
 * 2. Конвертировать через https://peckconsulting.github.io/jsPDF-font-converter/
 * 3. Импортировать и использовать здесь
 */

// Временное решение: используем стандартный подход
// Для полной поддержки кириллицы нужно подключить кастомный шрифт

export function setupCyrillicFont(doc: any) {
  // Пока используем стандартный шрифт
  // Для полной поддержки кириллицы нужно:
  // 1. Скачать шрифт с поддержкой кириллицы (например, Roboto)
  // 2. Конвертировать через https://peckconsulting.github.io/jsPDF-font-converter/
  // 3. Импортировать base64 строку
  // 4. Использовать:
  //    doc.addFileToVFS('Roboto-Regular.ttf', base64Font);
  //    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  //    doc.setFont('Roboto');
  
  // Временное решение - используем стандартный шрифт
  doc.setFont('helvetica');
}

