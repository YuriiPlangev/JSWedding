/**
 * Утилита для определения языка текста и выбора соответствующего шрифта
 */

/**
 * Определяет, является ли текст русским или украинским
 */
export function isCyrillicText(text: string): boolean {
  if (!text) return false;
  
  // Паттерн для кириллических символов (русский, украинский)
  const cyrillicPattern = /[\u0400-\u04FF]/;
  return cyrillicPattern.test(text);
}

/**
 * Возвращает имя шрифта на основе языка текста
 * Для кириллицы (RU/UA) - Lovelace, для английского - Branch
 */
export function getFontForText(text: string): string {
  return isCyrillicText(text) ? 'Lovelace' : 'Branch';
}

/**
 * Возвращает CSS класс для Tailwind с условным шрифтом
 */
export function getFontClass(_text: string, baseClass: string = ''): string {
  // Для Tailwind нужно использовать inline style или создать классы
  // Возвращаем baseClass для совместимости
  return baseClass;
}

/**
 * Возвращает inline стиль с правильным шрифтом
 */
export function getFontStyle(text: string): React.CSSProperties {
  const fontName = getFontForText(text);
  return { fontFamily: fontName };
}

