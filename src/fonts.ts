// Импорт шрифтов для использования в приложении
import BranchRegular from './assets/fonts/Branch-Regular.woff2?url';
import GilroyLight from './assets/fonts/Gilroy-Light.woff2?url';
import SloopRegular from './assets/fonts/Sloop-Regular.woff2?url';

// Создаем стили для шрифтов
const branchFont = new FontFace('Branch', `url(${BranchRegular})`, {
  weight: 'normal',
  style: 'normal',
  display: 'swap',
});

const gilroyFont = new FontFace('Gilroy', `url(${GilroyLight})`, {
  weight: '300',
  style: 'normal',
  display: 'swap',
});

const sloopFont = new FontFace('Sloop', `url(${SloopRegular})`, {
  weight: 'normal',
  style: 'normal',
  display: 'swap',
});

// Загружаем шрифты
branchFont.load().then((font) => {
  document.fonts.add(font);
});

gilroyFont.load().then((font) => {
  document.fonts.add(font);
});

sloopFont.load().then((font) => {
  document.fonts.add(font);
});

export { BranchRegular, GilroyLight, SloopRegular };

