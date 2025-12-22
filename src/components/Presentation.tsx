import { useState, useEffect, useRef } from 'react';
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
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});
  const sliderRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const translations = getTranslation(currentLanguage);

  // Определяем размер экрана
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
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

  // Автоматическая прокрутка к активному табу при изменении activeIndex
  useEffect(() => {
    if (!isMobile || !tabsContainerRef.current) return;
    
    // Используем requestAnimationFrame для немедленного запуска без задержки
    requestAnimationFrame(() => {
      const activeSection = menuSections.find(s => s.slideIndex === activeIndex);
      if (activeSection && tabRefs.current[activeSection.id] && tabsContainerRef.current) {
        const tabElement = tabRefs.current[activeSection.id];
        const container = tabsContainerRef.current;
        
        if (tabElement) {
          // Получаем позиции относительно контейнера
          const containerRect = container.getBoundingClientRect();
          const tabRect = tabElement.getBoundingClientRect();
          
          // Вычисляем, насколько таб выходит за границы контейнера
          const tabLeft = tabRect.left - containerRect.left + container.scrollLeft;
          const tabRight = tabLeft + tabElement.offsetWidth;
          const containerScrollLeft = container.scrollLeft;
          const containerWidth = container.clientWidth;
          const containerScrollRight = containerScrollLeft + containerWidth;
          
          // Плавная прокрутка с использованием requestAnimationFrame для более плавной анимации
          const startScroll = container.scrollLeft;
          let targetScroll: number;
          
          // Если таб слева от видимой области - прокручиваем влево
          if (tabLeft < containerScrollLeft) {
            targetScroll = tabLeft - 8; // небольшой отступ
          }
          // Если таб справа от видимой области - прокручиваем вправо
          else if (tabRight > containerScrollRight) {
            targetScroll = tabRight - containerWidth + 8; // небольшой отступ
          }
          // Если таб в видимой области, но не по центру - центрируем
          else {
            const tabCenter = tabLeft + tabElement.offsetWidth / 2;
            const containerCenter = containerScrollLeft + containerWidth / 2;
            targetScroll = containerScrollLeft + (tabCenter - containerCenter);
          }
          
          targetScroll = Math.max(0, Math.min(targetScroll, container.scrollWidth - containerWidth));
          
          // Плавная анимация прокрутки с ease-in-out для эффекта "скольжения"
          const duration = 400;
          const startTime = performance.now();
          
          const animateScroll = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Используем ease-in-out для плавного "скольжения"
            const easeInOut = progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            const currentScroll = startScroll + (targetScroll - startScroll) * easeInOut;
            container.scrollLeft = currentScroll;
            
            if (progress < 1) {
              requestAnimationFrame(animateScroll);
            }
          };
          
          requestAnimationFrame(animateScroll);
        }
      }
    });
  }, [activeIndex, isMobile]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < allSlides.length - 1 ? prev + 1 : prev));
  };

  // Обработчики для свайпа по картинкам
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;
    
    const touchCurrentX = e.touches[0].clientX;
    const touchCurrentY = e.touches[0].clientY;
    const diffX = touchStartX.current - touchCurrentX;
    const diffY = touchStartY.current - touchCurrentY;
    
    // Если движение больше по горизонтали, чем по вертикали - это свайп
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      isDragging.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !isDragging.current) {
      touchStartX.current = 0;
      touchStartY.current = 0;
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX.current - touchEndX;
    const threshold = 50; // Минимальное расстояние для свайпа

    if (Math.abs(diffX) > threshold) {
      if (diffX > 0) {
        // Свайп влево - следующий слайд
        handleNext();
      } else {
        // Свайп вправо - предыдущий слайд
        handlePrev();
      }
    }

    touchStartX.current = 0;
    touchStartY.current = 0;
    isDragging.current = false;
  };

  // Обработчики для полноэкранного режима
  const handleImageClick = (index: number) => {
    setFullscreenIndex(index);
    setIsFullscreen(true);
    // Блокируем скролл страницы при открытии модального окна
    document.body.style.overflow = 'hidden';
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
    document.body.style.overflow = '';
  };

  // Обработчики свайпа в полноэкранном режиме (вертикальные)
  const handleFullscreenTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  };

  const handleFullscreenTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;
    
    const touchCurrentX = e.touches[0].clientX;
    const touchCurrentY = e.touches[0].clientY;
    const diffX = touchStartX.current - touchCurrentX;
    const diffY = touchStartY.current - touchCurrentY;
    
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) {
      isDragging.current = true;
    }
  };

  const handleFullscreenTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !isDragging.current) {
      touchStartX.current = 0;
      touchStartY.current = 0;
      return;
    }

    const touchEndY = e.changedTouches[0].clientY;
    const diffY = touchStartY.current - touchEndY;
    const threshold = 50;

    if (Math.abs(diffY) > threshold) {
      if (diffY > 0) {
        // Свайп вверх - следующий слайд
        if (fullscreenIndex < allSlides.length - 1) {
          setFullscreenIndex(fullscreenIndex + 1);
        }
      } else {
        // Свайп вниз - предыдущий слайд
        if (fullscreenIndex > 0) {
          setFullscreenIndex(fullscreenIndex - 1);
        }
      }
    }

    touchStartX.current = 0;
    touchStartY.current = 0;
    isDragging.current = false;
  };

  // Обработка клавиатуры в полноэкранном режиме (вертикальная навигация)
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseFullscreen();
      } else if (e.key === 'ArrowUp' && fullscreenIndex > 0) {
        setFullscreenIndex(fullscreenIndex - 1);
      } else if (e.key === 'ArrowDown' && fullscreenIndex < allSlides.length - 1) {
        setFullscreenIndex(fullscreenIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, fullscreenIndex]);

  return (
    <div className="flex flex-col bg-[#eae6db] w-full relative font-forum lg:flex-row" style={{ minHeight: isMobile ? 'auto' : '100vh', height: isMobile ? 'auto' : '100vh' }}>
      {/* Заголовок "Презентация компании" - только на мобильных, сверху секции */}
      {isMobile && (
        <>
          <div className="border-b border-[#00000033] py-2 px-3 sm:px-4 md:px-8 lg:hidden">
            <h1 className="text-[26px] sm:text-[30px] md:text-[34px] font-forum mb-0 text-center wrap-break-word">{title}</h1>
          </div>
          {/* Табы навигации по секциям - под заголовком (только на мобильных) */}
          <div 
            ref={tabsContainerRef}
            className="border-b border-[#00000033] bg-[#eae6db] overflow-x-auto lg:hidden"
            style={{ 
              scrollBehavior: 'smooth',
              scrollPaddingInline: '8px'
            }}
          >
            <div className="flex gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3">
              {menuSections.map((section) => (
                <button
                  key={section.id}
                  ref={(el) => {
                    tabRefs.current[section.id] = el;
                  }}
                  onClick={() => handleMenuClick(section.slideIndex)}
                  className={`px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 rounded-lg font-forum font-light text-[11px] sm:text-[12px] md:text-[13px] transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    activeIndex === section.slideIndex
                      ? 'text-black bg-[#00000015] border border-[#00000033]'
                      : 'text-[#00000080] bg-transparent border border-transparent hover:text-black hover:bg-[#00000005]'
                  }`}
                >
                  {section.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}


      {/* Левая панель навигации - только на десктопе */}
      {!isMobile && (
        <div className="relative shrink border-r border-[#00000033] flex flex-col shadow-lg lg:shadow-none">
          {/* Заголовок только на десктопе */}
          <div className="border-b border-[#00000033] py-1 min-[1600px]:py-2 px-1.5 sm:px-2 md:px-3 min-[1600px]:px-4 md:min-[1600px]:px-8 lg:min-[1600px]:px-12 xl:min-[1600px]:px-[60px]">
            <h1 className="text-[50px] max-[1599px]:text-[14px] sm:max-[1599px]:text-[16px] md:max-[1599px]:text-[18px] lg:max-[1599px]:text-[20px] font-forum mb-0.5 min-[1600px]:mb-1 wrap-break-word">{title}</h1>
            <p className="text-[24px] max-[1599px]:text-[10px] sm:max-[1599px]:text-[11px] md:max-[1599px]:text-[12px] lg:max-[1599px]:text-[12px] font-forum font-light text-[#00000080]">
              {translations.presentation.sections}
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto relative z-50">
            <ul>
              {menuSections.map((section) => (
                <li key={section.id} className='py-0.5 sm:py-1 min-[1600px]:py-2 min-[1600px]:min-[1600px]:py-2.5 border-b border-[#00000033] cursor-pointer'>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuClick(section.slideIndex);
                    }}
                    className={`w-full text-left flex items-center justify-between font-forum font-light text-[10px] sm:text-[11px] md:text-[12px] lg:text-[13px] min-[1600px]:text-[24px] transition-colors cursor-pointer px-1.5 sm:px-2 md:px-3 min-[1600px]:px-4 md:min-[1600px]:px-8 lg:min-[1600px]:px-12 xl:min-[1600px]:px-[60px] relative z-50 ${
                      activeIndex === section.slideIndex
                        ? 'text-black'
                        : 'text-[#00000080] hover:text-black'
                    }`}
                    style={{ pointerEvents: 'auto' }}
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
      )}

      {/* Правая часть со слайдером */}
      <div className="flex-1 flex flex-col min-w-0 lg:min-h-0">
        <div 
          ref={sliderRef}
          className="flex-1 relative overflow-hidden lg:min-h-0" 
          style={{ height: 'calc(100% - 3.5rem)' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex h-full transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${activeIndex * 100}%)`,
            }}
          >
            {allSlides.map((slideImage, index) => (
              <div
                key={index}
                className="h-full shrink-0 relative"
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
                {/* Иконка полноэкранного режима - только на мобильной версии */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageClick(index);
                  }}
                  className="lg:hidden absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 z-10 bg-[#eae6db] border border-[#00000033] hover:bg-[#00000005] rounded p-1.5 sm:p-2 transition-all cursor-pointer"
                  aria-label="Open fullscreen"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-black"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Футер с навигацией */}
        <div className="border-t border-[#00000033] bg-[#eae6db] shrink-0">
          {/* Навигация слайдов (стрелки и точки) */}
          <div className="h-12 sm:h-14 md:h-16 flex items-center justify-between">
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

      {/* Модальное окно для полноэкранного просмотра */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
          onClick={handleCloseFullscreen}
          onTouchStart={handleFullscreenTouchStart}
          onTouchMove={handleFullscreenTouchMove}
          onTouchEnd={handleFullscreenTouchEnd}
        >
          {/* Кнопка закрытия */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCloseFullscreen();
            }}
            className="absolute bottom-4 right-4 z-[10000] text-black text-3xl font-bold hover:bg-[#00000005] transition-all w-10 h-10 flex items-center justify-center bg-[#eae6db] border border-[#00000033] rounded-full"
            style={{ transform: 'rotate(-90deg)' }}
            aria-label="Close"
          >
            ×
          </button>

          {/* Стрелка вверх (предыдущий слайд) */}
          {fullscreenIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenIndex(fullscreenIndex - 1);
              }}
              className="absolute top-4 left-1/2 z-[10000] text-black text-4xl font-bold hover:bg-[#00000005] transition-all w-12 h-12 flex items-center justify-center bg-[#eae6db] border border-[#00000033] rounded-full"
              style={{ transform: 'translateX(-50%)' }}
              aria-label="Previous"
            >
              ↑
            </button>
          )}

          {/* Стрелка вниз (следующий слайд) */}
          {fullscreenIndex < allSlides.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenIndex(fullscreenIndex + 1);
              }}
              className="absolute bottom-4 left-1/2 z-[10000] text-black text-4xl font-bold hover:bg-[#00000005] transition-all w-12 h-12 flex items-center justify-center bg-[#eae6db] border border-[#00000033] rounded-full"
              style={{ transform: 'translateX(-50%)' }}
              aria-label="Next"
            >
              ↓
            </button>
          )}

          {/* Контейнер с изображениями для вертикальной прокрутки */}
          <div 
            className="w-full h-full relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="flex flex-col w-full h-full"
              style={{
                transform: `translateY(-${fullscreenIndex * 100}%)`,
                transition: 'transform 0.3s ease-in-out',
              }}
            >
              {allSlides.map((slideImage, index) => (
                <div
                  key={index}
                  className="w-full h-full shrink-0 flex items-center justify-center"
                  style={{ minHeight: '100%' }}
                >
                  <img
                    src={slideImage}
                    alt={`Slide ${index + 1}`}
                    className="object-contain"
                    style={{
                      display: 'block',
                      width: '100vh',
                      height: '100vw',
                      maxWidth: '100vh',
                      maxHeight: '100vw',
                      transform: 'rotate(90deg)',
                    }}
                    onError={(e) => {
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

          {/* Индикатор текущего слайда */}
          <div 
            className="absolute left-4 top-1/2 z-[10000] flex flex-col gap-2"
            style={{ transform: 'translateY(-50%)' }}
          >
            {allSlides.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  fullscreenIndex === index
                    ? 'bg-white h-8'
                    : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Presentation;
