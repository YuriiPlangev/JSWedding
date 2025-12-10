import { useState } from 'react';

// Импортируем фотографии
import pres1 from '../assets/photo/pres1.jpg';
import pres2 from '../assets/photo/pres2.jpg';
import pres3 from '../assets/photo/pres3.jpg';
import pres4 from '../assets/photo/pres4.jpg';

interface PresentationSection {
  id: number;
  name: string;
  image: string;
}

const Presentation = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Данные разделов презентации
  const sections: PresentationSection[] = [
    { id: 0, name: 'Introduction', image: pres1 },
    { id: 1, name: 'Bridal Gowns', image: pres2 },
    { id: 2, name: "Groom's Suits", image: pres3 },
    { id: 3, name: 'Wedding Venues Overview', image: pres4 },
    // Добавьте больше разделов по мере необходимости
  ];

  const handleSectionClick = (index: number) => {
    setActiveIndex(index);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < sections.length - 1 ? prev + 1 : prev));
  };

  return (
    <div className="flex bg-[#fbf9f5] w-full" style={{ minHeight: '100vh', height: '100vh' }}>
      {/* Левая панель навигации */}
      <div className="min-w-[450px] border-r border-[#00000033] pl-8 flex flex-col">
        <div className="border-b border-[#00000033] py-2.5">
          <h1 className="text-[36px] font-branch mb-2">Presentation Name</h1>
          <p className="text-[16px] font-gilroy font-light text-[#00000080]">
            presentation sections
          </p>
        </div>

        <nav className="flex-1">
          <ul >
            {sections.map((section, index) => (
              <li key={section.id} className='py-3 border-b border-[#00000033] cursor-pointer'>
                <button
                  onClick={() => handleSectionClick(index)}
                  className={`w-full text-left flex items-center justify-between font-gilroy font-light text-[24px] transition-colors cursor-pointer ${
                    activeIndex === index
                      ? 'text-black'
                      : 'text-[#00000080] hover:text-black'
                  }`}
                >
                  <span>{section.name}</span>
                  {activeIndex === index && (
                    <span className="w-2 h-2 bg-black rounded-full mr-6"></span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Правая часть со слайдером */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 relative overflow-hidden" style={{ height: 'calc(100% - 4rem)' }}>
          <div
            className="flex h-full transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${activeIndex * 100}%)`,
            }}
          >
            {sections.map((section) => (
              <div
                key={section.id}
                className="h-full shrink-0"
                style={{ width: '100%', minWidth: '100%' }}
              >
                <img
                  src={section.image}
                  alt={section.name}
                  className="w-full h-full object-cover"
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Футер с навигацией */}
        <div className="h-16 border-t border-[#00000033] flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className={`text-[36px] font-gilroy font-light transition-opacity cursor-pointer border-r border-[#00000033] px-10 h-full ${
              activeIndex === 0
                ? 'text-[#00000033] cursor-not-allowed'
                : 'text-black hover:opacity-70'
            }`}
          >
            &lt;
          </button>

          <div className="flex gap-2">
            {sections.map((_, index) => (
              <button
                key={index}
                onClick={() => handleSectionClick(index)}
                className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${
                  activeIndex === index
                    ? 'bg-black'
                    : 'bg-[#00000033] hover:bg-[#00000080]'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={activeIndex === sections.length - 1}
            className={`text-[36px] font-gilroy font-light transition-opacity cursor-pointer px-10 border-l border-[#00000033] h-full ${
              activeIndex === sections.length - 1
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
