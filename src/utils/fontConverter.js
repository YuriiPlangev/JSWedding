/**
 * Утилита для конвертации TTF шрифта в base64 для jsPDF
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * 1. Поместите файл шрифта (например, Roboto-Regular.ttf) в папку проекта
 * 2. Запустите этот скрипт через Node.js:
 *    node src/utils/fontConverter.js path/to/Roboto-Regular.ttf
 * 3. Скопируйте вывод и используйте в roboto-font.js
 */

const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
  console.error('Использование: node fontConverter.js <путь_к_ttf_файлу>');
  process.exit(1);
}

const fontPath = process.argv[2];

if (!fs.existsSync(fontPath)) {
  console.error(`Файл не найден: ${fontPath}`);
  process.exit(1);
}

try {
  const fontBuffer = fs.readFileSync(fontPath);
  const base64Font = fontBuffer.toString('base64');
  
  console.log('\n// Скопируйте это в файл roboto-font.js:\n');
  console.log(`export default '${base64Font}';\n`);
  console.log('Готово! Теперь используйте этот код в roboto-font.js');
} catch (error) {
  console.error('Ошибка при конвертации:', error.message);
  process.exit(1);
}

