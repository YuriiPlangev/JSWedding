import { useState, useEffect } from 'react';
import type { Presentation as PresentationType } from '../types';
import { getTranslation } from '../utils/translations';

// Импортируем все изображения из папки presentation
// Все изображения доступны через imageMap, в меню показываем только выбранные секции
import pres1 from '../assets/presentation/1.png';
import pres2 from '../assets/presentation/2.png';
import pres3 from '../assets/presentation/3.png';
import pres4 from '../assets/presentation/4.png';
import pres5 from '../assets/presentation/5.png';
import pres6 from '../assets/presentation/6.png';
import pres7 from '../assets/presentation/7.png';
import pres8 from '../assets/presentation/8.png';
import pres9 from '../assets/presentation/9.png';
import pres10 from '../assets/presentation/10.png';
import pres11 from '../assets/presentation/11.png';
import pres12 from '../assets/presentation/12.png';
import pres13 from '../assets/presentation/13.png';
import pres14 from '../assets/presentation/14.png';
import pres15 from '../assets/presentation/15.png';
import pres16 from '../assets/presentation/16.png';
import pres17 from '../assets/presentation/17.png';
import pres18 from '../assets/presentation/18.png';

interface PresentationProps {
  presentation?: PresentationType; // Данные презентации из БД
  currentLanguage?: 'en' | 'ru' | 'ua'; // Текущий язык
}

const Presentation = ({ presentation, currentLanguage = 'ua' }: PresentationProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const translations = getTranslation(currentLanguage);

  // Определяем размер экрана
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsMenuOpen(true); // На десктопе меню всегда открыто
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Все изображения для слайдера (18 слайдов от 1 до 18)
  const allSlides = [
    pres1, pres2, pres3, pres4, pres5, pres6, pres7, pres8, pres9,
    pres10, pres11, pres12, pres13, pres14, pres15, pres16, pres17, pres18
  ];

  // Меню быстрого доступа (только выбранные секции)
  // Каждая секция указывает на номер слайда (индекс + 1, так как слайды нумеруются с 1)
  const defaultMenuSections = [
    { id: 0, name: 'Ваш організатор - Юлія Солодченко', slideIndex: 1 }, // слайд 2 (индекс 1)
    { id: 1, name: 'Про нас', slideIndex: 3 }, // слайд 4 (индекс 3)
    { id: 2, name: 'Чому обирають нас?', slideIndex: 6 }, // слайд 7 (индекс 6)
    { id: 3, name: 'Етапи роботи з нами', slideIndex: 9 }, // слайд 10 (индекс 9)
    { id: 4, name: 'Вартість', slideIndex: 15 }, // слайд 16 (индекс 15)
    { id: 5, name: 'Контакти', slideIndex: 17 }, // слайд 18 (индекс 17)
  ];

  // Если есть презентация из БД, используем её структуру
  // Иначе используем меню по умолчанию
  let menuSections = defaultMenuSections;
  if (presentation?.sections && presentation.sections.length > 0) {
    // Преобразуем секции из БД в формат меню
    menuSections = presentation.sections.map((section, index) => {
      // Находим индекс слайда по image_url
      const slideIndex = allSlides.findIndex(slide => slide === section.image_url);
      return {
        id: section.id,
        name: section.name,
        slideIndex: slideIndex >= 0 ? slideIndex : index,
      };
    });
  }

  const title = presentation?.title || translations.presentation.title;

  // Обработчик клика на пункт меню - переходим к соответствующему слайду
  const handleMenuClick = (slideIndex: number) => {
    setActiveIndex(slideIndex);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < allSlides.length - 1 ? prev + 1 : prev));
  };

  return (
    <div className="flex bg-[#eae6db] w-full relative font-forum" style={{ minHeight: '100vh', height: '100vh' }}>
      {/* Кнопка открытия/закрытия меню на мобильных */}
      {isMobile && (
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="fixed top-4 left-4 z-50 bg-[#eae6db] border border-[#00000033] rounded-lg p-2 shadow-lg lg:hidden"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      )}

      {/* Левая панель навигации */}
      <div
        className={`${
          isMobile
            ? `fixed inset-y-0 left-0 z-40 bg-[#eae6db] transform transition-transform duration-300 ease-in-out ${
                isMenuOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'relative shrink'
        } border-r border-[#00000033] flex flex-col shadow-lg lg:shadow-none`}
      >
        {/* Overlay на мобильных */}
        {isMobile && isMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        <div className="border-b border-[#00000033] py-1 min-[1600px]:py-2 px-1.5 sm:px-2 md:px-3 min-[1600px]:px-4 md:min-[1600px]:px-8 lg:min-[1600px]:px-12 xl:min-[1600px]:px-[60px]">
          <h1 className="text-[50px] max-[1599px]:text-[14px] sm:max-[1599px]:text-[16px] md:max-[1599px]:text-[18px] lg:max-[1599px]:text-[20px] font-forum mb-0.5 min-[1600px]:mb-1 wrap-break-word">{title}</h1>
          <p className="text-[24px] max-[1599px]:text-[10px] sm:max-[1599px]:text-[11px] md:max-[1599px]:text-[12px] lg:max-[1599px]:text-[12px] font-forum font-light text-[#00000080]">
            {translations.presentation.sections}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto">
          <ul>
            {menuSections.map((section) => (
              <li key={section.id} className='py-0.5 sm:py-1 min-[1600px]:py-2 min-[1600px]:min-[1600px]:py-2.5 border-b border-[#00000033] cursor-pointer'>
                <button
                  onClick={() => {
                    handleMenuClick(section.slideIndex);
                    if (isMobile) setIsMenuOpen(false);
                  }}
                  className={`w-full text-left flex items-center justify-between font-forum font-light text-[10px] sm:text-[11px] md:text-[12px] lg:text-[13px] min-[1600px]:text-[24px] transition-colors cursor-pointer px-1.5 sm:px-2 md:px-3 min-[1600px]:px-4 md:min-[1600px]:px-8 lg:min-[1600px]:px-12 xl:min-[1600px]:px-[60px] ${
                    activeIndex === section.slideIndex
                      ? 'text-black'
                      : 'text-[#00000080] hover:text-black'
                  }`}
                >
                  <span className="wrap-break-word text-sm pr-1 min-[1600px]:pr-2 text-left font-forum">{section.name}</span>
                  {activeIndex === section.slideIndex && (
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 min-[1600px]:w-2 min-[1600px]:h-2 bg-black rounded-full shrink-0"></span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Правая часть со слайдером */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 relative overflow-hidden" style={{ height: 'calc(100% - 3.5rem)' }}>
          <div
            className="flex h-full transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${activeIndex * 100}%)`,
            }}
          >
            {allSlides.map((slideImage, index) => (
              <div
                key={index}
                className="h-full shrink-0"
                style={{ width: '100%', minWidth: '100%' }}
              >
                <img
                  src={slideImage}
                  alt={`Slide ${index + 1}`}
                  className="w-full h-full object-contain"
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                  }}
                  onError={(e) => {
                    // Если изображение не загрузилось, показываем заглушку
                    const target = e.target as HTMLImageElement;
                    if (target.src !== pres2) {
                      target.src = pres2;
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Футер с навигацией */}
        <div className="h-12 sm:h-14 md:h-16 border-t border-[#00000033] flex items-center justify-between bg-[#eae6db]">
          <button
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className={`text-[20px] sm:text-[24px] md:text-[28px] lg:text-[28px] xl:text-[32px] 2xl:text-[36px] font-forum font-light transition-opacity cursor-pointer border-r border-[#00000033] px-3 sm:px-4 md:px-6 lg:px-6 xl:px-8 h-full ${
              activeIndex === 0
                ? 'text-[#00000033] cursor-not-allowed'
                : 'text-black hover:opacity-70'
            }`}
          >
            &lt;
          </button>

          <div className="flex gap-1 sm:gap-1.5 md:gap-2 px-2 overflow-x-auto max-w-full">
            {allSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                  activeIndex === index
                    ? 'bg-black'
                    : 'bg-[#00000033] hover:bg-[#00000080]'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={activeIndex === allSlides.length - 1}
            className={`text-[20px] sm:text-[24px] md:text-[28px] lg:text-[28px] xl:text-[32px] 2xl:text-[36px] font-forum font-light transition-opacity cursor-pointer px-3 sm:px-4 md:px-6 lg:px-6 xl:px-8 border-l border-[#00000033] h-full ${
              activeIndex === allSlides.length - 1
                ? 'text-[#00000033] cursor-not-allowed'
                : 'text-black hover:opacity-70'
            }`}
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
};

export default Presentation;
