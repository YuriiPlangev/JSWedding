import React, { useState } from 'react';

interface Presentation {
  id: string;
  wedding_id: string;
  title: string;
  image_urls?: string[];
  presentation_sections?: Section[];
}

interface Section {
  id: string;
  title: string;
  page_number: number;
  order_index: number;
}

interface PresentationViewerProps {
  presentations: Presentation[];
  currentLanguage?: 'en' | 'ru' | 'ua';
}

const PresentationViewer: React.FC<PresentationViewerProps> = ({ presentations }) => {
  const [selectedPresentationId, setSelectedPresentationId] = useState<string>(presentations[0]?.id || '');
  const [currentPageByPresentation, setCurrentPageByPresentation] = useState<{ [key: string]: number }>({});

  if (!presentations || presentations.length === 0) {
    return null;
  }

  const currentPresentation = presentations.find(p => p.id === selectedPresentationId) || presentations[0];
  const currentPage = currentPageByPresentation[currentPresentation.id] || 0;
  const imageUrls = currentPresentation.image_urls || [];
  const sections = (currentPresentation.presentation_sections || [])
    .sort((a: Section, b: Section) => a.order_index - b.order_index);

  const handleSetCurrentPage = (page: number) => {
    setCurrentPageByPresentation(prev => ({
      ...prev,
      [currentPresentation.id]: page
    }));
  };

  const handleMenuClick = (sectionPageNumber: number) => {
    handleSetCurrentPage(sectionPageNumber - 1);
  };

  return (
    <div className="flex flex-col bg-[#eae6db] w-full relative font-forum lg:flex-row" style={{ minHeight: '100vh', height: '100vh' }}>
      {/* Левая панель с меню */}
      <div
        className="relative shrink border-r border-[#00000033] flex flex-col shadow-lg lg:shadow-none"
        style={{ width: '330px', minWidth: '300px', maxWidth: '360px' }}
      >
        {/* Заголовок */}
        <div className="border-b border-[#00000033] py-1 min-[1600px]:py-2 px-1.5 sm:px-2 md:px-3 min-[1600px]:px-4 md:min-[1600px]:px-8 lg:min-[1600px]:px-12 xl:min-[1600px]:px-[60px]">
          <h1 className="text-[50px] max-[1599px]:text-[14px] sm:max-[1599px]:text-[16px] md:max-[1599px]:text-[18px] lg:max-[1599px]:text-[20px] font-forum mb-0.5 min-[1600px]:mb-1 wrap-break-word">
            {currentPresentation.title}
          </h1>
          <p className="text-[24px] max-[1599px]:text-[10px] sm:max-[1599px]:text-[11px] md:max-[1599px]:text-[12px] lg:max-[1599px]:text-[12px] font-forum font-light text-[#00000080]">
            разделы презентации
          </p>
        </div>

        {/* Список презентаций (если их несколько) */}
        {presentations.length > 1 && (
          <div className="border-b border-[#00000033] overflow-y-auto">
            <ul>
              {presentations.map((presentation) => (
                <li
                  key={presentation.id}
                  className="py-0.5 sm:py-1 min-[1600px]:py-2 min-[1600px]:min-[1600px]:py-2.5 border-b border-[#00000033] cursor-pointer"
                >
                  <button
                    onClick={() => {
                      setSelectedPresentationId(presentation.id);
                      // Сбросить текущую страницу для новой презентации
                      if (!currentPageByPresentation[presentation.id]) {
                        setCurrentPageByPresentation(prev => ({
                          ...prev,
                          [presentation.id]: 0
                        }));
                      }
                    }}
                    className={`w-full text-left font-forum font-light text-[10px] sm:text-[11px] md:text-[12px] lg:text-[13px] min-[1600px]:text-[24px] transition-colors px-1.5 sm:px-2 md:px-3 min-[1600px]:px-4 md:min-[1600px]:px-8 lg:min-[1600px]:px-12 xl:min-[1600px]:px-[60px] relative z-50 ${
                      selectedPresentationId === presentation.id
                        ? 'text-black bg-[#ffffff33]'
                        : 'text-[#00000080] hover:text-black'
                    }`}
                  >
                    {presentation.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Меню разделов */}
        <nav className="flex-1 overflow-y-auto relative z-50">
          <ul>
            {sections.map((section) => (
              <li key={section.id} className="py-0.5 sm:py-1 min-[1600px]:py-2 min-[1600px]:min-[1600px]:py-2.5 border-b border-[#00000033] cursor-pointer">
                <button
                  onClick={() => handleMenuClick(section.page_number)}
                  className={`w-full text-left flex items-center justify-between font-forum font-light text-[10px] sm:text-[11px] md:text-[12px] lg:text-[13px] min-[1600px]:text-[24px] transition-colors cursor-pointer px-1.5 sm:px-2 md:px-3 min-[1600px]:px-4 md:min-[1600px]:px-8 lg:min-[1600px]:px-12 xl:min-[1600px]:px-[60px] relative z-50 ${
                    currentPage === section.page_number - 1
                      ? 'text-black'
                      : 'text-[#00000080] hover:text-black'
                  }`}
                  style={{ pointerEvents: 'auto' }}
                >
                  <span className="wrap-break-word text-sm pr-1 min-[1600px]:pr-2 text-left font-forum">{section.title}</span>
                  {currentPage === section.page_number - 1 && (
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 min-[1600px]:w-2 min-[1600px]:h-2 bg-black rounded-full shrink-0"></span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Правая панель с изображением */}
      <div className="flex-1 flex flex-col min-w-0 lg:min-h-0 w-full">
        {/* Просмотр изображения */}
        {imageUrls.length > 0 ? (
          <>
            <div 
              className="flex-1 relative overflow-hidden lg:min-h-0" 
              style={{ height: 'calc(100% - 3.5rem)' }}
            >
              <img
                src={imageUrls[currentPage]}
                alt={`Страница ${currentPage + 1}`}
                className="w-full h-full object-contain"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                }}
              />
            </div>

            {/* Навигация по страницам */}
            <div className="border-t border-[#00000033] bg-[#eae6db] shrink-0">
              <div className="h-12 sm:h-14 md:h-16 flex items-center justify-between">
                <button
                  onClick={() => handleSetCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className={`text-[20px] sm:text-[24px] md:text-[28px] lg:text-[28px] xl:text-[32px] 2xl:text-[36px] font-forum font-light transition-opacity cursor-pointer border-r border-[#00000033] px-3 sm:px-4 md:px-6 lg:px-6 xl:px-8 h-full ${
                    currentPage === 0
                      ? 'text-[#00000033] cursor-not-allowed'
                      : 'text-black hover:opacity-70'
                  }`}
                >
                  &lt;
                </button>

                <div className="flex gap-1 sm:gap-1.5 md:gap-2 px-2 overflow-x-auto max-w-full">
                  {imageUrls.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handleSetCurrentPage(index)}
                      className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                        currentPage === index
                          ? 'bg-black'
                          : 'bg-[#00000033] hover:bg-[#00000080]'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => handleSetCurrentPage(Math.min(imageUrls.length - 1, currentPage + 1))}
                  disabled={currentPage === imageUrls.length - 1}
                  className={`text-[20px] sm:text-[24px] md:text-[28px] lg:text-[28px] xl:text-[32px] 2xl:text-[36px] font-forum font-light transition-opacity cursor-pointer px-3 sm:px-4 md:px-6 lg:px-6 xl:px-8 border-l border-[#00000033] h-full ${
                    currentPage === imageUrls.length - 1
                      ? 'text-[#00000033] cursor-not-allowed'
                      : 'text-black hover:opacity-70'
                  }`}
                >
                  &gt;
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#00000080] font-forum">
            Нет изображений
          </div>
        )}
      </div>
    </div>
  );
};

export default PresentationViewer;